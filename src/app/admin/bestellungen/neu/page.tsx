import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { NeuOrderForm } from "./neu-form";

export const dynamic = "force-dynamic";

export default async function NeueBestellungPage() {
  const customers = await prisma.customer.findMany({
    where: { active: true },
    orderBy: { customerNumber: "asc" },
    select: { id: true, companyName: true, customerNumber: true },
  });

  return (
    <div>
      <PageHeader
        title="Neue Bestellung"
        description="Zuerst Kunde auswählen oder neu anlegen"
        action={
          <Link href="/admin/bestellungen" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft /> Zurück
          </Link>
        }
      />
      <NeuOrderForm customers={customers} />
    </div>
  );
}
