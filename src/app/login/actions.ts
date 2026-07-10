"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, destroySessionCookie } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const kind = String(formData.get("kind") ?? "user");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  if (kind === "customer") {
    const c = await prisma.customer.findUnique({ where: { email } });
    if (!c || !c.passwordHash || !c.active || !(await bcrypt.compare(password, c.passwordHash))) {
      return { error: "Anmeldung fehlgeschlagen." };
    }
    await createSessionCookie({
      sub: c.id,
      type: "customer",
      name: c.companyName,
      email: c.email,
    });
    redirect(next && next.startsWith("/portal") ? next : "/portal");
  }

  // interner Benutzer
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: "Anmeldung fehlgeschlagen." };
  }
  await createSessionCookie({
    sub: u.id,
    type: "user",
    name: u.name,
    email: u.email,
    role: u.role,
  });
  redirect(next && next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySessionCookie();
  redirect("/login");
}
