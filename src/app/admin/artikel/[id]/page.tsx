import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { updateArticle } from "../actions";
import { ArticleForm } from "../article-form";

export const dynamic = "force-dynamic";

export default async function EditArtikelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [a, groups] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.discountGroup.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } }),
  ]);
  if (!a) notFound();

  const action = updateArticle.bind(null, id);

  return (
    <div>
      <PageHeader title="Artikel bearbeiten" description={a.partNumberFmt} />
      <ArticleForm
        action={action}
        isEdit
        groups={groups}
        initial={{
          partNumber: a.partNumber,
          partNumberFmt: a.partNumberFmt,
          titleDe: a.titleDe,
          titleEn: a.titleEn,
          listPrice: String(a.listPrice),
          discountGroupCode: a.discountGroupCode,
          weight: a.weight !== null ? String(a.weight) : "",
          length: a.length !== null ? String(a.length) : "",
          width: a.width !== null ? String(a.width) : "",
          height: a.height !== null ? String(a.height) : "",
        }}
      />
    </div>
  );
}
