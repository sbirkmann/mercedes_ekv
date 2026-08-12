import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export type PdfResultRow = { partNumber: string; quantity: number };

/**
 * Teilenummer als eigene Zeile, z. B. "A 170 427 01 20" oder
 * "A 167 885 07 11 64 9999". Buchstabe + mindestens 8 Ziffern (mit Leerzeichen).
 */
const PART_RE = /^([A-Z])\s*((?:\d[\d\s]{7,})\d)$/;

/** Menge + Summe am Ende eines Positionsblocks, z. B. "1 15,96" oder "4 102,08". */
const QTY_RE = /^(\d{1,4})\s+[\d.]+,\d{2}$/;

/** "A 170 427 01 20" -> "A1704270120" */
const compact = (s: string) => s.replace(/\s+/g, "").toUpperCase();

/**
 * Liest die Positionen (Teilenummer, Menge) aus einer Mercedes-
 * Bestellbestätigung ("Teileliste.pdf").
 *
 * Der extrahierte Text liefert jede Tabellenzelle als eigene Zeile:
 *   A 170 427 01 20
 *   GRIFF
 *   Listenpreis 19,95
 *   Grundrabatt (20,00%) - 3,99
 *   Nettopreis 15,96
 *   1 15,96          <- Menge + Summe
 *
 * Eine Teilenummer wird daher mit der nächsten folgenden "<Menge> <Summe>"-Zeile
 * gepaart. Der Summenblock am Ende ("Summe Listenpreise (EUR) 455,34") enthält
 * keine vorangehende Teilenummer und wird ignoriert.
 */
export async function parseTeilelistePdf(
  buf: ArrayBuffer,
): Promise<{ rows: PdfResultRow[]; skipped: number }> {
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(doc, { mergePages: true });

  const rows: PdfResultRow[] = [];
  let skipped = 0;
  let current: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const pm = PART_RE.exec(line);
    if (pm) {
      // Teilenummer ohne zugehörige Menge (z. B. Seitenumbruch) verwerfen
      if (current) skipped++;
      current = compact(pm[1] + pm[2]);
      continue;
    }

    if (!current) continue;

    const qm = QTY_RE.exec(line);
    if (!qm) continue;

    const quantity = Number(qm[1]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      skipped++;
      current = null;
      continue;
    }

    // Gleiche Teilenummer mehrfach: Mengen addieren statt Position zu doppeln.
    const prev = rows.find((r) => r.partNumber === current);
    if (prev) prev.quantity += quantity;
    else rows.push({ partNumber: current, quantity });
    current = null;
  }

  if (current) skipped++;
  return { rows, skipped };
}
