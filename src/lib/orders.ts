import "server-only";
import { prisma } from "@/lib/prisma";
import { computePrice, type PriceResult } from "@/lib/pricing";

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Teilenummer normalisieren: Großschreibung, ohne Whitespace. */
export function normalizePn(s: string): string {
  return s.toUpperCase().replace(/\s+/g, "").trim();
}

type ArticleForPricing = {
  id: string;
  partNumber: string;
  listPrice: unknown;
  discountGroup: {
    code: string;
    percent: unknown;
    minMargin: unknown;
    individual: boolean;
  } | null;
};

/** Preis + Status für eine Position eines Kunden berechnen. */
export function priceWith(
  article: ArticleForPricing | null,
  customerDiscount: { discount: unknown; individual: boolean } | null,
): PriceResult {
  if (!article) {
    return { status: "needs_inquiry", priceCustomerStandard: null, ek: null };
  }
  const g = article.discountGroup;
  return computePrice({
    listPrice: num(article.listPrice),
    groupPercent: num(g?.percent),
    minMargin: num(g?.minMargin),
    groupIndividual: g?.individual ?? false,
    customerDiscount: num(customerDiscount?.discount),
    customerDiscountIndividual: customerDiscount?.individual ?? false,
  });
}

/**
 * Artikel per (normalisierter) Teilenummer laden – trifft sowohl rohe als auch
 * formatierte Nummern in beliebiger Schreibweise/Leerzeichen. Nutzt die
 * normalisierten Ausdrucks-Indizes.
 */
async function findArticleIdsByNorm(norms: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(norms.filter((n) => n.length > 0)));
  if (uniq.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ id: string; pnn: string; pfn: string }[]>`
    SELECT id,
      upper(regexp_replace("partNumber", '\\s', '', 'g'))    AS pnn,
      upper(regexp_replace("partNumberFmt", '\\s', '', 'g')) AS pfn
    FROM "Article"
    WHERE upper(regexp_replace("partNumber", '\\s', '', 'g'))    = ANY(${uniq})
       OR upper(regexp_replace("partNumberFmt", '\\s', '', 'g')) = ANY(${uniq})
  `;

  // norm -> articleId (partNumber-Treffer haben Vorrang vor Fmt)
  const map = new Map<string, string>();
  for (const r of rows) if (!map.has(r.pnn)) map.set(r.pnn, r.id);
  for (const r of rows) if (!map.has(r.pfn)) map.set(r.pfn, r.id);
  return map;
}

/** Einzelne Position: Artikel per Teilenummer suchen und bepreisen. */
export async function priceForPartNumber(customerId: string, partNumber: string) {
  const idMap = await findArticleIdsByNorm([normalizePn(partNumber)]);
  const articleId = idMap.get(normalizePn(partNumber)) ?? null;

  const article = articleId
    ? await prisma.article.findUnique({ where: { id: articleId }, include: { discountGroup: true } })
    : null;

  const cd = article?.discountGroup
    ? await prisma.customerDiscount.findUnique({
        where: {
          customerId_discountGroupCode: {
            customerId,
            discountGroupCode: article.discountGroup.code,
          },
        },
      })
    : null;
  return { article, result: priceWith(article, cd) };
}

/**
 * Mehrere Teilenummern (CSV) effizient bepreisen: Artikel & Kundenrabatte
 * werden gebündelt geladen. Matching ist normalisiert (leerzeichen-/formatunabhängig).
 */
export async function priceForPartNumbers(customerId: string, partNumbers: string[]) {
  const norms = partNumbers.map(normalizePn);
  const idMap = await findArticleIdsByNorm(norms);

  const ids = Array.from(new Set(Array.from(idMap.values())));
  const articles = ids.length
    ? await prisma.article.findMany({ where: { id: { in: ids } }, include: { discountGroup: true } })
    : [];
  const byId = new Map(articles.map((a) => [a.id, a]));

  const discounts = await prisma.customerDiscount.findMany({ where: { customerId } });
  const cdByGroup = new Map(discounts.map((d) => [d.discountGroupCode, d]));

  return (pn: string) => {
    const id = idMap.get(normalizePn(pn));
    const article = id ? byId.get(id) ?? null : null;
    const cd = article?.discountGroup ? cdByGroup.get(article.discountGroup.code) ?? null : null;
    return { article, result: priceWith(article, cd) };
  };
}
