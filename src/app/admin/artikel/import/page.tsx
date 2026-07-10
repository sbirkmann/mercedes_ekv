import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ImportClient } from "./import-client";

export default async function ArtikelImportPage() {
  await requireUser();
  return (
    <div>
      <PageHeader
        title="Artikel-Import"
        description="Preisdatei (.xlsx) chunked hochladen und batchweise verarbeiten"
        action={
          <Link href="/admin/artikel" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft /> Zurück
          </Link>
        }
      />
      <ImportClient />
    </div>
  );
}
