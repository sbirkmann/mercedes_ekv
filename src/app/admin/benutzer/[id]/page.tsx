import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { updateUser } from "../actions";
import { UserForm } from "../user-form";

export const dynamic = "force-dynamic";

export default async function EditBenutzerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <div>
      <PageHeader title="Benutzer bearbeiten" description={user.email} />
      <UserForm
        action={action}
        isEdit
        initial={{
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        }}
      />
    </div>
  );
}
