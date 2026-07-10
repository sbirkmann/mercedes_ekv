"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { priceForPartNumber, priceForPartNumbers } from "@/lib/orders";
import { parsePositionsCsv } from "@/lib/csv";
import { STATUS_ORDER, type ItemStatus } from "@/lib/pricing";

export type FormState = { error?: string; ok?: boolean; info?: string } | undefined;

const VALID_STATUS = new Set<string>(STATUS_ORDER);

// ---------- Bestellung anlegen -------------------------------------------

export async function createOrderForCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return { error: "Bitte einen Kunden auswählen." };
  const exists = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!exists) return { error: "Kunde nicht gefunden." };

  const order = await prisma.order.create({
    data: { customerId, createdBy: session.name },
  });
  revalidatePath("/admin/bestellungen");
  redirect(`/admin/bestellungen/${order.id}`);
}

const newCustomerSchema = z.object({
  customerNumber: z.string().trim().min(1, "Kundennummer erforderlich"),
  companyName: z.string().trim().min(1, "Firma erforderlich"),
  country: z.string().trim().min(1).max(3),
});

export async function createCustomerAndOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const p = newCustomerSchema.safeParse({
    customerNumber: formData.get("customerNumber"),
    companyName: formData.get("companyName"),
    country: (formData.get("country") as string)?.toUpperCase() || "DE",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  let order;
  try {
    const customer = await prisma.customer.create({ data: p.data });
    order = await prisma.order.create({
      data: { customerId: customer.id, createdBy: session.name },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002")
      return { error: "Kundennummer bereits vergeben." };
    return { error: "Anlegen fehlgeschlagen." };
  }
  revalidatePath("/admin/bestellungen");
  redirect(`/admin/bestellungen/${order.id}`);
}

// ---------- Positionen ----------------------------------------------------

async function nextPosition(orderId: string): Promise<number> {
  const max = await prisma.orderItem.aggregate({
    where: { orderId },
    _max: { position: true },
  });
  return (max._max.position ?? 0) + 1;
}

async function customerIdOf(orderId: string): Promise<string> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
  if (!o) throw new Error("Bestellung nicht gefunden");
  return o.customerId;
}

export async function addPositionManual(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const quantity = Math.round(Number(String(formData.get("quantity") ?? "1").replace(",", ".")));
  if (!partNumber) return { error: "Teilenummer erforderlich." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Ungültige Anzahl." };

  const customerId = await customerIdOf(orderId);
  const { article, result } = await priceForPartNumber(customerId, partNumber);

  // Nur einfügen, wenn die Teilenummer (oder formatierte Nr.) im Katalog existiert
  if (!article) {
    return { error: `Teilenummer „${partNumber}" nicht im Katalog gefunden.` };
  }

  await prisma.orderItem.create({
    data: {
      orderId,
      position: await nextPosition(orderId),
      quantity,
      partNumber: article.partNumber,
      articleId: article.id,
      priceCustomerStandard: result.priceCustomerStandard,
      status: result.status,
    },
  });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true };
}

export async function importPositionsCsv(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine CSV-Datei wählen." };
  if (file.size > 20 * 1024 * 1024) return { error: "CSV zu groß (max. 20 MB)." };

  const text = await file.text();
  const { rows } = parsePositionsCsv(text);
  if (rows.length === 0) return { error: "Keine gültigen Zeilen (Teilenummer, Anzahl) gefunden." };

  const customerId = await customerIdOf(orderId);
  const priceOf = await priceForPartNumbers(customerId, rows.map((r) => r.partNumber));
  let pos = await nextPosition(orderId);

  // Nur Zeilen mit existierender Teilenummer (oder formatierter Nr.) übernehmen
  const data = rows
    .map((r) => ({ r, ...priceOf(r.partNumber) }))
    .filter((x) => x.article !== null)
    .map((x) => ({
      orderId,
      position: pos++,
      quantity: x.r.quantity,
      partNumber: x.article!.partNumber,
      articleId: x.article!.id,
      priceCustomerStandard: x.result.priceCustomerStandard,
      status: x.result.status,
    }));

  const notFound = rows.length - data.length;
  if (data.length === 0) {
    return { error: `Keine der ${rows.length} Teilenummern wurde im Katalog gefunden.` };
  }

  await prisma.orderItem.createMany({ data });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return {
    ok: true,
    info:
      `${data.length} Position${data.length === 1 ? "" : "en"} hinzugefügt` +
      (notFound > 0 ? `, ${notFound} nicht im Katalog gefunden (übersprungen).` : "."),
  };
}

const priceOrNull = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export async function updatePosition(itemId: string, formData: FormData): Promise<void> {
  await requireUser();
  const quantity = Math.round(Number(String(formData.get("quantity") ?? "1").replace(",", ".")));
  const statusRaw = String(formData.get("status") ?? "open");
  const status = (VALID_STATUS.has(statusRaw) ? statusRaw : "open") as ItemStatus;

  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      partNumberReplacement: String(formData.get("partNumberReplacement") ?? "").trim() || null,
      priceRequested: priceOrNull(formData.get("priceRequested")),
      priceBilling: priceOrNull(formData.get("priceBilling")),
      status,
    },
    select: { orderId: true },
  });
  revalidatePath(`/admin/bestellungen/${item.orderId}`);
}

/** Kundenpreis-Standard & Status aus aktuellem Artikel/Kundenrabatt neu berechnen. */
export async function recalcPosition(formData: FormData): Promise<void> {
  await requireUser();
  const itemId = String(formData.get("id"));
  const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const customerId = await customerIdOf(item.orderId);
  const { article, result } = await priceForPartNumber(customerId, item.partNumber);
  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      articleId: article?.id ?? null,
      priceCustomerStandard: result.priceCustomerStandard,
      // Status nur setzen, wenn noch nicht weiter fortgeschritten
      status:
        item.status === "open" || item.status === "needs_inquiry" ? result.status : item.status,
    },
  });
  revalidatePath(`/admin/bestellungen/${item.orderId}`);
}

export async function deletePosition(formData: FormData): Promise<void> {
  await requireUser();
  const item = await prisma.orderItem.delete({
    where: { id: String(formData.get("id")) },
    select: { orderId: true },
  });
  revalidatePath(`/admin/bestellungen/${item.orderId}`);
}

export async function deleteOrder(formData: FormData): Promise<void> {
  await requireUser();
  await prisma.order.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/bestellungen");
  redirect("/admin/bestellungen");
}
