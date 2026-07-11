import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const INV_STATUS: Record<string, { label: string; variant: "secondary" | "default" | "success" }> = {
  open: { label: "Offen", variant: "secondary" },
  sent: { label: "Versendet", variant: "default" },
  paid: { label: "Bezahlt", variant: "success" },
};

export default async function RechnungenPage() {
  await requireUser();
  const invoices = await prisma.invoice.findMany({
    orderBy: { number: "desc" },
    include: {
      order: { include: { customer: { select: { companyName: true, customerNumber: true } } } },
      items: { select: { quantity: true, unitPrice: true } },
    },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Rechnungen" description="Übersicht aller Rechnungen" />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Bestellung</TableHead>
              <TableHead className="text-right">Betrag (brutto)</TableHead>
              <TableHead>easybill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Noch keine Rechnungen.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => {
              const total = inv.items.reduce((s, li) => s + Number(li.unitPrice) * li.quantity, 0);
              const gross = Math.round(total * 1.19 * 100) / 100;
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">RE-{String(inv.number).padStart(5, "0")}</TableCell>
                  <TableCell className="font-medium">
                    {inv.order.customer.companyName}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {inv.order.customer.customerNumber}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admin/bestellungen/${inv.orderId}`} className="text-primary hover:underline">
                      B-{String(inv.order.orderNumber).padStart(5, "0")}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(gross)}</TableCell>
                  <TableCell>
                    {inv.easybillId ? (
                      <Badge variant="success">angelegt</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={INV_STATUS[inv.status].variant}>{INV_STATUS[inv.status].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/admin/rechnungen/${inv.id}/pdf`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        <FileText className="size-4" />
                      </a>
                      <Link href={`/admin/rechnungen/${inv.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        <Eye className="size-4" />
                      </Link>
                    </div>
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
