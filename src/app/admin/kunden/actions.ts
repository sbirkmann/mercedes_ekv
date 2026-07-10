"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  customerNumber: z.string().trim().min(1, "Kundennummer erforderlich"),
  companyName: z.string().trim().min(1, "Firma erforderlich"),
  contactName: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail").optional().or(z.literal("")),
  street: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().min(1).max(3),
  active: z.boolean(),
  password: z.string(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    customerNumber: formData.get("customerNumber"),
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || "",
    street: formData.get("street") || undefined,
    zip: formData.get("zip") || undefined,
    city: formData.get("city") || undefined,
    country: (formData.get("country") as string)?.toUpperCase() || "DE",
    active: formData.get("active") === "on",
    password: String(formData.get("password") ?? ""),
  });
}

function buildData(d: z.infer<typeof schema>) {
  const { password, email, ...rest } = d;
  return {
    ...rest,
    email: email ? email : null,
  };
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  const { password, email } = p.data;
  if (password && !email) return { error: "Für Login-Passwort ist eine E-Mail nötig." };
  if (password && password.length < 6) return { error: "Passwort muss mind. 6 Zeichen haben." };

  try {
    await prisma.customer.create({
      data: {
        ...buildData(p.data),
        passwordHash: password ? await bcrypt.hash(password, 10) : null,
      },
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/kunden");
  redirect("/admin/kunden");
}

export async function updateCustomer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  const { password, email } = p.data;
  if (password && !email) return { error: "Für Login-Passwort ist eine E-Mail nötig." };
  if (password && password.length < 6) return { error: "Passwort muss mind. 6 Zeichen haben." };

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        ...buildData(p.data),
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/admin/kunden");
  redirect("/admin/kunden");
}

export async function deleteCustomer(formData: FormData) {
  await requireUser();
  try {
    await prisma.customer.delete({ where: { id: String(formData.get("id")) } });
  } catch {
    // Kunde hat noch Bestellungen (onDelete: Restrict) o.ä. – nicht löschbar
  }
  revalidatePath("/admin/kunden");
}

function dbError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002")
    return "Kundennummer oder E-Mail bereits vergeben.";
  return "Speichern fehlgeschlagen.";
}
