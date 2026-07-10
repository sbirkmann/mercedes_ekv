import { PageHeader } from "@/components/page-header";
import { createGroup } from "../actions";
import { GroupForm } from "../group-form";

export default function NeuRabattgruppePage() {
  return (
    <div>
      <PageHeader title="Rabattgruppe anlegen" />
      <GroupForm action={createGroup} />
    </div>
  );
}
