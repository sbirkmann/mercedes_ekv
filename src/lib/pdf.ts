import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfLine = {
  pos: number;
  partNumber: string;
  title: string;
  quantity: number;
  unitPrice?: number | null; // nur Rechnung
};

export type PdfDoc = {
  docType: string; // "Lieferschein" | "Rechnung"
  number: string;
  date: string;
  customer: { name: string; number: string; address?: string[] };
  meta?: string[]; // zusätzliche Kopfzeilen (z. B. Bestellnr., Art)
  lines: PdfLine[];
  withPrices?: boolean;
  vatPercent?: number; // z. B. 19 (nur bei withPrices)
};

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export async function buildDocumentPdf(doc: PdfDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const text = (s: string, x: number, yy: number, size = 10, b = false, color = rgb(0.1, 0.1, 0.1)) =>
    page.drawText(s, { x, y: yy, size, font: b ? bold : font, color });

  // Kopf
  text("EKV Portal", margin, y, 16, true);
  text(doc.docType, width - margin - 160, y, 16, true);
  y -= 24;
  text("Einkaufsverwaltung", margin, y, 9, false, rgb(0.4, 0.4, 0.4));
  text(`Nr. ${doc.number}`, width - margin - 160, y, 10, true);
  y -= 12;
  text(`Datum: ${doc.date}`, width - margin - 160, y, 10);
  y -= 30;

  // Kunde
  text("Kunde", margin, y, 9, true, rgb(0.4, 0.4, 0.4));
  y -= 14;
  text(`${doc.customer.name}  (${doc.customer.number})`, margin, y, 11, true);
  y -= 14;
  for (const l of doc.customer.address ?? []) {
    text(l, margin, y, 10);
    y -= 13;
  }
  y -= 6;
  for (const m of doc.meta ?? []) {
    text(m, margin, y, 10, false, rgb(0.3, 0.3, 0.3));
    y -= 13;
  }

  y -= 10;
  // Tabellenkopf
  const cols = doc.withPrices
    ? { pos: margin, pn: margin + 30, title: margin + 150, qty: 400, price: 450, sum: 505 }
    : { pos: margin, pn: margin + 30, title: margin + 170, qty: 470, price: 0, sum: 0 };
  page.drawRectangle({ x: margin - 4, y: y - 4, width: width - 2 * margin + 8, height: 18, color: rgb(0.94, 0.95, 0.97) });
  text("Pos", cols.pos, y, 9, true);
  text("Teilenummer", cols.pn, y, 9, true);
  text("Bezeichnung", cols.title, y, 9, true);
  text("Menge", cols.qty, y, 9, true);
  if (doc.withPrices) {
    text("Einzelpr.", cols.price, y, 9, true);
    text("Summe", cols.sum, y, 9, true);
  }
  y -= 20;

  let total = 0;
  for (const li of doc.lines) {
    if (y < margin + 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
    text(String(li.pos), cols.pos, y, 9);
    text(li.partNumber.slice(0, 22), cols.pn, y, 9);
    text(li.title.slice(0, doc.withPrices ? 38 : 46), cols.title, y, 9);
    text(String(li.quantity), cols.qty, y, 9);
    if (doc.withPrices && li.unitPrice != null) {
      const sum = li.unitPrice * li.quantity;
      total += sum;
      text(eur.format(li.unitPrice), cols.price, y, 9);
      text(eur.format(sum), cols.sum, y, 9);
    }
    y -= 15;
  }

  if (doc.withPrices) {
    const vatPct = doc.vatPercent ?? 19;
    const vat = Math.round(total * (vatPct / 100) * 100) / 100;
    const gross = Math.round((total + vat) * 100) / 100;
    y -= 8;
    page.drawLine({ start: { x: cols.price - 6, y: y + 6 }, end: { x: width - margin, y: y + 6 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    const lx = cols.price - 90;
    text("Nettobetrag", lx, y - 4, 10);
    text(eur.format(total), cols.sum, y - 4, 10);
    y -= 15;
    text(`zzgl. ${vatPct.toLocaleString("de-DE")} % USt`, lx, y - 4, 10);
    text(eur.format(vat), cols.sum, y - 4, 10);
    y -= 17;
    text("Gesamtbetrag", lx, y - 4, 11, true);
    text(eur.format(gross), cols.sum, y - 4, 11, true);
  }

  return pdf.save();
}
