"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Building2,
  Package,
  Percent,
  BadgePercent,
  LayoutDashboard,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/bestellungen", label: "Bestellungen", icon: ShoppingCart },
  { href: "/admin/benutzer", label: "Benutzerverwaltung", icon: Users },
  { href: "/admin/kunden", label: "Kundenverwaltung", icon: Building2 },
  { href: "/admin/artikel", label: "Artikelverwaltung", icon: Package },
  { href: "/admin/rabattgruppen", label: "Rabattgruppen", icon: Percent },
  { href: "/admin/kundenrabatte", label: "Kundenrabatte", icon: BadgePercent },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {items.map((it) => {
        const active = it.exact
          ? pathname === it.href
          : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
