import Link from "next/link";
import { Plus, Pencil, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteGroup } from "./actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
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

export default async function RabattgruppenPage() {
  const groups = await prisma.discountGroup.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { articles: true, customerDiscounts: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Rabattgruppen"
        description="Code, Prozent, Individuell und Mindestmarge"
        action={
          <Link href="/admin/rabattgruppen/neu" className={buttonVariants()}>
            <Plus /> Rabattgruppe anlegen
          </Link>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Bezeichnung</TableHead>
              <TableHead className="text-right">Prozent</TableHead>
              <TableHead className="text-center">Individuell</TableHead>
              <TableHead className="text-right">Mind.marge</TableHead>
              <TableHead>Verwendung</TableHead>
              <TableHead className="w-24 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Keine Rabattgruppen vorhanden.
                </TableCell>
              </TableRow>
            )}
            {groups.map((g) => (
              <TableRow key={g.code}>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">{g.code}</Badge>
                </TableCell>
                <TableCell className="font-medium">{g.name ?? "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPct(g.percent)}</TableCell>
                <TableCell className="text-center">
                  {g.individual ? (
                    <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPct(g.minMargin)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {g._count.articles} Art. · {g._count.customerDiscounts} Kd.
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/rabattgruppen/${g.code}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteGroup}>
                      <input type="hidden" name="code" value={g.code} />
                      <DeleteButton label={g.code} />
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
