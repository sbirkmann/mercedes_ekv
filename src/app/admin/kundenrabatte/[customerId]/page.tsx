import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DiscountManager, type DiscountRow } from "./discount-manager";

export const dynamic = "force-dynamic";

export default async function KundenrabatteDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const [customer, allGroups] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        discounts: {
          orderBy: { discountGroupCode: "asc" },
          include: { discountGroup: true },
        },
      },
    }),
    prisma.discountGroup.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),
  ]);
  if (!customer) notFound();

  const usedCodes = new Set(customer.discounts.map((d) => d.discountGroupCode));
  const availableGroups = allGroups.filter((g) => !usedCodes.has(g.code));

  const rows: DiscountRow[] = customer.discounts.map((d) => ({
    id: d.id,
    discountGroupCode: d.discountGroupCode,
    groupName: d.discountGroup.name,
    groupPercent: d.discountGroup.percent !== null ? String(d.discountGroup.percent) : null,
    discount: d.discount !== null ? String(d.discount) : null,
    individual: d.individual,
  }));

  return (
    <div>
      <PageHeader
        title={`Kundenrabatte – ${customer.companyName}`}
        description={`Kundennummer ${customer.customerNumber}`}
        action={
          <Link href="/admin/kundenrabatte" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft /> Zur Übersicht
          </Link>
        }
      />
      <DiscountManager
        customerId={customer.id}
        rows={rows}
        availableGroups={availableGroups}
      />
    </div>
  );
}
