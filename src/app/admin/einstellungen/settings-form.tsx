"use client";

import { useActionState } from "react";
import { saveEasybillKey, type FormState } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/page-header";

export function SettingsForm({ easybillKey }: { easybillKey: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveEasybillKey, undefined);
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">easybill</CardTitle>
        <CardDescription>
          API-Key für die easybill-Anbindung (Rechnungserstellung).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <Field label="easybill API-Key" htmlFor="easybillApiKey" hint="Wird verschlüsselt gespeichert.">
            <Input
              id="easybillApiKey"
              name="easybillApiKey"
              type="password"
              defaultValue={easybillKey}
              placeholder="••••••••"
              autoComplete="off"
            />
          </Field>
          <div className="flex items-center gap-3">
            <SubmitButton>Speichern</SubmitButton>
            {state?.ok && <span className="text-sm text-emerald-600 dark:text-emerald-400">Gespeichert ✓</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
