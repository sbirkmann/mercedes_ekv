import Link from "next/link";
import { ArrowLeft, FileText, Trash2, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatEUR } from "@/lib/utils";
import { setInvoiceStatus, deleteInvoice } from "../actions";
import { EasybillButton } from "./easybill-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const INV_STATUS: Record<string, string> = { open: "Offen", sent: "Versendet", paid: "Bezahlt" };

export default async function RechnungDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true } },
      items: { include: { orderItem: { include: { article: { select: { titleDe: true } } } } } },
    },
  });
  if (!inv) notFound();

  const no = `RE-${String(inv.number).padStart(5, "0")}`;
  const total = inv.items.reduce((s, li) => s + Number(li.unitPrice) * li.quantity, 0);
  const vat = Math.round(total * 0.19 * 100) / 100;
  const gross = Math.round((total + vat) * 100) / 100;

  return (
    <div>
      <PageHeader
        title={`Rechnung ${no}`}
        description={`${inv.order.customer.companyName} · Bestellung B-${String(inv.order.orderNumber).padStart(5, "0")}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/rechnungen" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft /> Zurück
            </Link>
            <a href={`/admin/rechnungen/${inv.id}/pdf`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              <FileText /> PDF
            </a>
            <form action={deleteInvoice}>
              <input type="hidden" name="id" value={inv.id} />
              <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10">
                <Trash2 /> Löschen
              </Button>
            </form>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 py-4">
            <form action={setInvoiceStatus.bind(null, inv.id)} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select name="status" defaultValue={inv.status} className="h-9 w-36">
                {Object.entries(INV_STATUS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
              <Button type="submit" variant="secondary" size="sm">Setzen</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="mb-1 text-xs text-muted-foreground">easybill</div>
            {inv.easybillId ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">
                  Dokument-ID: <span className="font-mono">{inv.easybillId}</span>
                </span>
                <a
                  href={`/admin/rechnungen/${inv.id}/easybill-pdf`}
                  target="_blank"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ExternalLink /> easybill-PDF
                </a>
              </div>
            ) : (
              <EasybillButton invoiceId={inv.id} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Pos</TableHead>
              <TableHead>Teilenummer</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead className="text-right">Menge</TableHead>
              <TableHead className="text-right">Einzelpreis</TableHead>
              <TableHead className="text-right">Summe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inv.items.map((li, i) => (
              <TableRow key={li.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{li.orderItem.partNumber}</TableCell>
                <TableCell>{li.orderItem.article?.titleDe ?? "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{li.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEUR(li.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEUR(Number(li.unitPrice) * li.quantity)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={5} className="text-right text-muted-foreground">Nettobetrag</TableCell>
              <TableCell className="text-right tabular-nums">{formatEUR(total)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} className="text-right text-muted-foreground">zzgl. 19 % USt</TableCell>
              <TableCell className="text-right tabular-nums">{formatEUR(vat)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} className="text-right font-semibold">Gesamtbetrag</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatEUR(gross)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
