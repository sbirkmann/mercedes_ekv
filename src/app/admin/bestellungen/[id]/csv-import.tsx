"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { importPositionsCsv, type FormState } from "../actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";

export function CsvImport({ orderId }: { orderId: string }) {
  const action = importPositionsCsv.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={formRef} className="grid gap-3">
      <Input
        type="file"
        name="file"
        accept=".csv,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
        className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
      />
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary">
          <Upload /> Liste importieren
        </SubmitButton>
        {state?.ok && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.info ?? "Importiert ✓"}
          </span>
        )}
      </div>
      <FormError message={state?.error} />
      <p className="text-xs text-muted-foreground">
        Excel (.xlsx) oder CSV – Spalte 1: <code>Teilenummer</code>, Spalte 2: <code>Anzahl</code>.
        Bei CSV Trennzeichen ; , oder Tab; Kopf-/Kommentarzeilen werden übersprungen.
      </p>
    </form>
  );
}
