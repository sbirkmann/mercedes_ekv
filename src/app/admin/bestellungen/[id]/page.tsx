import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteOrder } from "../actions";
import { AddPosition } from "./add-position";
import { CsvImport } from "./csv-import";
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
        include: { article: { select: { titleDe: true, listPrice: true, partNumberFmt: true } } },
      },
    },
  });
  if (!order) notFound();

  const rows: PositionRow[] = order.items.map((it) => ({
    id: it.id,
    position: it.position,
    quantity: it.quantity,
    partNumber: it.partNumber,
    partNumberFmt: it.article?.partNumberFmt ?? null,
    partNumberReplacement: it.partNumberReplacement,
    titleDe: it.article?.titleDe ?? null,
    listPrice: it.article ? String(it.article.listPrice) : null,
    priceCustomerStandard: it.priceCustomerStandard !== null ? String(it.priceCustomerStandard) : null,
    priceRequested: it.priceRequested !== null ? String(it.priceRequested) : null,
    priceBilling: it.priceBilling !== null ? String(it.priceBilling) : null,
    status: it.status,
  }));

  const c = order.customer;

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

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Position suchen & hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <AddPosition orderId={order.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">CSV-Import (Teilenummer, Anzahl)</CardTitle>
          </CardHeader>
          <CardContent>
            <CsvImport orderId={order.id} />
          </CardContent>
        </Card>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Positionen</h2>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>
      <PositionsManager rows={rows} />
    </div>
  );
}
