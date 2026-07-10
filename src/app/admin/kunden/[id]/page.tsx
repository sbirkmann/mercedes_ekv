import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { updateCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export const dynamic = "force-dynamic";

export default async function EditKundePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div>
      <PageHeader title="Kunde bearbeiten" description={c.customerNumber} />
      <CustomerForm
        action={action}
        isEdit
        initial={{
          customerNumber: c.customerNumber,
          companyName: c.companyName,
          contactName: c.contactName,
          email: c.email,
          street: c.street,
          zip: c.zip,
          city: c.city,
          country: c.country,
          active: c.active,
          hasLogin: !!c.passwordHash,
        }}
      />
    </div>
  );
}
