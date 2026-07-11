"use client";

import { useActionState, useState } from "react";
import { Truck } from "lucide-react";
import { createDeliveryNote, type FormState } from "@/app/admin/lieferscheine/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";

export type DeliverableItem = {
  id: string;
  partNumber: string;
  title: string;
  available: number;
};

export function CreateDeliveryNote({ orderId, items }: { orderId: string; items: DeliverableItem[] }) {
  const [open, setOpen] = useState(false);
  const deliverable = items.filter((i) => i.available > 0);
  const action = createDeliveryNote.bind(null, orderId);
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={deliverable.length === 0}>
        <Truck /> Lieferschein erstellen
      </Button>

      {open && (
        <Modal title="Lieferschein erstellen" onClose={() => setOpen(false)} className="max-w-2xl">
          {deliverable.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine lieferbaren Mengen (Wareneingang buchen).</p>
          ) : (
            <form action={formAction} className="grid gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Art:</label>
                <Select name="type" defaultValue="shipping" className="h-9 w-40">
                  <option value="shipping">Versand</option>
                  <option value="pickup">Abholung</option>
                </Select>
              </div>
              <div className="grid gap-2">
                {deliverable.map((it) => (
                  <div key={it.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">{it.partNumber}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">max {it.available}</span>
                      <Input
                        name={`qty_${it.id}`}
                        type="number"
                        min={0}
                        max={it.available}
                        defaultValue={it.available}
                        className="h-8 w-20"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <FormError message={state?.error} />
              <div>
                <SubmitButton>Lieferschein anlegen</SubmitButton>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
