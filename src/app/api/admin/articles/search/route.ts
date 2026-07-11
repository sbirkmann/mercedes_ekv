import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/utils";
import { normalizePn } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  partNumber: string;
  partNumberFmt: string;
  titleDe: string;
  listPrice: unknown;
  discountGroupCode: string | null;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  const norm = normalizePn(q); // Teilenummer normalisiert (ohne Leerzeichen, Großschreibung)
  const likeNorm = `${norm}%`;
  const likeText = `%${q}%`;

  // Normalisierte Teilenummer (Präfix) ODER Titel-Teilstring
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "partNumber", "partNumberFmt", "titleDe", "listPrice", "discountGroupCode"
    FROM "Article"
    WHERE upper(regexp_replace("partNumber", '\\s', '', 'g'))    LIKE ${likeNorm}
       OR upper(regexp_replace("partNumberFmt", '\\s', '', 'g')) LIKE ${likeNorm}
       OR "titleDe" ILIKE ${likeText}
       OR "titleEn" ILIKE ${likeText}
    ORDER BY "partNumber" ASC
    LIMIT 20
  `;

  return NextResponse.json({
    items: rows.map((a) => ({
      partNumber: a.partNumber,
      partNumberFmt: a.partNumberFmt,
      titleDe: a.titleDe,
      listPrice: formatEUR(a.listPrice),
      discountGroupCode: a.discountGroupCode,
    })),
  });
}
