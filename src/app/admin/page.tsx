import Link from "next/link";
import { Users, Building2, Package, Percent, BadgePercent, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [orders, users, customers, articles, groups, custDiscounts] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.article.count(),
    prisma.discountGroup.count(),
    prisma.customerDiscount.count(),
  ]);

  const stats = [
    { label: "Bestellungen", value: orders, href: "/admin/bestellungen", icon: ShoppingCart },
    { label: "Benutzer", value: users, href: "/admin/benutzer", icon: Users },
    { label: "Kunden", value: customers, href: "/admin/kunden", icon: Building2 },
    { label: "Artikel", value: articles, href: "/admin/artikel", icon: Package },
    { label: "Rabattgruppen", value: groups, href: "/admin/rabattgruppen", icon: Percent },
    { label: "Kundenrabatte", value: custDiscounts, href: "/admin/kundenrabatte", icon: BadgePercent },
  ];

  return (
    <div>
      <PageHeader
        title="Übersicht"
        description="Admin-/Benutzerbereich – Stammdatenverwaltung"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 p-6">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <div className="text-2xl font-semibold">{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
