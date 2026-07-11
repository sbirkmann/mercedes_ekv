"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { randomId } from "@/lib/utils";

const CHUNK_SIZE = 800 * 1024; // 800 KB

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

type Progress = {
  processed: number;
  upserted: number;
  groupsCreated: number;
  skipped: number;
};

function fmt(n: number) {
  return n.toLocaleString("de-DE");
}

export function ImportClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setUploadPct(0);
    setProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function start() {
    if (!file) return;
    setError(null);
    setProgress(null);
    setPhase("uploading");

    const uploadId = randomId();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const res = await fetch(
          `/api/admin/artikel/import/upload?uploadId=${uploadId}&chunkIndex=${i}&totalChunks=${totalChunks}`,
          { method: "POST", body: chunk },
        );
        if (!res.ok) throw new Error(`Upload fehlgeschlagen (Chunk ${i + 1}/${totalChunks})`);
        setUploadPct(Math.round(((i + 1) / totalChunks) * 100));
      }
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Upload-Fehler");
      return;
    }

    // Verarbeitung starten und SSE-Progress lesen
    setPhase("processing");
    try {
      const res = await fetch(`/api/admin/artikel/import/process?uploadId=${uploadId}`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!res.ok || !res.body) throw new Error("Verarbeitung konnte nicht gestartet werden");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE-Events (durch Leerzeile getrennt) verarbeiten
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const lines = evt.split("\n");
          const type = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);
          if (type === "progress") setProgress(data);
          else if (type === "done") {
            setProgress(data);
            setPhase("done");
          } else if (type === "error") {
            setError(data.message ?? "Importfehler");
            setPhase("error");
          }
        }
      }
      setPhase((p) => (p === "processing" ? "done" : p));
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Verarbeitungsfehler");
    }
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preisdatei (.xlsx) importieren</CardTitle>
          <CardDescription>
            Große Dateien (&gt;1 Mio. Zeilen) werden in 4-MB-Blöcken hochgeladen und
            serverseitig gestreamt & batchweise verarbeitet. Kommentarzeilen (mit
            „#“) werden übersprungen. Fehlende Rabattgruppen werden automatisch angelegt.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-4 transition-colors hover:bg-muted/50 ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <FileSpreadsheet className="size-6 text-primary" />
            <div className="min-w-0 flex-1">
              {file ? (
                <>
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Datei auswählen …</div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPhase("idle");
                setProgress(null);
                setError(null);
              }}
            />
          </label>

          {phase === "uploading" && (
            <Bar label={`Upload … ${uploadPct}%`} pct={uploadPct} />
          )}

          {phase === "processing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Verarbeitung läuft …
            </div>
          )}

          {progress && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Verarbeitet" value={fmt(progress.processed)} />
              <Stat label="Gespeichert" value={fmt(progress.upserted)} />
              <Stat label="Neue Rabattgr." value={fmt(progress.groupsCreated)} />
              <Stat label="Übersprungen" value={fmt(progress.skipped)} />
            </div>
          )}

          {phase === "done" && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Import abgeschlossen.
            </div>
          )}
          {phase === "error" && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <XCircle className="size-4" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {phase === "done" || phase === "error" ? (
              <>
                <Button variant="outline" onClick={reset}>Weitere Datei</Button>
                <Link href="/admin/artikel" className={buttonVariants()}>Zu den Artikeln</Link>
              </>
            ) : (
              <Button onClick={start} disabled={!file || busy}>
                <Upload /> {busy ? "Läuft …" : "Import starten"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="grid gap-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
