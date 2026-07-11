"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  importOrderResult,
  setBillingPrice,
  type FormState,
  type PendingIndividual,
} from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";
import { formatEUR } from "@/lib/utils";

const pct = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("de-DE")} %`;

export function ResultImport({ orderId }: { orderId: string }) {
  const action = importOrderResult.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const [pending, setPending] = useState<PendingIndividual[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      setPending(state.pending ?? []);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <form action={formAction} ref={formRef} className="grid gap-3">
        <Input
          type="file"
          name="file"
          accept=".csv,text/csv,text/plain"
          required
          className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
        />
        <div className="flex items-center gap-3">
          <SubmitButton variant="secondary">
            <Upload /> Ergebnis importieren
          </SubmitButton>
          {state?.ok && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">{state.info}</span>
          )}
        </div>
        <FormError message={state?.error} />
        <p className="text-xs text-muted-foreground">
          Spalten: <code>Teilenummer</code>, <code>Anzahl</code>, <code>Preis</code> (unser EK).
          Fall 1 (nicht individuell) wird automatisch berechnet, Status → bestellt.
        </p>
      </form>

      {pending.length > 0 && (
        <PendingModal
          items={pending}
          onDone={(id) => setPending((prev) => prev.filter((p) => p.itemId !== id))}
          onClose={() => setPending([])}
        />
      )}
    </>
  );
}

function PendingModal({
  items,
  onDone,
  onClose,
}: {
  items: PendingIndividual[];
  onDone: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">
            Individuelle Rabattgruppen – Abrechnung erfassen ({items.length})
          </h3>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="grid gap-3 p-5">
          {items.map((it) => (
            <PendingRow key={it.itemId} item={it} onDone={onDone} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PendingRow({ item, onDone }: { item: PendingIndividual; onDone: (id: string) => void }) {
  const [billing, setBilling] = useState("");
  const list = item.listPrice;

  const ekDiscEur = list - item.ek;
  const ekDiscPct = list > 0 ? (ekDiscEur / list) * 100 : 0;

  const b = Number(billing.replace(",", "."));
  const hasB = billing.trim() !== "" && Number.isFinite(b);
  const custDiscEur = hasB ? list - b : null;
  const custDiscPct = hasB && list > 0 ? ((list - b) / list) * 100 : null;

  return (
    <div className="rounded-md border p-4">
      <div className="mb-2">
        <div className="font-medium">{item.titleDe}</div>
        <div className="font-mono text-xs text-muted-foreground">{item.partNumber}</div>
      </div>
      <div className="grid gap-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Original Listenpreis</span>
          <span className="tabular-nums">{formatEUR(list)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Unser EK (Import)</span>
          <span className="tabular-nums">{formatEUR(item.ek)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Rabatt auf Listenpreis</span>
          <span className="tabular-nums">{pct(ekDiscPct)} ({formatEUR(ekDiscEur)})</span>
        </div>
        <div className="flex justify-between border-t pt-1.5">
          <span className="text-muted-foreground">Rabatt auf Kundenpreis (Abrechnung)</span>
          <span className="tabular-nums">
            {custDiscPct !== null ? `${pct(custDiscPct)} (${formatEUR(custDiscEur!)})` : "–"}
          </span>
        </div>
      </div>
      <form
        action={async (fd) => {
          await setBillingPrice(item.itemId, fd);
          onDone(item.itemId);
        }}
        className="mt-3 flex items-end gap-2"
      >
        <div className="grid gap-1.5">
          <label className="text-xs font-medium">Preis Abrechnung</label>
          <Input
            name="priceBilling"
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="h-9 w-32 text-right"
            required
          />
        </div>
        <Button type="submit" size="sm">Übernehmen</Button>
      </form>
    </div>
  );
}
