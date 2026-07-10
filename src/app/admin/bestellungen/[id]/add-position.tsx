"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Plus, Search } from "lucide-react";
import { addPositionManual, type FormState } from "../actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";

type Hit = {
  partNumber: string;
  partNumberFmt: string;
  titleDe: string;
  listPrice: string;
  discountGroupCode: string | null;
};

export function AddPosition({ orderId }: { orderId: string }) {
  const action = addPositionManual.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Suche debounced
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/articles/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setHits(data.items ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Nach erfolgreichem Hinzufügen Feld leeren
  useEffect(() => {
    if (state?.ok) {
      setQ("");
      setHits([]);
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} ref={formRef} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="relative">
          <label className="mb-1.5 block text-sm font-medium">Teilenummer / Suche</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="partNumber"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => hits.length && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Teilenummer oder Titel …"
              autoComplete="off"
              className="pl-8"
              required
            />
          </div>
          {open && hits.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-card shadow-lg">
              {hits.map((h) => (
                <li key={h.partNumber}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQ(h.partNumber);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{h.titleDe}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {h.partNumberFmt || h.partNumber}
                        {h.discountGroupCode ? ` · RG ${h.discountGroupCode}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{h.listPrice}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Anzahl</label>
          <Input name="quantity" type="number" min={1} defaultValue={1} className="w-24" required />
        </div>

        <SubmitButton>
          <Plus /> Hinzufügen
        </SubmitButton>
      </div>
      <FormError message={state?.error} />
      <p className="text-xs text-muted-foreground">
        Nur vorhandene Teilenummern (roh oder formatiert, Schreibweise/Leerzeichen egal). Unbekannte werden abgelehnt.
      </p>
    </form>
  );
}
