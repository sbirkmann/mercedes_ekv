"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

type C = { id: string; companyName: string; customerNumber: string };

export function NewCustomerDiscount({ customers }: { customers: C[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers.slice(0, 30);
    return customers
      .filter((c) => c.companyName.toLowerCase().includes(t) || c.customerNumber.toLowerCase().includes(t))
      .slice(0, 30);
  }, [q, customers]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Rabatt für neuen Kunden
      </Button>
      {open && (
        <Modal title="Kunde für Rabatte wählen" onClose={() => setOpen(false)}>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Firma oder Kundennummer suchen …"
              className="pl-8"
            />
          </div>
          <ul className="max-h-80 divide-y overflow-auto rounded-md border">
            {hits.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">Kein Kunde gefunden.</li>
            )}
            {hits.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/kundenrabatte/${c.id}`)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{c.companyName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.customerNumber}</span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
