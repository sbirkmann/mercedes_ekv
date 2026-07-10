import { PageHeader } from "@/components/page-header";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default function NeuBenutzerPage() {
  return (
    <div>
      <PageHeader title="Benutzer anlegen" />
      <UserForm action={createUser} />
    </div>
  );
}
