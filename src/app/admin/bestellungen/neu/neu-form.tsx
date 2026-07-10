"use client";

import { useActionState, useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import {
  createOrderForCustomer,
  createCustomerAndOrder,
  type FormState,
} from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { Field, FormError } from "@/components/page-header";
import { cn } from "@/lib/utils";

type Mode = "existing" | "new";
const COUNTRIES = ["DE", "AT", "CH", "FR", "IT", "NL", "BE", "PL", "ES"];

export function NeuOrderForm({
  customers,
}: {
  customers: { id: string; companyName: string; customerNumber: string }[];
}) {
  const [mode, setMode] = useState<Mode>("existing");
  const [stateExisting, actionExisting] = useActionState<FormState, FormData>(
    createOrderForCustomer,
    undefined,
  );
  const [stateNew, actionNew] = useActionState<FormState, FormData>(
    createCustomerAndOrder,
    undefined,
  );

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          <Tab active={mode === "existing"} onClick={() => setMode("existing")}>
            <UserCheck className="size-4" /> Bestehender Kunde
          </Tab>
          <Tab active={mode === "new"} onClick={() => setMode("new")}>
            <UserPlus className="size-4" /> Neuer Kunde
          </Tab>
        </div>

        {mode === "existing" ? (
          <form action={actionExisting} className="grid gap-4">
            <Field label="Kunde" htmlFor="customerId">
              <Select id="customerId" name="customerId" defaultValue="" required>
                <option value="" disabled>– Kunde wählen –</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerNumber} · {c.companyName}
                  </option>
                ))}
              </Select>
            </Field>
            <FormError message={stateExisting?.error} />
            <div>
              <SubmitButton>Bestellung anlegen</SubmitButton>
            </div>
          </form>
        ) : (
          <form action={actionNew} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kundennummer" htmlFor="customerNumber">
                <Input id="customerNumber" name="customerNumber" required />
              </Field>
              <Field label="Firma" htmlFor="companyName">
                <Input id="companyName" name="companyName" required />
              </Field>
              <Field label="Land" htmlFor="country">
                <Select id="country" name="country" defaultValue="DE">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Weitere Kundendaten (Adresse, Login) später unter Kundenverwaltung.
            </p>
            <FormError message={stateNew?.error} />
            <div>
              <SubmitButton>Kunde + Bestellung anlegen</SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
