import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Zufällige ID – nutzt crypto.randomUUID nur, wenn verfügbar
 * (Secure Context/HTTPS), sonst Fallback (funktioniert auch über HTTP).
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Prisma Decimal -> number|null (für Anzeige/Serialisierung) */
export function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return Number(v);
}

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(v: unknown): string {
  const n = toNum(v);
  return n === null ? "–" : eur.format(n);
}

export function formatPct(v: unknown): string {
  const n = toNum(v);
  return n === null ? "–" : `${n.toLocaleString("de-DE")} %`;
}
