"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/page-header";

export type GroupValues = {
  code: string;
  name: string | null;
  percent: string;
  individual: boolean;
  minMargin: string;
};

export function GroupForm({
  action,
  initial,
  isEdit,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: GroupValues;
  isEdit?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="code" hint="Genau 3 Zeichen">
              <Input
                id="code"
                name="code"
                maxLength={3}
                defaultValue={initial?.code}
                readOnly={isEdit}
                className={isEdit ? "bg-muted font-mono uppercase" : "font-mono uppercase"}
                required={!isEdit}
              />
            </Field>
            <Field label="Bezeichnung" htmlFor="name">
              <Input id="name" name="name" defaultValue={initial?.name ?? ""} />
            </Field>
            <Field label="Prozent (%)" htmlFor="percent" hint="Kann leer bleiben">
              <Input id="percent" name="percent" type="text" inputMode="decimal" defaultValue={initial?.percent} placeholder="—" />
            </Field>
            <Field label="Mindestmarge (%)" htmlFor="minMargin">
              <Input id="minMargin" name="minMargin" type="text" inputMode="decimal" defaultValue={initial?.minMargin} placeholder="—" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="individual" defaultChecked={initial?.individual ?? false} />
            Individuell (J/N)
          </label>

          <FormError message={state?.error} />

          <div className="flex gap-2 pt-2">
            <SubmitButton>{isEdit ? "Speichern" : "Anlegen"}</SubmitButton>
            <Link href="/admin/rabattgruppen" className={buttonVariants({ variant: "outline" })}>
              Abbrechen
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
