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

export type CustomerValues = {
  customerNumber: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string;
  active: boolean;
  hasLogin: boolean;
};

const COUNTRIES = ["DE", "AT", "CH", "FR", "IT", "NL", "BE", "PL", "ES"];

export function CustomerForm({
  action,
  initial,
  isEdit,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: CustomerValues;
  isEdit?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kundennummer" htmlFor="customerNumber">
              <Input id="customerNumber" name="customerNumber" defaultValue={initial?.customerNumber} required />
            </Field>
            <Field label="Firma" htmlFor="companyName">
              <Input id="companyName" name="companyName" defaultValue={initial?.companyName} required />
            </Field>
            <Field label="Ansprechpartner" htmlFor="contactName">
              <Input id="contactName" name="contactName" defaultValue={initial?.contactName ?? ""} />
            </Field>
            <Field label="E-Mail" htmlFor="email" hint="Für Login erforderlich">
              <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
            </Field>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Adresse</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Straße" htmlFor="street">
                <Input id="street" name="street" defaultValue={initial?.street ?? ""} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="PLZ" htmlFor="zip">
                  <Input id="zip" name="zip" defaultValue={initial?.zip ?? ""} />
                </Field>
                <div className="col-span-2">
                  <Field label="Ort" htmlFor="city">
                    <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
                  </Field>
                </div>
              </div>
              <Field label="Land" htmlFor="country">
                <Select id="country" name="country" defaultValue={initial?.country ?? "DE"}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Logindaten (optional)</p>
            <Field
              label="Passwort"
              htmlFor="password"
              hint={
                isEdit
                  ? initial?.hasLogin
                    ? "Login aktiv – leer lassen = unverändert"
                    : "Setzen, um Kunden-Login zu aktivieren"
                  : "Setzen, um Kunden-Login zu aktivieren (mind. 6 Zeichen)"
              }
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
            <Link href="/admin/kunden" className={buttonVariants({ variant: "outline" })}>
              Abbrechen
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
