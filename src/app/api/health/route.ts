export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health-Check für Coolify/Load-Balancer – immer 200, ohne DB-Zugriff. */
export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}
