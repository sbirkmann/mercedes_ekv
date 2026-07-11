import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildDocumentPdf, type PdfLine } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "user") return new Response("Nicht autorisiert", { status: 401 });

  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true } },
      items: { include: { orderItem: { include: { article: { select: { titleDe: true } } } } } },
    },
  });
  if (!inv) return new Response("Nicht gefunden", { status: 404 });

  const c = inv.order.customer;
  const lines: PdfLine[] = inv.items.map((li, i) => ({
    pos: i + 1,
    partNumber: li.orderItem.partNumber,
    title: li.orderItem.article?.titleDe ?? "",
    quantity: li.quantity,
    unitPrice: Number(li.unitPrice),
  }));

  const bytes = await buildDocumentPdf({
    docType: "Rechnung",
    number: `RE-${String(inv.number).padStart(5, "0")}`,
    date: inv.createdAt.toLocaleDateString("de-DE"),
    customer: {
      name: c.companyName,
      number: c.customerNumber,
      address: [c.street, [c.zip, c.city].filter(Boolean).join(" "), c.country].filter(Boolean) as string[],
    },
    meta: [
      `Bestellung: B-${String(inv.order.orderNumber).padStart(5, "0")}`,
      inv.order.mercedesOrderNumber ? `Mercedes-Bestellnr.: ${inv.order.mercedesOrderNumber}` : "",
    ].filter(Boolean),
    lines,
    withPrices: true,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung_RE-${String(inv.number).padStart(5, "0")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
