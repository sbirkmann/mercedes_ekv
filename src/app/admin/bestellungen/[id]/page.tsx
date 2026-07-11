import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { deleteOrder, setAllStatus, setMercedesNumber } from "../actions";
import { STATUS_LABEL, STATUS_ORDER, deliverableLabel } from "@/lib/pricing";
import { availableToDeliver, openReceipt } from "@/lib/delivery";
import { AddPosition } from "./add-position";
import { OrderActionsBar } from "./order-actions-bar";
import { OrderStatusControls } from "./order-status-controls";
import { CreateDeliveryNote } from "./create-delivery-note";
import { PositionsManager, type PositionRow } from "./positions-manager";

export const dynamic = "force-dynamic";

function orderNo(n: number) {
  return `B-${String(n).padStart(5, "0")}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { position: "asc" },
        include: {
          article: {
            select: {
              titleDe: true,
              listPrice: true,
              partNumberFmt: true,
              discountGroupCode: true,
              discountGroup: { select: { percent: true } },
            },
          },
        },
      },
      deliveryNotes: {
        orderBy: { number: "desc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });
  if (!order) notFound();

  const deliverableItems = order.items
    .map((it) => ({
      id: it.id,
      partNumber: it.article?.partNumberFmt || it.partNumber,
      title: it.article?.titleDe ?? it.partNumber,
      available: availableToDeliver(it),
    }))
    .filter((d) => d.available > 0);

  const receiptItems = order.items.map((it) => ({
    id: it.id,
    partNumber: it.article?.partNumberFmt || it.partNumber,
    title: it.article?.titleDe ?? it.partNumber,
    open: openReceipt(it),
  }));

  const rows: PositionRow[] = order.items.map((it) => {
    const list = it.article ? Number(it.article.listPrice) : null;
    const pct = it.article?.discountGroup?.percent != null ? Number(it.article.discountGroup.percent) : 0;
    const ek = list !== null ? Math.round(list * (1 - pct / 100) * 100) / 100 : null;
    return {
    id: it.id,
    position: it.position,
    quantity: it.quantity,
    partNumber: it.partNumber,
    partNumberFmt: it.article?.partNumberFmt ?? null,
    partNumberReplacement: it.partNumberReplacement,
    titleDe: it.article?.titleDe ?? null,
    discountGroupCode: it.article?.discountGroupCode ?? null,
    listPrice: list !== null ? String(list) : null,
    ekPrice: ek !== null ? String(ek) : null,
    priceCustomerStandard: it.priceCustomerStandard !== null ? String(it.priceCustomerStandard) : null,
    priceRequested: it.priceRequested !== null ? String(it.priceRequested) : null,
    priceBilling: it.priceBilling !== null ? String(it.priceBilling) : null,
    qtyReceived: it.qtyReceived,
    qtyDelivered: it.qtyDelivered,
    qtyBilled: it.qtyBilled,
    status: it.status,
    };
  });

  const c = order.customer;
  const deliverable = deliverableLabel(
    order.items.map((it) => ({
      quantity: it.quantity,
      qtyReceived: it.qtyReceived,
      qtyDelivered: it.qtyDelivered,
    })),
  );

  return (
    <div>
      <PageHeader
        title={`Bestellung ${orderNo(order.orderNumber)}`}
        description={`${c.companyName} · ${c.customerNumber}${c.city ? ` · ${c.city} (${c.country})` : ""}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/bestellungen" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft /> Zurück
            </Link>
            <form action={deleteOrder}>
              <input type="hidden" name="id" value={order.id} />
              <Button
                type="submit"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 /> Bestellung löschen
              </Button>
            </form>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="grid gap-3 py-4">
            <OrderStatusControls
              orderId={order.id}
              status={order.status}
              deliveryStatus={order.deliveryStatus}
            />
            <form action={setMercedesNumber.bind(null, order.id)} className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-muted-foreground">Mercedes Bestellnr.:</span>
              <Input
                name="mercedesOrderNumber"
                defaultValue={order.mercedesOrderNumber ?? ""}
                placeholder="—"
                className="h-9 w-48"
              />
              <Button type="submit" variant="secondary" size="sm">Speichern</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Position suchen & hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <AddPosition orderId={order.id} />
          </CardContent>
        </Card>
      </div>

      {order.deliveryNotes.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lieferscheine ({order.deliveryNotes.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {order.deliveryNotes.map((n) => (
              <Link
                key={n.id}
                href={`/admin/lieferscheine/${n.id}`}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <span className="font-mono text-xs">LS-{String(n.number).padStart(5, "0")}</span>
                <Badge variant="secondary">{n.type === "pickup" ? "Abholung" : "Versand"}</Badge>
                <span className="text-muted-foreground">{n._count.items} Pos.</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Positionen</h2>
          <Badge variant="secondary">{rows.length}</Badge>
          {deliverable && (
            <Badge variant={deliverable.startsWith("Vollständig") ? "success" : "warning"}>
              {deliverable}
            </Badge>
          )}
        </div>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Batch: Status aller Positionen setzen */}
            <form action={setAllStatus.bind(null, order.id)} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Alle auf:</span>
              <Select name="status" defaultValue="" required className="h-9 w-48">
                <option value="" disabled>– Status wählen –</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </Select>
              <Button type="submit" variant="secondary" size="sm">Anwenden</Button>
            </form>
            <CreateDeliveryNote orderId={order.id} items={deliverableItems} />
            <OrderActionsBar orderId={order.id} receiptItems={receiptItems} />
          </div>
        )}
      </div>
      <PositionsManager rows={rows} />
    </div>
  );
}
