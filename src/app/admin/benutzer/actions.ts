"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail"),
  role: z.enum(["ADMIN", "USER"]),
  active: z.boolean(),
  password: z.string(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    active: formData.get("active") === "on",
    password: String(formData.get("password") ?? ""),
  });
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  const { password, ...data } = p.data;
  if (password.length < 6) return { error: "Passwort muss mind. 6 Zeichen haben." };

  try {
    await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 10) },
    });
  } catch (e) {
    return { error: dbError(e, "E-Mail bereits vergeben.") };
  }
  revalidatePath("/admin/benutzer");
  redirect("/admin/benutzer");
}

export async function updateUser(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const p = parse(formData);
  if (!p.success) return { error: p.error.issues[0].message };
  const { password, ...data } = p.data;
  if (password && password.length < 6) return { error: "Passwort muss mind. 6 Zeichen haben." };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
  } catch (e) {
    return { error: dbError(e, "E-Mail bereits vergeben.") };
  }
  revalidatePath("/admin/benutzer");
  redirect("/admin/benutzer");
}

export async function deleteUser(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("id"));
  if (id === session.sub) return; // sich selbst nicht löschen
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/benutzer");
}

function dbError(e: unknown, unique: string): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") return unique;
  return "Speichern fehlgeschlagen.";
}
