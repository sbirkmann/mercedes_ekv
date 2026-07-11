"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { priceForPartNumber, priceForPartNumbers, normalizePn } from "@/lib/orders";
import { parsePositionsCsv, parseResultCsv } from "@/lib/csv";
import { computePrice, STATUS_ORDER, type ItemStatus } from "@/lib/pricing";

export type PendingIndividual = {
  itemId: string;
  partNumber: string;
  titleDe: string;
  listPrice: number;
  ek: number;
};

export type FormState =
  | { error?: string; ok?: boolean; info?: string; pending?: PendingIndividual[] }
  | undefined;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const ORDER_STATUS = new Set(["open", "ordered"]);
const DELIVERY_STATUS = new Set(["open", "partially_delivered", "fully_delivered"]);

/**
 * Bestellstatus automatisch nachführen: sobald ALLE Positionen "bestellt"
 * (oder weiter) sind, Bestellung auf "bestellt" setzen; sonst "offen".
 */
async function syncOrderStatus(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { status: true },
  });
  const allOrdered =
    items.length > 0 && items.every((i) => i.status === "ordered" || i.status === "delivered");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: allOrdered ? "ordered" : "open" },
  });
}

/** Bestellstatus manuell setzen. */
export async function setOrderStatus(orderId: string, formData: FormData): Promise<void> {
  await requireUser();
  const s = String(formData.get("status") ?? "");
  if (!ORDER_STATUS.has(s)) return;
  await prisma.order.update({ where: { id: orderId }, data: { status: s as "open" | "ordered" } });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
}

/** Lieferstatus manuell setzen. */
export async function setDeliveryStatus(orderId: string, formData: FormData): Promise<void> {
  await requireUser();
  const s = String(formData.get("deliveryStatus") ?? "");
  if (!DELIVERY_STATUS.has(s)) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus: s as "open" | "partially_delivered" | "fully_delivered" },
  });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
}

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

/** Positionen dürfen nur bei offener Bestellung hinzugefügt werden. */
async function assertOrderOpen(orderId: string): Promise<string> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true, status: true } });
  if (!o) throw new Error("Bestellung nicht gefunden");
  if (o.status !== "open") throw new Error("locked");
  return o.customerId;
}

/** Mercedes-Bestellnummer setzen. */
export async function setMercedesNumber(orderId: string, formData: FormData): Promise<void> {
  await requireUser();
  const v = String(formData.get("mercedesOrderNumber") ?? "").trim();
  await prisma.order.update({ where: { id: orderId }, data: { mercedesOrderNumber: v || null } });
  revalidatePath(`/admin/bestellungen/${orderId}`);
}

export async function addPositionManual(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const quantity = Math.round(Number(String(formData.get("quantity") ?? "1").replace(",", ".")));
  if (!partNumber) return { error: "Teilenummer erforderlich." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Ungültige Anzahl." };

  let customerId: string;
  try {
    customerId = await assertOrderOpen(orderId);
  } catch (e) {
    return { error: e instanceof Error && e.message === "locked" ? "Bestellung ist nicht offen – keine neuen Positionen." : "Fehler." };
  }
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
  await syncOrderStatus(orderId); // neue Position → Bestellung offen
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

  let customerId: string;
  try {
    customerId = await assertOrderOpen(orderId);
  } catch (e) {
    return { error: e instanceof Error && e.message === "locked" ? "Bestellung ist nicht offen – keine neuen Positionen." : "Fehler." };
  }
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
  await syncOrderStatus(orderId);
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
  const priceRequested = priceOrNull(formData.get("priceRequested"));
  let priceBilling = priceOrNull(formData.get("priceBilling"));

  // Auto-Berechnung: "Angefragt" (= neuer Listenpreis) gesetzt, "Abrechnung" leer
  // → Kundenpreis mit vorhandener Logik berechnen und in Abrechnung setzen.
  if (priceBilling === null && priceRequested !== null) {
    const it = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: { select: { customerId: true } },
        article: { include: { discountGroup: true } },
      },
    });
    if (it?.article) {
      const g = it.article.discountGroup;
      const cd = g
        ? await prisma.customerDiscount.findUnique({
            where: {
              customerId_discountGroupCode: {
                customerId: it.order.customerId,
                discountGroupCode: g.code,
              },
            },
          })
        : null;
      const r = computePrice({
        listPrice: priceRequested,
        groupPercent: g?.percent != null ? Number(g.percent) : null,
        minMargin: g?.minMargin != null ? Number(g.minMargin) : null,
        groupIndividual: g?.individual ?? false,
        customerDiscount: cd?.discount != null ? Number(cd.discount) : null,
        customerDiscountIndividual: cd?.individual ?? false,
      });
      priceBilling = r.priceCustomerStandard;
    }
  }

  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      partNumberReplacement: String(formData.get("partNumberReplacement") ?? "").trim() || null,
      priceRequested,
      priceBilling,
      status,
    },
    select: { orderId: true },
  });
  await syncOrderStatus(item.orderId);
  revalidatePath(`/admin/bestellungen/${item.orderId}`);
}

/** Kundenpreis-Standard & Status aus aktuellem Artikel/Kundenrabatt neu berechnen. */
export async function recalcPosition(itemId: string, _formData?: FormData): Promise<void> {
  await requireUser();
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

/**
 * Bestellergebnis-Import (Teilenummer, Anzahl, Preis=EK).
 * Fall 1 (Rabattgruppe nicht individuell): Listenpreis aus EK zurückrechnen →
 *   Angefragt; Kundenpreis daraus berechnen → Abrechnung; Status → bestellt.
 * Fall 2 (individuell): Status → bestellt; Position für manuelle Abrechnung
 *   (Popup) zurückgeben.
 */
export async function importOrderResult(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine CSV-Datei wählen." };
  if (file.size > 20 * 1024 * 1024) return { error: "CSV zu groß (max. 20 MB)." };

  const { rows } = parseResultCsv(await file.text());
  if (rows.length === 0) return { error: "Keine gültigen Zeilen (Teilenummer, Anzahl, Preis) gefunden." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { article: { include: { discountGroup: true } } } } },
  });
  if (!order) return { error: "Bestellung nicht gefunden." };

  const discounts = await prisma.customerDiscount.findMany({ where: { customerId: order.customerId } });
  const cdByGroup = new Map(discounts.map((d) => [d.discountGroupCode, d]));

  // Positionen der Bestellung per normalisierter Teilenummer indexieren
  const itemByNorm = new Map<string, (typeof order.items)[number]>();
  for (const it of order.items) {
    itemByNorm.set(normalizePn(it.partNumber), it);
    if (it.article) {
      itemByNorm.set(normalizePn(it.article.partNumber), it);
      if (it.article.partNumberFmt) itemByNorm.set(normalizePn(it.article.partNumberFmt), it);
    }
  }

  let processed = 0;
  let notFound = 0;
  const pending: PendingIndividual[] = [];

  for (const row of rows) {
    const it = itemByNorm.get(normalizePn(row.partNumber));
    if (!it || !it.article) {
      notFound++;
      continue;
    }
    const g = it.article.discountGroup;
    const ek = round2(row.price);

    if (g?.individual) {
      // Fall 2 – manuelle Abrechnung nötig
      await prisma.orderItem.update({ where: { id: it.id }, data: { status: "ordered" } });
      pending.push({
        itemId: it.id,
        partNumber: it.partNumber,
        titleDe: it.article.titleDe,
        listPrice: Number(it.article.listPrice),
        ek,
      });
    } else {
      // Fall 1 – automatisch
      const groupPercent = g?.percent != null ? Number(g.percent) : 0;
      const newList = groupPercent > 0 ? round2(ek / (1 - groupPercent / 100)) : ek;
      const cd = g ? cdByGroup.get(g.code) : null;
      const billing = computePrice({
        listPrice: newList,
        groupPercent,
        minMargin: g?.minMargin != null ? Number(g.minMargin) : null,
        groupIndividual: false,
        customerDiscount: cd?.discount != null ? Number(cd.discount) : null,
        customerDiscountIndividual: cd?.individual ?? false,
      }).priceCustomerStandard;

      await prisma.orderItem.update({
        where: { id: it.id },
        data: { priceRequested: newList, priceBilling: billing, status: "ordered" },
      });
      processed++;
    }
  }

  await syncOrderStatus(orderId);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return {
    ok: true,
    info:
      `${processed} automatisch verarbeitet` +
      (pending.length ? `, ${pending.length} individuell (manuell)` : "") +
      (notFound ? `, ${notFound} nicht in Bestellung gefunden` : "") + ".",
    pending,
  };
}

/**
 * Wareneingang buchen: Liste (Teilenummer, Anzahl) additiv auf qtyReceived
 * der passenden Positionen buchen.
 */
export async function bookGoodsReceipt(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const text = String(formData.get("list") ?? "");
  const { rows } = parsePositionsCsv(text);
  if (rows.length === 0) return { error: "Keine gültigen Zeilen (Teilenummer, Anzahl) gefunden." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { article: true } } },
  });
  if (!order) return { error: "Bestellung nicht gefunden." };

  const itemByNorm = new Map<string, (typeof order.items)[number]>();
  for (const it of order.items) {
    itemByNorm.set(normalizePn(it.partNumber), it);
    if (it.article) {
      itemByNorm.set(normalizePn(it.article.partNumber), it);
      if (it.article.partNumberFmt) itemByNorm.set(normalizePn(it.article.partNumberFmt), it);
    }
  }

  // Buchungen je Position summieren (falls Teilenummer mehrfach in der Liste)
  const add = new Map<string, number>();
  let notFound = 0;
  for (const row of rows) {
    const it = itemByNorm.get(normalizePn(row.partNumber));
    if (!it) {
      notFound++;
      continue;
    }
    add.set(it.id, (add.get(it.id) ?? 0) + row.quantity);
  }

  let booked = 0;
  let capped = 0;
  for (const [itemId, qty] of add) {
    const current = order.items.find((i) => i.id === itemId)!;
    // Wareneingang darf die Bestellmenge nicht überschreiten
    const target = Math.min(current.quantity, (current.qtyReceived ?? 0) + qty);
    if (target < (current.qtyReceived ?? 0) + qty) capped++;
    await prisma.orderItem.update({
      where: { id: itemId },
      data: { qtyReceived: target },
    });
    booked++;
  }

  revalidatePath(`/admin/bestellungen/${orderId}`);
  return {
    ok: true,
    info:
      `${booked} Position${booked === 1 ? "" : "en"} gebucht` +
      (capped ? `, ${capped} auf Bestellmenge begrenzt` : "") +
      (notFound ? `, ${notFound} nicht in Bestellung gefunden` : "") + ".",
  };
}

/** Wareneingang per Position buchen (qty_<itemId>), gedeckelt auf offenen Rest. */
export async function bookGoodsReceiptPositions(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { error: "Bestellung nicht gefunden." };

  let booked = 0;
  for (const it of order.items) {
    const raw = Number(String(formData.get(`qty_${it.id}`) ?? "0").replace(",", "."));
    const qty = Number.isFinite(raw) ? Math.round(raw) : 0;
    if (qty <= 0) continue;
    const open = Math.max(0, it.quantity - (it.qtyReceived ?? 0));
    const add = Math.min(qty, open);
    if (add <= 0) continue;
    await prisma.orderItem.update({
      where: { id: it.id },
      data: { qtyReceived: (it.qtyReceived ?? 0) + add },
    });
    booked++;
  }
  if (booked === 0) return { error: "Keine (offenen) Mengen gebucht." };
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true, info: `${booked} Position${booked === 1 ? "" : "en"} gebucht.` };
}

/** Abrechnungspreis einer Position setzen (Fall 2 / manuell). */
export async function setBillingPrice(itemId: string, formData: FormData): Promise<void> {
  await requireUser();
  const billing = priceOrNull(formData.get("priceBilling"));
  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { priceBilling: billing },
    select: { orderId: true },
  });
  revalidatePath(`/admin/bestellungen/${item.orderId}`);
}

/** Status ALLER Positionen einer Bestellung auf einen Wert setzen. */
export async function setAllStatus(orderId: string, formData: FormData): Promise<void> {
  await requireUser();
  const statusRaw = String(formData.get("status") ?? "");
  if (!VALID_STATUS.has(statusRaw)) return;
  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { status: statusRaw as ItemStatus },
  });
  await syncOrderStatus(orderId);
  revalidatePath(`/admin/bestellungen/${orderId}`);
}

export async function deletePosition(itemId: string, _formData?: FormData): Promise<void> {
  await requireUser();
  const item = await prisma.orderItem.delete({
    where: { id: itemId },
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
