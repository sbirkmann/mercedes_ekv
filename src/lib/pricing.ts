/**
 * Positions-Preislogik für Bestellungen.
 *
 *  EK (unser Einkauf) = Liste × (1 − Rabattgruppen-% / 100)
 *  Kundenpreis        = Liste × (1 − Kundenrabatt% / 100)
 *  Marge (= Kundenpreis − EK) muss ≥ EK × Mindestmarge% sein,
 *  sonst wird der Kundenpreis auf EK × (1 + Mindestmarge/100) angehoben.
 *
 *  Ohne hinterlegten Kundenrabatt:
 *    - Mindestmarge vorhanden → Preis = EK × (1 + Mindestmarge/100)
 *    - sonst Kundenrabatt = 30 % unseres Einkaufsrabatts
 *
 *  Rabattgruppe (oder Kundenrabatt) „individuell" → Rabatt unbekannt →
 *  Status „needs_inquiry", Preis leer.
 */

export type ItemStatus = "open" | "needs_inquiry" | "inquired" | "ordered" | "delivered";

export type PriceInput = {
  listPrice: number | null;
  groupPercent: number | null; // Einkaufsrabatt der Rabattgruppe
  minMargin: number | null; // Mindestmarge %
  groupIndividual: boolean;
  customerDiscount: number | null; // Kundenrabatt % (falls hinterlegt)
  customerDiscountIndividual: boolean;
};

export type PriceResult = {
  status: Extract<ItemStatus, "open" | "needs_inquiry">;
  priceCustomerStandard: number | null;
  ek: number | null; // unser Einkaufspreis (zur Transparenz)
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePrice(input: PriceInput): PriceResult {
  const { listPrice } = input;

  // Kein Artikel/Listenpreis → unbekannt
  if (listPrice === null || !Number.isFinite(listPrice)) {
    return { status: "needs_inquiry", priceCustomerStandard: null, ek: null };
  }

  const ekPercent = input.groupPercent ?? 0;
  const ek = round2(listPrice * (1 - ekPercent / 100));

  // Individuell → Rabatt unbekannt
  if (input.groupIndividual || input.customerDiscountIndividual) {
    return { status: "needs_inquiry", priceCustomerStandard: null, ek };
  }

  const minMargin = input.minMargin;
  const floor = minMargin !== null ? ek * (1 + minMargin / 100) : null;

  let price: number;
  if (input.customerDiscount !== null) {
    // Kundenrabatt hinterlegt
    const candidate = listPrice * (1 - input.customerDiscount / 100);
    price = floor !== null ? Math.max(candidate, floor) : candidate;
  } else if (minMargin !== null) {
    // kein Kundenrabatt, aber Mindestmarge → auf Untergrenze setzen
    price = ek * (1 + minMargin / 100);
  } else {
    // kein Kundenrabatt, keine Mindestmarge → 30 % unseres Einkaufsrabatts
    const custDisc = 0.3 * ekPercent;
    price = listPrice * (1 - custDisc / 100);
  }

  return { status: "open", priceCustomerStandard: round2(price), ek };
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: "Offen",
  needs_inquiry: "Muss angefragt werden",
  inquired: "Angefragt",
  ordered: "Bestellt",
  delivered: "Geliefert",
};

export const STATUS_ORDER: ItemStatus[] = [
  "open",
  "needs_inquiry",
  "inquired",
  "ordered",
  "delivered",
];
