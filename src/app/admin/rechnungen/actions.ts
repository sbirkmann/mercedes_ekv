"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getSetting, EASYBILL_API_KEY } from "@/lib/settings";

export type FormState = { error?: string; ok?: boolean } | undefined;

const INVOICE_STATUS = new Set(["open", "sent", "paid"]);

/** Rechnung aus einem Lieferschein erstellen (Positionen = Lieferschein-Positionen). */
export async function createInvoiceFromDeliveryNote(deliveryNoteId: string): Promise<void> {
  const session = await requireUser();
  const note = await prisma.deliveryNote.findUnique({
    where: { id: deliveryNoteId },
    include: { items: { include: { orderItem: true } } },
  });
  if (!note) return;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        orderId: note.orderId,
        createdBy: session.name,
        items: {
          create: note.items.map((li) => ({
            orderItemId: li.orderItemId,
            deliveryNoteItemId: li.id,
            quantity: li.quantity,
            // Kundenpreis (Kundenpreis Std.) übernehmen; Fallback Abrechnung
            unitPrice:
              li.orderItem.priceCustomerStandard ?? li.orderItem.priceBilling ?? 0,
          })),
        },
      },
    });
    // qtyBilled bei der Bestellung vermerken (gedeckelt auf Menge)
    for (const li of note.items) {
      const target = Math.min(
        li.orderItem.quantity,
        (li.orderItem.qtyBilled ?? 0) + li.quantity,
      );
      await tx.orderItem.update({ where: { id: li.orderItemId }, data: { qtyBilled: target } });
    }
    return created;
  });

  revalidatePath(`/admin/bestellungen/${note.orderId}`);
  revalidatePath("/admin/rechnungen");
  redirect(`/admin/rechnungen/${invoice.id}`);
}

export async function setInvoiceStatus(id: string, formData: FormData): Promise<void> {
  await requireUser();
  const s = String(formData.get("status") ?? "");
  if (!INVOICE_STATUS.has(s)) return;
  await prisma.invoice.update({ where: { id }, data: { status: s as "open" | "sent" | "paid" } });
  revalidatePath(`/admin/rechnungen/${id}`);
  revalidatePath("/admin/rechnungen");
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id"));
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!inv) return;
  await prisma.$transaction(async (tx) => {
    for (const li of inv.items) {
      const it = await tx.orderItem.findUnique({ where: { id: li.orderItemId }, select: { qtyBilled: true } });
      await tx.orderItem.update({
        where: { id: li.orderItemId },
        data: { qtyBilled: Math.max(0, (it?.qtyBilled ?? 0) - li.quantity) },
      });
    }
    await tx.invoice.delete({ where: { id } });
  });
  revalidatePath(`/admin/bestellungen/${inv.orderId}`);
  revalidatePath("/admin/rechnungen");
  redirect("/admin/rechnungen");
}

/**
 * easybill-Rechnung anlegen: erstellt ein Dokument über die easybill-REST-API
 * und speichert die zurückgegebene Dokument-ID.
 */
export async function createEasybillInvoice(invoiceId: string): Promise<FormState> {
  await requireUser();
  const apiKey = await getSetting(EASYBILL_API_KEY);
  if (!apiKey) return { error: "Kein easybill API-Key hinterlegt (Einstellungen)." };

  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: { include: { customer: true } },
      items: { include: { orderItem: { include: { article: { select: { titleDe: true } } } } } },
    },
  });
  if (!inv) return { error: "Rechnung nicht gefunden." };
  if (inv.easybillId) return { error: "easybill-Rechnung existiert bereits." };

  const payload = {
    type: "INVOICE",
    external_id: `RE-${String(inv.number).padStart(5, "0")}`,
    items: inv.items.map((li) => ({
      description: `${li.orderItem.partNumber} ${li.orderItem.article?.titleDe ?? ""}`.trim(),
      quantity: li.quantity,
      single_price_net: Math.round(Number(li.unitPrice) * 100), // easybill: Cent
      vat_percent: 19,
    })),
  };

  try {
    const res = await fetch("https://api.easybill.de/rest/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      return { error: `easybill-Fehler (${res.status}): ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: number | string };
    if (!data.id) return { error: "easybill: keine Dokument-ID erhalten." };
    await prisma.invoice.update({ where: { id: invoiceId }, data: { easybillId: String(data.id) } });
  } catch (e) {
    return { error: `easybill nicht erreichbar: ${e instanceof Error ? e.message : "Fehler"}` };
  }

  revalidatePath(`/admin/rechnungen/${invoiceId}`);
  return { ok: true };
}
