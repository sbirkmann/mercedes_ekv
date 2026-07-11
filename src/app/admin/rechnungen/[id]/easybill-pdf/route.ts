import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSetting, EASYBILL_API_KEY } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Holt das PDF der easybill-Rechnung und gibt es aus. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "user") return new Response("Nicht autorisiert", { status: 401 });

  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id }, select: { easybillId: true, number: true } });
  if (!inv?.easybillId) return new Response("Keine easybill-Rechnung", { status: 404 });

  const apiKey = await getSetting(EASYBILL_API_KEY);
  if (!apiKey) return new Response("Kein easybill API-Key", { status: 400 });

  const res = await fetch(`https://api.easybill.de/rest/v1/documents/${inv.easybillId}/pdf`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/pdf" },
  });
  if (!res.ok) return new Response(`easybill-Fehler (${res.status})`, { status: 502 });

  const buf = Buffer.from(await res.arrayBuffer());
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="easybill_RE-${String(inv.number).padStart(5, "0")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
