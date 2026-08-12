import "server-only";
import ExcelJS from "exceljs";
import type { CsvPosition } from "@/lib/csv";

/** Zellwert (auch Formel-/Rich-Text-Zellen) als Text. */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: { text?: string }[] };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text ?? "").join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return String(o.result);
    return "";
  }
  return String(v);
}

/**
 * Liest eine Kunden-Bestellliste (xlsx) mit Spalte 1 = Teilenummer,
 * Spalte 2 = Anzahl. Kopf-/Kommentar-/Leerzeilen werden übersprungen –
 * gleiches Verhalten wie {@link parsePositionsCsv}.
 */
export async function parsePositionsXlsx(
  buf: ArrayBuffer,
): Promise<{ rows: CsvPosition[]; skipped: number }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets[0];
  const rows: CsvPosition[] = [];
  let skipped = 0;
  if (!ws) return { rows, skipped };

  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = row.values as unknown[]; // 1-indexiert
    const partNumber = cellText(vals[1]).trim();
    const quantity = Math.round(Number(cellText(vals[2]).replace(",", ".").trim()));

    // Kopfzeile, Kommentar oder ungültige Menge überspringen
    if (!partNumber || partNumber.startsWith("#") || !Number.isFinite(quantity) || quantity <= 0) {
      skipped++;
      return;
    }
    rows.push({ partNumber, quantity });
  });

  return { rows, skipped };
}
