import "server-only";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

// Spaltenpositionen (1-indexiert) gemäß "## COLUMN DESCRIPTION" der Datei
const COL = {
  partNumber: 1, // PARTNUMBER
  partNumberFmt: 2, // PARTNUMBER_PRINT
  titleDe: 3, // DESIGNATION1
  titleEn: 4, // DESIGNATION2
  listPrice: 6, // LIST_PRICE
  discountGroup: 8, // DISCOUNT_GROUP
  weight: 14, // WEIGHT (g)
  length: 15, // LENGTH (mm)
  width: 16, // WIDTH (mm)
  height: 17, // HEIGHT (mm)
} as const;

const BATCH_SIZE = 1000;

export type ImportProgress = {
  processed: number; // gelesene Datenzeilen
  upserted: number; // eingefügt/aktualisiert
  groupsCreated: number; // neu angelegte Rabattgruppen
  skipped: number; // übersprungene Zeilen (leer/ungültig)
};

type Row = {
  id: string;
  partNumber: string;
  partNumberFmt: string;
  titleDe: string;
  titleEn: string;
  listPrice: number;
  discountGroupCode: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
};

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("text" in o) return String(o.text);
    if ("result" in o) return String(o.result);
    if ("richText" in o && Array.isArray(o.richText))
      return (o.richText as { text: string }[]).map((r) => r.text).join("");
    return "";
  }
  return String(v);
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = cellText(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(cellText(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function upsertGroups(codes: string[], known: Set<string>): Promise<number> {
  const fresh = codes.filter((c) => !known.has(c));
  if (fresh.length === 0) return 0;
  const values = fresh.map((_, i) => `($${i + 1}, now())`).join(",");
  const sql = `INSERT INTO "DiscountGroup" ("code","updatedAt") VALUES ${values} ON CONFLICT ("code") DO NOTHING`;
  const created = await prisma.$executeRawUnsafe(sql, ...fresh);
  fresh.forEach((c) => known.add(c));
  return created;
}

async function upsertArticles(rows: Row[]): Promise<number> {
  if (rows.length === 0) return 0;
  const cols = 11; // Anzahl Parameter pro Zeile
  const params: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const b = i * cols;
    params.push(
      r.id,
      r.partNumber,
      r.partNumberFmt,
      r.titleDe,
      r.titleEn,
      r.listPrice,
      r.discountGroupCode,
      r.weight,
      r.length,
      r.width,
      r.height,
    );
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11}, now())`;
  });

  const sql = `
    INSERT INTO "Article"
      ("id","partNumber","partNumberFmt","titleDe","titleEn","listPrice","discountGroupCode","weight","length","width","height","updatedAt")
    VALUES ${tuples.join(",")}
    ON CONFLICT ("partNumber") DO UPDATE SET
      "partNumberFmt"     = EXCLUDED."partNumberFmt",
      "titleDe"           = EXCLUDED."titleDe",
      "titleEn"           = EXCLUDED."titleEn",
      "listPrice"         = EXCLUDED."listPrice",
      "discountGroupCode" = EXCLUDED."discountGroupCode",
      "weight"            = EXCLUDED."weight",
      "length"            = EXCLUDED."length",
      "width"             = EXCLUDED."width",
      "height"            = EXCLUDED."height",
      "updatedAt"         = now()
  `;
  await prisma.$executeRawUnsafe(sql, ...params);
  return rows.length;
}

/**
 * Streamt die xlsx-Datei, überspringt Kommentar-/Leerzeilen, mappt die Spalten
 * und schreibt Artikel batchweise per UPSERT. Fehlende Rabattgruppen werden
 * automatisch angelegt. `onProgress` wird periodisch aufgerufen.
 */
export async function runImport(
  filePath: string,
  onProgress: (p: ImportProgress) => void | Promise<void>,
  opts: { progressEvery?: number } = {},
): Promise<ImportProgress> {
  const progressEvery = opts.progressEvery ?? 5000;
  const prog: ImportProgress = { processed: 0, upserted: 0, groupsCreated: 0, skipped: 0 };
  const knownGroups = new Set<string>();

  const wb = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: "emit",
    sharedStrings: "cache",
    styles: "ignore",
    hyperlinks: "ignore",
  });

  let batch: Row[] = [];
  let lastEmit = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const codes = Array.from(
      new Set(batch.map((r) => r.discountGroupCode).filter((c): c is string => !!c)),
    );
    prog.groupsCreated += await upsertGroups(codes, knownGroups);
    prog.upserted += await upsertArticles(batch);
    batch = [];
  };

  for await (const ws of wb) {
    for await (const row of ws) {
      const vals = row.values as unknown[]; // 1-indexiert
      const partNumber = cellText(vals[COL.partNumber]).trim();

      // Kommentarzeilen (beginnen mit '#') und Leerzeilen überspringen
      if (!partNumber || partNumber.startsWith("#")) {
        prog.skipped++;
        continue;
      }

      prog.processed++;

      let dg = cellText(vals[COL.discountGroup]).trim();
      if (dg.length > 10) dg = dg.slice(0, 10);

      const partNumberFmt = cellText(vals[COL.partNumberFmt]).trim() || partNumber;

      batch.push({
        id: randomUUID(),
        partNumber,
        partNumberFmt,
        titleDe: cellText(vals[COL.titleDe]).trim(),
        titleEn: cellText(vals[COL.titleEn]).trim(),
        listPrice: toNumber(vals[COL.listPrice]),
        discountGroupCode: dg ? dg : null,
        weight: toInt(vals[COL.weight]),
        length: toInt(vals[COL.length]),
        width: toInt(vals[COL.width]),
        height: toInt(vals[COL.height]),
      });

      if (batch.length >= BATCH_SIZE) await flush();

      if (prog.processed - lastEmit >= progressEvery) {
        lastEmit = prog.processed;
        await onProgress({ ...prog });
      }
    }
    break; // nur erstes Worksheet
  }

  await flush();
  await onProgress({ ...prog });
  return prog;
}
