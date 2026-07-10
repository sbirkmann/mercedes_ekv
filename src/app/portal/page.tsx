import { Package, BadgePercent, FileText, Construction } from "lucide-react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getSession();
  const customer = session
    ? await prisma.customer.findUnique({
        where: { id: session.sub },
        include: {
          discounts: { include: { discountGroup: true }, orderBy: { discountGroupCode: "asc" } },
        },
      })
    : null;

  return (
    <div>
      <PageHeader
        title={`Willkommen, ${customer?.companyName ?? "Kunde"}`}
        description="Ihr persönlicher Kundenbereich"
      />

      <Card className="mb-6 border-dashed">
        <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
          <Construction className="size-5 shrink-0" />
          <p className="text-sm">
            Dieser Kundenbereich ist aktuell ein <strong>Dummy</strong>. Funktionen wie
            Bestellungen, Angebote und Downloads folgen.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Package, title: "Artikel & Preise", desc: "Katalog mit Ihren Konditionen" },
          { icon: FileText, title: "Bestellungen", desc: "Verlauf und Status" },
          { icon: BadgePercent, title: "Ihre Rabatte", desc: "Konditionsübersicht" },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.title} className="opacity-70">
              <CardHeader>
                <Icon className="size-5 text-primary" />
                <CardTitle className="text-base">{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {customer && customer.discounts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Ihre hinterlegten Rabatte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {customer.discounts.map((d) => (
              <Badge key={d.id} variant="secondary">
                {d.discountGroupCode}
                {d.discountGroup.name ? ` · ${d.discountGroup.name}` : ""}: {formatPct(d.discount)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
