import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  deliverableLabel,
  ORDER_STATUS_LABEL,
  DELIVERY_STATUS_LABEL,
} from "@/lib/pricing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function orderNo(n: number) {
  return `B-${String(n).padStart(5, "0")}`;
}

export default async function BestellungenPage() {
  const orders = await prisma.order.findMany({
    orderBy: { orderNumber: "desc" },
    include: {
      customer: { select: { companyName: true, customerNumber: true } },
      items: { select: { status: true, quantity: true, qtyReceived: true, qtyDelivered: true } },
    },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Bestellungen"
        description="Übersicht aller Bestellungen"
        action={
          <Link href="/admin/bestellungen/neu" className={buttonVariants()}>
            <Plus /> Neue Bestellung
          </Link>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead className="text-right">Positionen</TableHead>
              <TableHead>Bestellstatus</TableHead>
              <TableHead>Lieferstatus</TableHead>
              <TableHead>Auslieferbar</TableHead>
              <TableHead className="w-20 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Noch keine Bestellungen.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => {
              const deliverable = deliverableLabel(o.items);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{orderNo(o.orderNumber)}</TableCell>
                  <TableCell className="font-medium">
                    {o.customer.companyName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {o.customer.customerNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.items.length}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "ordered" ? "default" : "secondary"}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.deliveryStatus === "fully_delivered"
                          ? "success"
                          : o.deliveryStatus === "partially_delivered"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {DELIVERY_STATUS_LABEL[o.deliveryStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {deliverable ? (
                      <Badge variant={deliverable.startsWith("Vollständig") ? "success" : "warning"}>
                        {deliverable}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/bestellungen/${o.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Eye className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
