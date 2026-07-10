"use client";

import { useActionState, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { FormError } from "@/components/page-header";
import { cn } from "@/lib/utils";

type Kind = "user" | "customer";

export function LoginForm({ next }: { next?: string }) {
  const [kind, setKind] = useState<Kind>("user");
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">EKV Portal – Anmeldung</CardTitle>
        <CardDescription>
          {kind === "user"
            ? "Anmeldung für interne Benutzer (Admin-/Benutzerbereich)."
            : "Anmeldung für Kunden (Kundenbereich)."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          <TabButton active={kind === "user"} onClick={() => setKind("user")}>
            <ShieldCheck className="size-4" /> Benutzer
          </TabButton>
          <TabButton active={kind === "customer"} onClick={() => setKind("customer")}>
            <Building2 className="size-4" /> Kunde
          </TabButton>
        </div>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">Passwort</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          <FormError message={state?.error} />

          <SubmitButton className="w-full">Anmelden</SubmitButton>
        </form>

        <div className="mt-5 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Testzugänge</p>
          <p>Benutzer: admin@ekv.local / admin123</p>
          <p>Kunde: kunde@mueller-auto.de / kunde123</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
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
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
