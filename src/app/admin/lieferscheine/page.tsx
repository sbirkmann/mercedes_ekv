import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DN_STATUS: Record<string, { label: string; variant: "secondary" | "default" | "success" }> = {
  open: { label: "Offen", variant: "secondary" },
  shipped: { label: "Versendet", variant: "default" },
  picked_up: { label: "Abgeholt", variant: "success" },
};

export default async function LieferscheinePage() {
  await requireUser();
  const notes = await prisma.deliveryNote.findMany({
    orderBy: { number: "desc" },
    include: {
      order: { include: { customer: { select: { companyName: true, customerNumber: true } } } },
      _count: { select: { items: true } },
    },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Lieferscheine" description="Übersicht aller Lieferscheine" />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Bestellung</TableHead>
              <TableHead>Art</TableHead>
              <TableHead className="text-right">Positionen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Noch keine Lieferscheine.
                </TableCell>
              </TableRow>
            )}
            {notes.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-xs">LS-{String(n.number).padStart(5, "0")}</TableCell>
                <TableCell className="font-medium">
                  {n.order.customer.companyName}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {n.order.customer.customerNumber}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/bestellungen/${n.orderId}`} className="text-primary hover:underline">
                    B-{String(n.order.orderNumber).padStart(5, "0")}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{n.type === "pickup" ? "Abholung" : "Versand"}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{n._count.items}</TableCell>
                <TableCell>
                  <Badge variant={DN_STATUS[n.status].variant}>{DN_STATUS[n.status].label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/admin/lieferscheine/${n.id}/pdf`}
                      target="_blank"
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <FileText className="size-4" />
                    </a>
                    <Link href={`/admin/lieferscheine/${n.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      <Eye className="size-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
