"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import {
  updatePosition,
  recalcPosition,
  deletePosition,
} from "../actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER, type ItemStatus } from "@/lib/pricing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PositionRow = {
  id: string;
  position: number;
  quantity: number;
  partNumber: string;
  partNumberFmt: string | null;
  partNumberReplacement: string | null;
  titleDe: string | null;
  listPrice: string | null;
  priceCustomerStandard: string | null;
  priceRequested: string | null;
  priceBilling: string | null;
  status: ItemStatus;
};

export function PositionsManager({ rows }: { rows: PositionRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Noch keine Positionen. Oben per Suche oder CSV hinzufügen.
      </Card>
    );
  }

  return (
    <Card>
      {/* Update-/Delete-/Recalc-Formulare außerhalb der Tabelle (form-Attribut) */}
      <div className="hidden">
        {rows.map((r) => (
          <div key={r.id}>
            <form id={`upd-${r.id}`} action={updatePosition.bind(null, r.id)} />
            <form id={`rec-${r.id}`} action={recalcPosition}>
              <input type="hidden" name="id" value={r.id} />
            </form>
            <form id={`del-${r.id}`} action={deletePosition}>
              <input type="hidden" name="id" value={r.id} />
            </form>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-20">Anzahl</TableHead>
            <TableHead>Teilenummer</TableHead>
            <TableHead className="w-36">Ersatz-Teilenr.</TableHead>
            <TableHead>Titel</TableHead>
            <TableHead className="text-right">Preis Liste</TableHead>
            <TableHead className="text-right">Kundenpreis Std.</TableHead>
            <TableHead className="w-28 text-right">Angefragt</TableHead>
            <TableHead className="w-28 text-right">Abrechnung</TableHead>
            <TableHead className="w-48">Status</TableHead>
            <TableHead className="w-28 text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{r.position}</TableCell>
              <TableCell>
                <Input
                  name="quantity"
                  form={`upd-${r.id}`}
                  type="number"
                  min={1}
                  defaultValue={r.quantity}
                  className="h-8 w-16"
                />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {r.partNumberFmt || r.partNumber}
              </TableCell>
              <TableCell>
                <Input
                  name="partNumberReplacement"
                  form={`upd-${r.id}`}
                  defaultValue={r.partNumberReplacement ?? ""}
                  placeholder="—"
                  className="h-8"
                />
              </TableCell>
              <TableCell className="max-w-48 truncate" title={r.titleDe ?? ""}>
                {r.titleDe ?? <span className="text-muted-foreground">nicht im Katalog</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {r.listPrice !== null ? formatEUR(r.listPrice) : "–"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {r.priceCustomerStandard !== null ? (
                  formatEUR(r.priceCustomerStandard)
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">anfragen</span>
                )}
              </TableCell>
              <TableCell>
                <Input
                  name="priceRequested"
                  form={`upd-${r.id}`}
                  defaultValue={r.priceRequested ?? ""}
                  inputMode="decimal"
                  placeholder="—"
                  className="h-8 w-24 text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  name="priceBilling"
                  form={`upd-${r.id}`}
                  defaultValue={r.priceBilling ?? ""}
                  inputMode="decimal"
                  placeholder="—"
                  className="h-8 w-24 text-right"
                />
              </TableCell>
              <TableCell>
                <Select name="status" form={`upd-${r.id}`} defaultValue={r.status} className="h-8">
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button type="submit" form={`upd-${r.id}`} size="sm" variant="outline">
                    Speichern
                  </Button>
                  <Button
                    type="submit"
                    form={`rec-${r.id}`}
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="Kundenpreis neu berechnen"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button
                    type="submit"
                    form={`del-${r.id}`}
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:bg-destructive/10"
                    title="Position löschen"
                    onClick={(e) => {
                      if (!confirm("Position wirklich löschen?")) e.preventDefault();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
