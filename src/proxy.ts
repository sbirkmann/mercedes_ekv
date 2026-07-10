import { NextResponse, type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  // Admin-/Benutzerbereich: nur interne Benutzer
  if (pathname.startsWith("/admin")) {
    if (!session || session.type !== "user") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Kundenbereich: nur Kunden
  if (pathname.startsWith("/portal")) {
    if (!session || session.type !== "customer") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Bereits eingeloggt -> weg von /login
  if (pathname === "/login" && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.type === "user" ? "/admin" : "/portal";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/login"],
};
