"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  customerId: z.string().min(1),
  discountGroupCode: z.string().trim().toUpperCase().length(3, "Rabattgruppe wählen"),
  discount: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0 && v <= 100), "Rabatt 0–100 %"),
  individual: z.boolean(),
});

export async function addCustomerDiscount(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = schema.safeParse({
    customerId: formData.get("customerId"),
    discountGroupCode: formData.get("discountGroupCode"),
    discount: (formData.get("discount") as string) ?? "",
    individual: formData.get("individual") === "on",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  try {
    await prisma.customerDiscount.create({
      data: {
        customerId: p.data.customerId,
        discountGroupCode: p.data.discountGroupCode,
        discount: p.data.discount,
        individual: p.data.individual,
      },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002")
      return { error: "Diese Rabattgruppe ist dem Kunden bereits zugeordnet." };
    return { error: "Speichern fehlgeschlagen." };
  }
  revalidatePath(`/admin/kundenrabatte/${p.data.customerId}`);
  revalidatePath("/admin/kundenrabatte");
  return { ok: true };
}

export async function updateCustomerDiscount(id: string, formData: FormData): Promise<void> {
  await requireUser();
  const discountRaw = String(formData.get("discount") ?? "").replace(",", ".");
  const parsed = discountRaw ? Number(discountRaw) : null;
  const discount =
    parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100) ? null : parsed;

  const cd = await prisma.customerDiscount.update({
    where: { id },
    data: { discount, individual: formData.get("individual") === "on" },
  });
  revalidatePath(`/admin/kundenrabatte/${cd.customerId}`);
  revalidatePath("/admin/kundenrabatte");
}

export async function deleteCustomerDiscount(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const cd = await prisma.customerDiscount.delete({ where: { id } });
  revalidatePath(`/admin/kundenrabatte/${cd.customerId}`);
  revalidatePath("/admin/kundenrabatte");
}
