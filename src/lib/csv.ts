export type CsvPosition = { partNumber: string; quantity: number };

function splitLine(line: string, delim: string): string[] {
  // einfache Quote-Behandlung
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function detectDelim(sample: string): string {
  const candidates = [";", "\t", ","];
  let best = ";";
  let bestCount = -1;
  for (const d of candidates) {
    const count = sample.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * Parst CSV mit Spalten (Teilenummer, Anzahl). Erkennt Trennzeichen,
 * überspringt leere Zeilen, Kommentare (#) und eine mögliche Kopfzeile.
 */
export function parsePositionsCsv(text: string): { rows: CsvPosition[]; skipped: number } {
  const clean = text.replace(/^﻿/, ""); // BOM
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const delim = detectDelim(lines[0]);
  const rows: CsvPosition[] = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("#")) {
      skipped++;
      continue;
    }
    const cols = splitLine(line, delim).map((c) => c.trim());
    const partNumber = (cols[0] ?? "").replace(/^"|"$/g, "").trim();
    const qtyRaw = (cols[1] ?? "").replace(",", ".");
    const quantity = Math.round(Number(qtyRaw));

    // Kopfzeile / ungültige Menge überspringen
    if (!partNumber || !Number.isFinite(quantity) || quantity <= 0) {
      skipped++;
      continue;
    }
    rows.push({ partNumber, quantity });
  }

  return { rows, skipped };
}
