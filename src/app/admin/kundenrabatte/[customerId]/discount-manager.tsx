"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addCustomerDiscount,
  updateCustomerDiscount,
  deleteCustomerDiscount,
  type FormState,
} from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/page-header";
import { formatPct } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DiscountRow = {
  id: string;
  discountGroupCode: string;
  groupName: string | null;
  groupPercent: string | null;
  discount: string | null;
  individual: boolean;
};

export function DiscountManager({
  customerId,
  rows,
  availableGroups,
}: {
  customerId: string;
  rows: DiscountRow[];
  availableGroups: { code: string; name: string | null }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addCustomerDiscount,
    undefined,
  );

  return (
    <div className="grid gap-4">
      {/* Bestehende Rabatte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zugeordnete Rabatte</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Rabatte zugeordnet.</p>
          ) : (
            <>
              {/* Update-/Delete-Formulare liegen außerhalb der Tabelle und werden
                  per HTML-form-Attribut mit den Feldern/Buttons in der Zeile verknüpft. */}
              {rows.map((r) => (
                <div key={r.id} className="hidden">
                  <form id={`upd-${r.id}`} action={updateCustomerDiscount.bind(null, r.id)} />
                  <form id={`del-${r.id}`} action={deleteCustomerDiscount}>
                    <input type="hidden" name="id" value={r.id} />
                  </form>
                </div>
              ))}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rabattgruppe</TableHead>
                    <TableHead className="text-right">Gruppen-%</TableHead>
                    <TableHead className="w-32">Kundenrabatt %</TableHead>
                    <TableHead className="text-center">Individuell</TableHead>
                    <TableHead className="w-32 text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{r.discountGroupCode}</Badge>{" "}
                        <span className="text-muted-foreground">{r.groupName}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPct(r.groupPercent)}
                      </TableCell>
                      <TableCell>
                        <Input
                          name="discount"
                          form={`upd-${r.id}`}
                          defaultValue={r.discount ?? ""}
                          inputMode="decimal"
                          className="h-8 w-24"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox name="individual" form={`upd-${r.id}`} defaultChecked={r.individual} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button type="submit" form={`upd-${r.id}`} size="sm" variant="outline">
                            Speichern
                          </Button>
                          <Button
                            type="submit"
                            form={`del-${r.id}`}
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:bg-destructive/10"
                            title={`${r.discountGroupCode} entfernen`}
                            onClick={(e) => {
                              if (!confirm(`Rabatt ${r.discountGroupCode} wirklich entfernen?`))
                                e.preventDefault();
                            }}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">{r.discountGroupCode} entfernen</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Neuen Rabatt hinzufügen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rabatt hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {availableGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Alle Rabattgruppen sind bereits zugeordnet.
            </p>
          ) : (
            <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <input type="hidden" name="customerId" value={customerId} />
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Rabattgruppe (Code)</label>
                <Select name="discountGroupCode" defaultValue="" required>
                  <option value="" disabled>– wählen –</option>
                  {availableGroups.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.code}{g.name ? ` – ${g.name}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Rabatt %</label>
                <Input name="discount" inputMode="decimal" className="w-28" placeholder="—" />
              </div>
              <label className="flex h-9 items-center gap-2 text-sm">
                <Checkbox name="individual" /> Individuell
              </label>
              <SubmitButton>
                <Plus /> Hinzufügen
              </SubmitButton>
              <div className="sm:col-span-4">
                <FormError message={state?.error} />
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
