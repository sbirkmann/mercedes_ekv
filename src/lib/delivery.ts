/** Max. lieferbare Menge einer Position: (Wareneingang ∩ Bestellmenge) − bereits geliefert. */
export function availableToDeliver(item: {
  quantity: number;
  qtyReceived: number | null;
  qtyDelivered: number | null;
}): number {
  return Math.max(0, Math.min(item.qtyReceived ?? 0, item.quantity) - (item.qtyDelivered ?? 0));
}

/** Noch offener Wareneingang einer Position: Bestellmenge − bereits eingegangen. */
export function openReceipt(item: { quantity: number; qtyReceived: number | null }): number {
  return Math.max(0, item.quantity - (item.qtyReceived ?? 0));
}
