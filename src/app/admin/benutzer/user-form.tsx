"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/page-header";

export type UserValues = {
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  active: boolean;
};

export function UserForm({
  action,
  initial,
  isEdit,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: UserValues;
  isEdit?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </Field>
          <Field label="E-Mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={initial?.email} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rolle" htmlFor="role">
              <Select id="role" name="role" defaultValue={initial?.role ?? "USER"}>
                <option value="USER">Benutzer</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
            <Field
              label="Passwort"
              htmlFor="password"
              hint={isEdit ? "Leer lassen = unverändert" : "Mind. 6 Zeichen"}
            >
              <Input id="password" name="password" type="password" autoComplete="new-password" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="active" defaultChecked={initial?.active ?? true} />
            Aktiv
          </label>

          <FormError message={state?.error} />

          <div className="flex gap-2 pt-2">
            <SubmitButton>{isEdit ? "Speichern" : "Anlegen"}</SubmitButton>
            <Link href="/admin/benutzer" className={buttonVariants({ variant: "outline" })}>
              Abbrechen
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
