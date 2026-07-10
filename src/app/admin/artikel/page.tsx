import Link from "next/link";
import { Plus, Pencil, Upload, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteArticle } from "./actions";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";
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

const PAGE_SIZE = 50;

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ArticleWhereInput = q
    ? {
        OR: [
          { partNumber: { contains: q, mode: "insensitive" } },
          { partNumberFmt: { contains: q, mode: "insensitive" } },
          { titleDe: { contains: q, mode: "insensitive" } },
          { titleEn: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { partNumber: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mkHref = (p: number) =>
    `/admin/artikel?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHeader
        title="Artikelverwaltung"
        description={`${total.toLocaleString("de-DE")} Artikel · Teilenummer, Titel (DE/EN), Preis, Rabattgruppe, Maße`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/artikel/import" className={buttonVariants({ variant: "outline" })}>
              <Upload /> Import
            </Link>
            <Link href="/admin/artikel/neu" className={buttonVariants()}>
              <Plus /> Artikel anlegen
            </Link>
          </div>
        }
      />

      <form className="mb-4 flex gap-2" action="/admin/artikel">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Teilenummer oder Titel suchen …"
            className="pl-8"
          />
        </div>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          Suchen
        </button>
        {q && (
          <Link href="/admin/artikel" className={buttonVariants({ variant: "ghost" })}>
            Zurücksetzen
          </Link>
        )}
      </form>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teilenummer</TableHead>
              <TableHead>Titel DE</TableHead>
              <TableHead>Titel EN</TableHead>
              <TableHead className="text-right">Listenpreis</TableHead>
              <TableHead>Rabattgr.</TableHead>
              <TableHead className="text-right">Gewicht</TableHead>
              <TableHead>Maße (L×B×H)</TableHead>
              <TableHead className="w-24 text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Keine Artikel vorhanden.
                </TableCell>
              </TableRow>
            )}
            {articles.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <span className="font-mono text-xs">{a.partNumberFmt}</span>
                  <span className="block text-[11px] text-muted-foreground">{a.partNumber}</span>
                </TableCell>
                <TableCell className="font-medium">{a.titleDe}</TableCell>
                <TableCell className="text-muted-foreground">{a.titleEn}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEUR(a.listPrice)}</TableCell>
                <TableCell>
                  {a.discountGroupCode ? (
                    <Badge variant="secondary" className="font-mono">{a.discountGroupCode}</Badge>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {a.weight !== null ? `${a.weight} g` : "–"}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {a.length || a.width || a.height
                    ? `${a.length ?? "–"}×${a.width ?? "–"}×${a.height ?? "–"} mm`
                    : "–"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/artikel/${a.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteArticle}>
                      <input type="hidden" name="id" value={a.id} />
                      <DeleteButton label={a.titleDe} />
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Seite {page.toLocaleString("de-DE")} von {totalPages.toLocaleString("de-DE")}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={mkHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                ← Zurück
              </Link>
            ) : (
              <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>
                ← Zurück
              </span>
            )}
            {page < totalPages ? (
              <Link href={mkHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Weiter →
              </Link>
            ) : (
              <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>
                Weiter →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
