import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { getSession } from "@/lib/session";
import { ensureDir, uploadFilePath } from "@/lib/import-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chunk-Upload. Der Client sendet die Datei in Blöcken (sequentiell).
 * Query: uploadId, chunkIndex, totalChunks
 * Body:  rohe Chunk-Bytes
 * chunkIndex 0 legt die Datei neu an, weitere Chunks werden angehängt.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.type !== "user") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const url = new URL(req.url);
  const uploadId = url.searchParams.get("uploadId") ?? "";
  const chunkIndex = Number(url.searchParams.get("chunkIndex"));
  const totalChunks = Number(url.searchParams.get("totalChunks"));

  if (!uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }

  let target: string;
  try {
    await ensureDir();
    target = uploadFilePath(uploadId);
  } catch {
    return NextResponse.json({ error: "Ungültige uploadId" }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  // Erster Chunk: neu anlegen (überschreiben), sonst anhängen.
  await fs.writeFile(target, buf, { flag: chunkIndex === 0 ? "w" : "a" });

  return NextResponse.json({
    ok: true,
    uploadId,
    chunkIndex,
    received: buf.length,
    last: totalChunks ? chunkIndex === totalChunks - 1 : undefined,
  });
}
