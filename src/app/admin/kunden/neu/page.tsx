import { PageHeader } from "@/components/page-header";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default function NeuKundePage() {
  return (
    <div>
      <PageHeader title="Kunde anlegen" />
      <CustomerForm action={createCustomer} />
    </div>
  );
}
