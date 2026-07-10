"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Löschen-Button mit Bestätigung; muss innerhalb eines <form action=...> stehen. */
export function DeleteButton({ label = "Löschen" }: { label?: string }) {
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-destructive/10"
      onClick={(e) => {
        if (!confirm(`${label}: Wirklich löschen?`)) e.preventDefault();
      }}
    >
      <Trash2 />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
