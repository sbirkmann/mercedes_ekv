import Link from "next/link";
import { Check, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { NewCustomerDiscount } from "./new-customer-discount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPct } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function KundenrabattePage() {
  const [customers, allCustomers] = await Promise.all([
    prisma.customer.findMany({
      where: { discounts: { some: {} } },
      orderBy: { customerNumber: "asc" },
      include: {
        discounts: {
          orderBy: { discountGroupCode: "asc" },
          include: { discountGroup: true },
        },
      },
    }),
    prisma.customer.findMany({
      orderBy: { customerNumber: "asc" },
      select: { id: true, companyName: true, customerNumber: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Kundenrabatte"
        description="Rabatte je Kunde – nur Kunden mit hinterlegten Rabatten"
        action={<NewCustomerDiscount customers={allCustomers} />}
      />
      {customers.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Keine Kunden mit Rabatten. Oben „Rabatt für neuen Kunden" wählen.
        </Card>
      )}
      <div className="grid gap-4">
        {customers.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                {c.companyName}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  {c.customerNumber}
                </span>
              </CardTitle>
              <Link
                href={`/admin/kundenrabatte/${c.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Settings2 /> Verwalten
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {c.discounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Rabatte zugeordnet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rabattgruppe</TableHead>
                      <TableHead className="text-right">Gruppen-%</TableHead>
                      <TableHead className="text-right">Kundenrabatt</TableHead>
                      <TableHead className="text-center">Individuell</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.discounts.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{d.discountGroupCode}</Badge>{" "}
                          <span className="text-muted-foreground">{d.discountGroup.name}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatPct(d.discountGroup.percent)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatPct(d.discount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.individual ? (
                            <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
