"use client";

import { useActionState } from "react";
import { FileUp } from "lucide-react";
import { createEasybillInvoice, type FormState } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";

export function EasybillButton({ invoiceId }: { invoiceId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    async () => createEasybillInvoice(invoiceId),
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton>
        <FileUp /> easybill Rechnung anlegen
      </SubmitButton>
      <FormError message={state?.error} />
    </form>
  );
}
