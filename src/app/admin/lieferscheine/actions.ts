"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { availableToDeliver } from "@/lib/delivery";

export type FormState = { error?: string; ok?: boolean } | undefined;

const DELIVERY_STATUS = new Set(["open", "shipped", "picked_up"]);

/** Lieferstatus der Bestellung aus Summe gelieferter Mengen ableiten. */
async function syncDeliveryStatus(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { quantity: true, qtyDelivered: true },
  });
  const anyDelivered = items.some((i) => (i.qtyDelivered ?? 0) > 0);
  const allDelivered = items.length > 0 && items.every((i) => (i.qtyDelivered ?? 0) >= i.quantity);
  const deliveryStatus = allDelivered ? "fully_delivered" : anyDelivered ? "partially_delivered" : "open";
  await prisma.order.update({ where: { id: orderId }, data: { deliveryStatus } });
}

/** Lieferschein aus einer Bestellung erstellen (Mengen pro Position via qty_<itemId>). */
export async function createDeliveryNote(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const type = String(formData.get("type") ?? "shipping");
  const deliveryType = type === "pickup" ? "pickup" : "shipping";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "Bestellung nicht gefunden." };

  const lines: { orderItemId: string; quantity: number }[] = [];
  for (const it of order.items) {
    const raw = Number(String(formData.get(`qty_${it.id}`) ?? "0").replace(",", "."));
    const qty = Number.isFinite(raw) ? Math.round(raw) : 0;
    if (qty <= 0) continue;
    const max = availableToDeliver(it);
    const q = Math.min(qty, max);
    if (q > 0) lines.push({ orderItemId: it.id, quantity: q });
  }

  if (lines.length === 0) return { error: "Keine lieferbaren Mengen ausgewählt." };

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryNote.create({
      data: {
        orderId,
        type: deliveryType,
        createdBy: session.name,
        items: { create: lines.map((l) => ({ orderItemId: l.orderItemId, quantity: l.quantity })) },
      },
    });
    // qtyDelivered fortschreiben
    for (const l of lines) {
      const it = order.items.find((i) => i.id === l.orderItemId)!;
      await tx.orderItem.update({
        where: { id: l.orderItemId },
        data: { qtyDelivered: (it.qtyDelivered ?? 0) + l.quantity },
      });
    }
    return created;
  });

  await syncDeliveryStatus(orderId);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/lieferscheine");
  redirect(`/admin/lieferscheine/${note.id}`);
}

export async function setDeliveryNoteStatus(id: string, formData: FormData): Promise<void> {
  await requireUser();
  const s = String(formData.get("status") ?? "");
  if (!DELIVERY_STATUS.has(s)) return;
  await prisma.deliveryNote.update({
    where: { id },
    data: { status: s as "open" | "shipped" | "picked_up" },
  });
  revalidatePath(`/admin/lieferscheine/${id}`);
  revalidatePath("/admin/lieferscheine");
}

export async function deleteDeliveryNote(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id"));
  const note = await prisma.deliveryNote.findUnique({ where: { id }, include: { items: true } });
  if (!note) return;

  await prisma.$transaction(async (tx) => {
    // gelieferte Mengen zurücknehmen
    for (const li of note.items) {
      const it = await tx.orderItem.findUnique({ where: { id: li.orderItemId }, select: { qtyDelivered: true } });
      await tx.orderItem.update({
        where: { id: li.orderItemId },
        data: { qtyDelivered: Math.max(0, (it?.qtyDelivered ?? 0) - li.quantity) },
      });
    }
    await tx.deliveryNote.delete({ where: { id } });
  });

  await syncDeliveryStatus(note.orderId);
  revalidatePath(`/admin/bestellungen/${note.orderId}`);
  revalidatePath("/admin/lieferscheine");
  redirect("/admin/lieferscheine");
}
