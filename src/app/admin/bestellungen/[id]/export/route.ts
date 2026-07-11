import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exportiert die Positionen einer Bestellung als CSV (Teilenummer; Anzahl). */
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

  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ["Teilenummer;Anzahl"];
  for (const it of order.items) {
    lines.push(`${esc(it.partNumber)};${it.quantity}`);
  }
  // BOM für Excel-Kompatibilität (Umlaute)
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const fileName = `Bestellung_B-${String(order.orderNumber).padStart(5, "0")}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
