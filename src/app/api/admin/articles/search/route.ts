import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  const items = await prisma.article.findMany({
    where: {
      OR: [
        { partNumber: { contains: q, mode: "insensitive" } },
        { partNumberFmt: { contains: q, mode: "insensitive" } },
        { titleDe: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { partNumber: "asc" },
    take: 20,
    select: {
      partNumber: true,
      partNumberFmt: true,
      titleDe: true,
      listPrice: true,
      discountGroupCode: true,
    },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      partNumber: a.partNumber,
      partNumberFmt: a.partNumberFmt,
      titleDe: a.titleDe,
      listPrice: formatEUR(a.listPrice),
      discountGroupCode: a.discountGroupCode,
    })),
  });
}
