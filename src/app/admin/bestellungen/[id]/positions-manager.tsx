"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { updatePosition, recalcPosition, deletePosition } from "../actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER, type ItemStatus } from "@/lib/pricing";

export type PositionRow = {
  id: string;
  position: number;
  quantity: number;
  partNumber: string;
  partNumberFmt: string | null;
  partNumberReplacement: string | null;
  titleDe: string | null;
  discountGroupCode: string | null;
  listPrice: string | null;
  ekPrice: string | null;
  priceCustomerStandard: string | null;
  priceRequested: string | null;
  priceBilling: string | null;
  qtyReceived: number | null;
  qtyDelivered: number | null;
  qtyBilled: number | null;
  status: ItemStatus;
};

// Spaltenraster (einheitlich für Kopf + Zeilen)
const COLS =
  "grid-cols-[2.5rem_4.5rem_9rem_9rem_minmax(9rem,1fr)_4.5rem_6.5rem_6.5rem_6rem_6rem_3.5rem_3.5rem_3.5rem_10.5rem_auto_auto_auto]";

export function PositionsManager({ rows }: { rows: PositionRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Noch keine Positionen. Oben per Suche oder CSV hinzufügen.
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[1180px]">
        {/* Kopfzeile */}
        <div
          className={`grid ${COLS} items-center gap-x-2 border-b bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
        >
          <div>#</div>
          <div>Anzahl</div>
          <div>Teilenummer</div>
          <div>Ersatz-Teilenr.</div>
          <div>Titel</div>
          <div>Rabattgr.</div>
          <div className="text-right">Liste / EK</div>
          <div className="text-right">Kundenpr.</div>
          <div className="text-right">Angefragt</div>
          <div className="text-right">Abrechnung</div>
          <div className="text-right" title="Anz. Wareneingang">WE</div>
          <div className="text-right" title="Anz. Lieferung">Lief.</div>
          <div className="text-right" title="Anz. Abgerechnet">Abger.</div>
          <div>Status</div>
          <div className="col-span-3 text-right">Aktion</div>
        </div>

        {/* Zeilen */}
        {rows.map((r) => {
          // Nach "bestellt"/"geliefert": Menge gesperrt und Löschen ausgeblendet
          const locked = r.status === "ordered" || r.status === "delivered";
          return (
          <div
            // Key enthält die gespeicherten Werte: ändert sich ein Serverwert
            // (z. B. nach Batch-Status, Speichern, Neuberechnung), mountet die
            // Zeile neu und zeigt den aktuellen Wert an.
            key={`${r.id}:${r.status}:${r.quantity}:${r.priceRequested ?? ""}:${r.priceBilling ?? ""}:${r.partNumberReplacement ?? ""}`}
            className={`grid ${COLS} items-center gap-x-2 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/40`}
          >
            {/* Update-Formular – alle Eingaben liegen INNERHALB des Formulars (display:contents) */}
            <form action={updatePosition.bind(null, r.id)} className="contents">
              <div className="text-muted-foreground">{r.position}</div>
              <Input
                name="quantity"
                type="number"
                min={1}
                defaultValue={r.quantity}
                readOnly={locked}
                title={locked ? "Bei Status bestellt/geliefert nicht änderbar" : undefined}
                className={`h-8 w-16 ${locked ? "cursor-not-allowed bg-muted text-muted-foreground" : ""}`}
              />
              <div className="truncate font-mono text-xs" title={r.partNumber}>
                {r.partNumberFmt || r.partNumber}
              </div>
              <Input
                name="partNumberReplacement"
                defaultValue={r.partNumberReplacement ?? ""}
                placeholder="—"
                className="h-8"
              />
              <div className="truncate" title={r.titleDe ?? ""}>
                {r.titleDe ?? <span className="text-muted-foreground">nicht im Katalog</span>}
              </div>
              <div>
                {r.discountGroupCode ? (
                  <Badge variant="secondary" className="font-mono">{r.discountGroupCode}</Badge>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </div>
              <div className="text-right tabular-nums">
                {r.listPrice !== null ? (
                  <>
                    <div className="text-muted-foreground">{formatEUR(r.listPrice)}</div>
                    <div className="text-xs text-muted-foreground/80">
                      EK {r.ekPrice !== null ? formatEUR(r.ekPrice) : "–"}
                    </div>
                  </>
                ) : (
                  "–"
                )}
              </div>
              <div className="text-right tabular-nums font-medium">
                {r.priceCustomerStandard !== null ? (
                  formatEUR(r.priceCustomerStandard)
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">anfragen</span>
                )}
              </div>
              <Input
                name="priceRequested"
                defaultValue={r.priceRequested ?? ""}
                inputMode="decimal"
                placeholder="—"
                className="h-8 w-full text-right"
              />
              <Input
                name="priceBilling"
                defaultValue={r.priceBilling ?? ""}
                inputMode="decimal"
                placeholder="—"
                className="h-8 w-full text-right"
              />
              <div className="text-right tabular-nums text-muted-foreground">
                {r.qtyReceived ?? "–"}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {r.qtyDelivered ?? "–"}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {r.qtyBilled ?? "–"}
              </div>
              <Select name="status" defaultValue={r.status} className="h-8">
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="outline" className="justify-self-end">
                Speichern
              </Button>
            </form>

            {/* Neu berechnen (eigenes Formular) */}
            <form action={recalcPosition} className="contents">
              <input type="hidden" name="id" value={r.id} />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="size-8 justify-self-center"
                title="Kundenpreis & Status neu berechnen"
              >
                <RefreshCw className="size-4" />
              </Button>
            </form>

            {/* Löschen (eigenes Formular) – bei bestellt/geliefert ausgeblendet */}
            {locked ? (
              <div />
            ) : (
              <form action={deletePosition} className="contents">
                <input type="hidden" name="id" value={r.id} />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="size-8 justify-self-center text-destructive hover:bg-destructive/10"
                  title="Position löschen"
                  onClick={(e) => {
                    if (!confirm("Position wirklich löschen?")) e.preventDefault();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </form>
            )}
          </div>
          );
        })}
      </div>
    </Card>
  );
}
