import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildDocumentPdf, type PdfLine } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "user") return new Response("Nicht autorisiert", { status: 401 });

  const { id } = await params;
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true } },
      items: {
        include: { orderItem: { include: { article: { select: { titleDe: true } } } } },
      },
    },
  });
  if (!note) return new Response("Nicht gefunden", { status: 404 });

  const c = note.order.customer;
  const lines: PdfLine[] = note.items.map((li, i) => ({
    pos: i + 1,
    partNumber: li.orderItem.partNumber,
    title: li.orderItem.article?.titleDe ?? "",
    quantity: li.quantity,
  }));

  const bytes = await buildDocumentPdf({
    docType: "Lieferschein",
    number: `LS-${String(note.number).padStart(5, "0")}`,
    date: note.createdAt.toLocaleDateString("de-DE"),
    customer: {
      name: c.companyName,
      number: c.customerNumber,
      address: [c.street, [c.zip, c.city].filter(Boolean).join(" "), c.country].filter(Boolean) as string[],
    },
    meta: [
      `Bestellung: B-${String(note.order.orderNumber).padStart(5, "0")}`,
      note.order.mercedesOrderNumber ? `Mercedes-Bestellnr.: ${note.order.mercedesOrderNumber}` : "",
      `Art: ${note.type === "pickup" ? "Abholung" : "Versand"}`,
    ].filter(Boolean),
    lines,
    withPrices: false,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Lieferschein_LS-${String(note.number).padStart(5, "0")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
