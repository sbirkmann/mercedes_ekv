import Link from "next/link";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { setDeliveryNoteStatus, deleteDeliveryNote } from "../actions";
import { createInvoiceFromDeliveryNote } from "@/app/admin/rechnungen/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const DN_STATUS: Record<string, string> = { open: "Offen", shipped: "Versendet", picked_up: "Abgeholt" };

export default async function LieferscheinDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true } },
      items: { include: { orderItem: { include: { article: { select: { titleDe: true } } } } } },
    },
  });
  if (!note) notFound();

  const no = `LS-${String(note.number).padStart(5, "0")}`;

  return (
    <div>
      <PageHeader
        title={`Lieferschein ${no}`}
        description={`${note.order.customer.companyName} · Bestellung B-${String(note.order.orderNumber).padStart(5, "0")}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/lieferscheine" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft /> Zurück
            </Link>
            <a href={`/admin/lieferscheine/${note.id}/pdf`} target="_blank" className={buttonVariants({ variant: "outline" })}>
              <FileText /> PDF
            </a>
            <form action={createInvoiceFromDeliveryNote.bind(null, note.id)}>
              <Button type="submit">
                <FileText /> Rechnung erstellen
              </Button>
            </form>
            <form action={deleteDeliveryNote}>
              <input type="hidden" name="id" value={note.id} />
              <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10">
                <Trash2 /> Löschen
              </Button>
            </form>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div>
            <div className="text-xs text-muted-foreground">Art</div>
            <Badge variant="secondary">{note.type === "pickup" ? "Abholung" : "Versand"}</Badge>
          </div>
          <form action={setDeliveryNoteStatus.bind(null, note.id)} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select name="status" defaultValue={note.status} className="h-9 w-40">
              {Object.entries(DN_STATUS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="sm">Setzen</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Pos</TableHead>
              <TableHead>Teilenummer</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead className="text-right">Menge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {note.items.map((li, i) => (
              <TableRow key={li.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{li.orderItem.partNumber}</TableCell>
                <TableCell>{li.orderItem.article?.titleDe ?? "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{li.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
