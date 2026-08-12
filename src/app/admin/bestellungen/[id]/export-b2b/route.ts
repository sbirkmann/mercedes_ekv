import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizePn } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Spalten gemäß Mercedes B2B-Connect-Upload-Vorlage (alle Zellen als Text). */
const COLUMNS = [
  { header: "Teilenummer", width: 13.35 },
  { header: "Menge", width: 7 },
  { header: "FIN (de)", width: 8.67 },
  { header: "Name (optional)", width: 16 },
  { header: "Beschreibung (optional)", width: 23.35 },
  { header: "Bemerkungen (optional)", width: 23.67 },
] as const;

const TEXT_FMT = "@";

/**
 * Exportiert die Positionen einer Bestellung im Format der Mercedes
 * B2B-Connect-Upload-Vorlage (Sheet "Teile"): Teilenummer ohne Leerzeichen,
 * Menge als Text. Optionale Spalten bleiben leer.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "user") {
    return new Response("Nicht autorisiert", { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!order) return new Response("Nicht gefunden", { status: 404 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Teile");
  ws.columns = COLUMNS.map((c) => ({ width: c.width, style: { numFmt: TEXT_FMT } }));

  const head = ws.addRow(COLUMNS.map((c) => c.header));
  head.font = { bold: true };
  head.eachCell((cell) => {
    cell.numFmt = TEXT_FMT;
  });

  for (const it of order.items) {
    // B2B Connect erwartet die Teilenummer ohne Leerzeichen, Menge als Text.
    const row = ws.addRow([normalizePn(it.partNumber), String(it.quantity), null, null, null, null]);
    row.eachCell((cell) => {
      cell.numFmt = TEXT_FMT;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const fileName = `B2BConnectUpload_B-${String(order.orderNumber).padStart(5, "0")}.xlsx`;

  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
