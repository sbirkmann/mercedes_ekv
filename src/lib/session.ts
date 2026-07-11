import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const COOKIE_NAME = "ekv_session";
const MAX_AGE = 60 * 60 * 8; // 8h

export type PrincipalType = "user" | "customer";

export interface SessionPayload {
  sub: string; // id
  type: PrincipalType;
  name: string;
  email: string | null;
  role?: "ADMIN" | "USER"; // nur bei type === "user"
  [key: string]: unknown;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET fehlt oder ist zu kurz (.env)");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Session aus dem Cookie lesen (Server Components / Actions). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

/**
 * secure-Flag fürs Cookie bestimmen:
 *  - COOKIE_SECURE=true|false erzwingt den Wert (Env-Override),
 *  - sonst automatisch anhand des Protokolls (x-forwarded-proto).
 * So funktioniert das Login auch ohne SSL (reines HTTP hinter Proxy).
 */
async function cookieSecure(): Promise<boolean> {
  const override = process.env.COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
  return proto === "https";
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: await cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
