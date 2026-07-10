"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const optionalNum = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v.replace(",", ".")) : null))
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), "Ungültige Zahl");

const baseSchema = z.object({
  name: z.string().trim().optional(),
  percent: optionalNum,
  individual: z.boolean(),
  minMargin: optionalNum,
});

const createSchema = baseSchema.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Code muss genau 3 Zeichen haben"),
});

function common(formData: FormData) {
  return {
    name: (formData.get("name") as string) || undefined,
    percent: (formData.get("percent") as string) ?? "",
    individual: formData.get("individual") === "on",
    minMargin: (formData.get("minMargin") as string) ?? "",
  };
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = createSchema.safeParse({
    code: formData.get("code"),
    ...common(formData),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await prisma.discountGroup.create({
      data: {
        code: p.data.code,
        name: p.data.name || null,
        percent: p.data.percent,
        individual: p.data.individual,
        minMargin: p.data.minMargin,
      },
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/rabattgruppen");
  redirect("/admin/rabattgruppen");
}

export async function updateGroup(code: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = baseSchema.safeParse(common(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await prisma.discountGroup.update({
      where: { code },
      data: {
        name: p.data.name || null,
        percent: p.data.percent,
        individual: p.data.individual,
        minMargin: p.data.minMargin,
      },
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/rabattgruppen");
  redirect("/admin/rabattgruppen");
}

export async function deleteGroup(formData: FormData) {
  await requireUser();
  const code = String(formData.get("code"));
  try {
    await prisma.discountGroup.delete({ where: { code } });
  } catch {
    // wird evtl. von Artikeln/Kundenrabatten referenziert
  }
  revalidatePath("/admin/rabattgruppen");
}

function dbError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002")
    return "Code bereits vergeben.";
  return "Speichern fehlgeschlagen.";
}
