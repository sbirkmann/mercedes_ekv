"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PackageCheck } from "lucide-react";
import {
  bookGoodsReceipt,
  bookGoodsReceiptPositions,
  type FormState,
} from "../actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";
import { cn } from "@/lib/utils";

export type ReceiptItem = {
  id: string;
  partNumber: string;
  title: string;
  open: number;
};

export function GoodsReceipt({ orderId, items }: { orderId: string; items: ReceiptItem[] }) {
  const [tab, setTab] = useState<"paste" | "list">("list");
  const openItems = items.filter((i) => i.open > 0);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <TabBtn active={tab === "list"} onClick={() => setTab("list")}>Offene Positionen</TabBtn>
        <TabBtn active={tab === "paste"} onClick={() => setTab("paste")}>Liste einfügen</TabBtn>
      </div>
      {tab === "list" ? <ListForm orderId={orderId} items={openItems} /> : <PasteForm orderId={orderId} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PasteForm({ orderId }: { orderId: string }) {
  const action = bookGoodsReceipt.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="grid gap-3">
      <label className="text-sm font-medium">Teilenummer &amp; Anzahl (je Zeile)</label>
      <textarea
        name="list"
        rows={8}
        required
        placeholder={"A 000 123 45 67;2\nA0009876543;5"}
        className="w-full rounded-md border bg-card px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center gap-3">
        <SubmitButton><PackageCheck /> Buchen</SubmitButton>
        {state?.ok && <span className="text-sm text-emerald-600 dark:text-emerald-400">{state.info}</span>}
      </div>
      <FormError message={state?.error} />
    </form>
  );
}

function ListForm({ orderId, items }: { orderId: string; items: ReceiptItem[] }) {
  const action = bookGoodsReceiptPositions.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine offenen Wareneingänge – alles vollständig eingegangen.</p>;
  }
  return (
    <form action={formAction} ref={ref} className="grid gap-3">
      <div className="grid gap-2">
        {items.map((it) => (
          <div key={it.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{it.title}</div>
              <div className="font-mono text-xs text-muted-foreground">{it.partNumber}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">offen {it.open}</span>
              <Input name={`qty_${it.id}`} type="number" min={0} max={it.open} defaultValue={it.open} className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton><PackageCheck /> Wareneingang buchen</SubmitButton>
        {state?.ok && <span className="text-sm text-emerald-600 dark:text-emerald-400">{state.info}</span>}
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
