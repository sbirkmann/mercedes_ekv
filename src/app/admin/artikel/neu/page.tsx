import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { createArticle } from "../actions";
import { ArticleForm } from "../article-form";

export const dynamic = "force-dynamic";

export default async function NeuArtikelPage() {
  const groups = await prisma.discountGroup.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true },
  });
  return (
    <div>
      <PageHeader title="Artikel anlegen" />
      <ArticleForm action={createArticle} groups={groups} />
    </div>
  );
}
