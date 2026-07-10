"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/page-header";

export type ArticleValues = {
  partNumber: string;
  partNumberFmt: string;
  titleDe: string;
  titleEn: string;
  listPrice: string;
  discountGroupCode: string | null;
  weight: string;
  length: string;
  width: string;
  height: string;
};

export function ArticleForm({
  action,
  initial,
  isEdit,
  groups,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: ArticleValues;
  isEdit?: boolean;
  groups: { code: string; name: string | null }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teilenummer" htmlFor="partNumber">
              <Input id="partNumber" name="partNumber" defaultValue={initial?.partNumber} required />
            </Field>
            <Field label="Teilenummer (formatiert)" htmlFor="partNumberFmt">
              <Input id="partNumberFmt" name="partNumberFmt" defaultValue={initial?.partNumberFmt} required />
            </Field>
            <Field label="Titel DE" htmlFor="titleDe">
              <Input id="titleDe" name="titleDe" defaultValue={initial?.titleDe} required />
            </Field>
            <Field label="Titel EN" htmlFor="titleEn">
              <Input id="titleEn" name="titleEn" defaultValue={initial?.titleEn} required />
            </Field>
            <Field label="Listenpreis (EUR)" htmlFor="listPrice">
              <Input
                id="listPrice"
                name="listPrice"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={initial?.listPrice}
                required
              />
            </Field>
            <Field label="Rabattgruppe" htmlFor="discountGroupCode" hint="Code der Rabattgruppe">
              <Select
                id="discountGroupCode"
                name="discountGroupCode"
                defaultValue={initial?.discountGroupCode ?? ""}
              >
                <option value="">– keine –</option>
                {groups.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.code}{g.name ? ` – ${g.name}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Maße & Gewicht</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Gewicht (g)" htmlFor="weight">
                <Input id="weight" name="weight" type="text" inputMode="numeric" defaultValue={initial?.weight} placeholder="—" />
              </Field>
              <Field label="Länge (mm)" htmlFor="length">
                <Input id="length" name="length" type="text" inputMode="numeric" defaultValue={initial?.length} placeholder="—" />
              </Field>
              <Field label="Breite (mm)" htmlFor="width">
                <Input id="width" name="width" type="text" inputMode="numeric" defaultValue={initial?.width} placeholder="—" />
              </Field>
              <Field label="Höhe (mm)" htmlFor="height">
                <Input id="height" name="height" type="text" inputMode="numeric" defaultValue={initial?.height} placeholder="—" />
              </Field>
            </div>
          </div>

          <FormError message={state?.error} />

          <div className="flex gap-2 pt-2">
            <SubmitButton>{isEdit ? "Speichern" : "Anlegen"}</SubmitButton>
            <Link href="/admin/artikel" className={buttonVariants({ variant: "outline" })}>
              Abbrechen
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
