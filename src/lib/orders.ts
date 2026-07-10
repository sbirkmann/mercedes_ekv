import "server-only";
import { prisma } from "@/lib/prisma";
import { computePrice, type PriceResult } from "@/lib/pricing";

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

type ArticleForPricing = {
  id: string;
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

/** Einzelne Position: Artikel per Teilenummer suchen und bepreisen. */
export async function priceForPartNumber(customerId: string, partNumber: string) {
  const article = await prisma.article.findFirst({
    where: { OR: [{ partNumber }, { partNumberFmt: partNumber }] },
    include: { discountGroup: true },
  });
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
 * werden gebündelt geladen.
 */
export async function priceForPartNumbers(customerId: string, partNumbers: string[]) {
  const uniq = Array.from(new Set(partNumbers));
  const articles = await prisma.article.findMany({
    where: { OR: [{ partNumber: { in: uniq } }, { partNumberFmt: { in: uniq } }] },
    include: { discountGroup: true },
  });

  // Lookup per Teilenummer (partNumber und partNumberFmt)
  const byKey = new Map<string, (typeof articles)[number]>();
  for (const a of articles) {
    byKey.set(a.partNumber, a);
    if (a.partNumberFmt) byKey.set(a.partNumberFmt, a);
  }

  const discounts = await prisma.customerDiscount.findMany({ where: { customerId } });
  const cdByGroup = new Map(discounts.map((d) => [d.discountGroupCode, d]));

  return (pn: string) => {
    const article = byKey.get(pn) ?? null;
    const cd = article?.discountGroup ? cdByGroup.get(article.discountGroup.code) ?? null : null;
    return { article, result: priceWith(article, cd) };
  };
}
