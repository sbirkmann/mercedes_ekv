import fs from "node:fs/promises";
import { getSession } from "@/lib/session";
import { uploadFilePath } from "@/lib/import-paths";
import { runImport } from "@/lib/artikel-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

/**
 * Startet die Verarbeitung der zuvor hochgeladenen Datei und streamt den
 * Fortschritt als Server-Sent-Events (text/event-stream).
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "user") {
    return new Response("Nicht autorisiert", { status: 401 });
  }

  const url = new URL(req.url);
  const uploadId = url.searchParams.get("uploadId") ?? "";

  let filePath: string;
  try {
    filePath = uploadFilePath(uploadId);
    await fs.access(filePath);
  } catch {
    return new Response("Upload nicht gefunden", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        send("start", { uploadId });
        const result = await runImport(filePath, (p) => send("progress", p));
        send("done", result);
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Importfehler" });
      } finally {
        // temporäre Datei aufräumen
        await fs.rm(filePath, { force: true }).catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
