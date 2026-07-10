"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const optInt = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Math.round(Number(v.replace(",", "."))) : null))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Ungültige Zahl");

const schema = z.object({
  partNumber: z.string().trim().min(1, "Teilenummer erforderlich"),
  partNumberFmt: z.string().trim().min(1, "Formatierte Teilenummer erforderlich"),
  titleDe: z.string().trim().min(1, "Titel DE erforderlich"),
  titleEn: z.string().trim().min(1, "Titel EN erforderlich"),
  listPrice: z.coerce.number().nonnegative("Preis ungültig"),
  discountGroupCode: z.string().trim().optional(),
  weight: optInt,
  length: optInt,
  width: optInt,
  height: optInt,
});

function parse(formData: FormData) {
  const raw = String(formData.get("listPrice") ?? "").replace(",", ".");
  return schema.safeParse({
    partNumber: formData.get("partNumber"),
    partNumberFmt: formData.get("partNumberFmt"),
    titleDe: formData.get("titleDe"),
    titleEn: formData.get("titleEn"),
    listPrice: raw,
    discountGroupCode: formData.get("discountGroupCode") || undefined,
    weight: (formData.get("weight") as string) ?? "",
    length: (formData.get("length") as string) ?? "",
    width: (formData.get("width") as string) ?? "",
    height: (formData.get("height") as string) ?? "",
  });
}

function buildData(d: z.infer<typeof schema>) {
  return {
    partNumber: d.partNumber,
    partNumberFmt: d.partNumberFmt,
    titleDe: d.titleDe,
    titleEn: d.titleEn,
    listPrice: d.listPrice,
    discountGroupCode: d.discountGroupCode ? d.discountGroupCode : null,
    weight: d.weight,
    length: d.length,
    width: d.width,
    height: d.height,
  };
}

export async function createArticle(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await prisma.article.create({ data: buildData(p.data) });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/artikel");
  redirect("/admin/artikel");
}

export async function updateArticle(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await prisma.article.update({ where: { id }, data: buildData(p.data) });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/artikel");
  redirect("/admin/artikel");
}

export async function deleteArticle(formData: FormData) {
  await requireUser();
  await prisma.article.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/artikel");
}

function dbError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002")
    return "Teilenummer bereits vergeben.";
  return "Speichern fehlgeschlagen.";
}
