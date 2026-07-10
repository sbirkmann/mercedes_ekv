import "server-only";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const DIR = path.join(os.tmpdir(), "ekv-import");

/** uploadId auf sichere Zeichen beschränken (kein Path-Traversal). */
export function safeId(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (clean.length < 8 || clean.length > 100) throw new Error("Ungültige uploadId");
  return clean;
}

export async function ensureDir(): Promise<string> {
  await fs.mkdir(DIR, { recursive: true });
  return DIR;
}

export function uploadFilePath(id: string): string {
  return path.join(DIR, `${safeId(id)}.xlsx`);
}
