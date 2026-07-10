import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { updateGroup } from "../actions";
import { GroupForm } from "../group-form";

export const dynamic = "force-dynamic";

export default async function EditRabattgruppePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const g = await prisma.discountGroup.findUnique({ where: { code } });
  if (!g) notFound();

  const action = updateGroup.bind(null, code);

  return (
    <div>
      <PageHeader title="Rabattgruppe bearbeiten" description={g.code} />
      <GroupForm
        action={action}
        isEdit
        initial={{
          code: g.code,
          name: g.name,
          percent: g.percent !== null ? String(g.percent) : "",
          individual: g.individual,
          minMargin: g.minMargin !== null ? String(g.minMargin) : "",
        }}
      />
    </div>
  );
}
