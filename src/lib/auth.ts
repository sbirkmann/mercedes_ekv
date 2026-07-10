import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/** Erzwingt eine interne Benutzer-Session (Admin-/Benutzerbereich). */
export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s || s.type !== "user") redirect("/login");
  return s;
}

/** Erzwingt eine Admin-Session. */
export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireUser();
  if (s.role !== "ADMIN") redirect("/admin?forbidden=1");
  return s;
}

/** Erzwingt eine Kunden-Session (Kundenbereich). */
export async function requireCustomer(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s || s.type !== "customer") redirect("/login");
  return s;
}
