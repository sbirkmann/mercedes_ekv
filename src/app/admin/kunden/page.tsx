import Link from "next/link";
import { Plus, Pencil, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteCustomer } from "./actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function KundenPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { customerNumber: "asc" },
    include: { _count: { select: { discounts: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Kundenverwaltung"
        description="Kunden mit Adresse, Land und optionalen Logindaten"
        action={
          <Link href="/admin/kunden/neu" className={buttonVariants()}>
            <Plus /> Kunde anlegen
          </Link>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kd-Nr.</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Ort / Land</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Rabatte</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Keine Kunden vorhanden.
                </TableCell>
              </TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.customerNumber}</TableCell>
                <TableCell className="font-medium">
                  {c.companyName}
                  {c.contactName && (
                    <span className="block text-xs text-muted-foreground">{c.contactName}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[c.zip, c.city].filter(Boolean).join(" ")}
                  <Badge variant="outline" className="ml-2">{c.country}</Badge>
                </TableCell>
                <TableCell>
                  {c.passwordHash ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                      <KeyRound className="size-3.5" /> aktiv
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/kundenrabatte/${c.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {c._count.discounts} Gruppen
                  </Link>
                </TableCell>
                <TableCell>
                  {c.active ? (
                    <Badge variant="success">aktiv</Badge>
                  ) : (
                    <Badge variant="warning">inaktiv</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/kunden/${c.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteCustomer}>
                      <input type="hidden" name="id" value={c.id} />
                      <DeleteButton label={c.companyName} />
                    </form>
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
