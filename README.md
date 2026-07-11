# EKV Portal

Next.js (App Router, SSR) Anwendung zur Einkaufs-/Stammdatenverwaltung mit
zwei Login-Typen (interne **Benutzer** und **Kunden**), PostgreSQL (Docker),
Prisma und Custom-Session-Auth.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, SSR)
- **PostgreSQL 16** via Docker Compose
- **Prisma 6** (ORM, Migrations, Seed)
- **Tailwind CSS v4** + eigenes shadcn-artiges UI-Kit
- **Auth:** signierte Session-Cookies (`jose`) + `bcryptjs`

## Voraussetzungen

- Node.js 20+
- Docker + Docker Compose

## Schnellstart

```bash
# 1. Abhängigkeiten
npm install

# 2. Postgres starten (Docker)
npm run db:up

# 3. Schema migrieren + Testdaten laden
npm run db:migrate      # legt Tabellen an (Migration "init")
npm run db:seed         # Testdaten

# 4. Dev-Server
npm run dev
```

App: http://localhost:3000

> Alternativ alles in einem Schritt: `npm run setup`

## Testzugänge

| Typ      | E-Mail                     | Passwort  | Bereich            |
| -------- | -------------------------- | --------- | ------------------ |
| Admin    | `admin@ekv.local`          | `admin123`| `/admin`           |
| Benutzer | `user@ekv.local`           | `user123` | `/admin`           |
| Kunde    | `kunde@mueller-auto.de`    | `kunde123`| `/portal` (Dummy)  |

## Bereiche & Berechtigungen

- **`/login`** – ein Login-Formular mit Umschalter **Benutzer / Kunde**.
- **`/admin`** – Admin-/Benutzerbereich (nur `type=user`), geschützt via Middleware:
  1. **Benutzerverwaltung** – interne Benutzer + Rollen (Admin/Benutzer)
  2. **Kundenverwaltung** – Kunden mit Adresse, Land, optionalen Logindaten
  3. **Artikelverwaltung** – Teilenummer, Teilenummer formatiert, Titel DE/EN,
     Listenpreis, Rabattgruppe (3-stelliger Code)
  4. **Rabattgruppen** – Code, Prozent (optional), Individuell (J/N), Mindestmarge %
  5. **Kundenrabatte** – gruppiert nach Kunde: Rabattgruppe (Auswahl), Rabatt, Individuell
- **`/portal`** – Kundenbereich (nur `type=customer`), aktuell **Dummy**.

## Nützliche Skripte

| Skript             | Zweck                                    |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Dev-Server (SSR)                         |
| `npm run build`    | Produktions-Build                        |
| `npm run db:up`    | Postgres-Container starten               |
| `npm run db:down`  | Postgres-Container stoppen               |
| `npm run db:migrate`| Prisma-Migration (dev)                  |
| `npm run db:seed`  | Testdaten laden                          |
| `npm run db:reset` | DB zurücksetzen + neu migrieren + seed   |
| `npm run db:studio`| Prisma Studio (DB-GUI)                   |

## Konfiguration

`.env` (siehe `.env.example`):

```
DATABASE_URL="postgresql://ekv:ekv@localhost:55432/ekv?schema=public"
AUTH_SECRET="<mind. 16 Zeichen, für Produktion ändern>"
```

## Deployment (Coolify / Docker)

Beim **Start** (`npm start`) laufen automatisch:
1. `prisma migrate deploy` – alle ausstehenden Migrationen,
2. `node prisma/ensure-admin.mjs` – legt einen Admin-Benutzer an, falls noch keiner
   mit der konfigurierten E-Mail existiert (idempotent),
3. `next start`.

**Benötigte Env-Variablen** (in Coolify setzen):

| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | Postgres-Verbindung |
| `AUTH_SECRET` | Session-Signatur (≥ 32 Zeichen) |
| `ADMIN_EMAIL` | Initial-Admin (Default `admin@ekv.local`) |
| `ADMIN_PASSWORD` | Initial-Admin-Passwort (Default `admin123` – **ändern!**) |
| `ADMIN_NAME` | Anzeigename (Default `Administrator`) |

**Coolify:** entweder das mitgelieferte `Dockerfile` verwenden, oder Nixpacks mit
Build-Command `npm run build` und Start-Command `npm start`. Der Admin-Seed und die
Migrationen laufen dann bei jedem Deploy/Start.

## Datenmodell (Kurz)

- **User** – interne Benutzer (`ADMIN` | `USER`)
- **Customer** – Kunden (Adresse, Land, optionaler Login via `passwordHash`)
- **DiscountGroup** – Rabattgruppe (PK = 3-stelliger `code`)
- **Article** – Artikel (→ optional `DiscountGroup`)
- **CustomerDiscount** – Kundenrabatt (Customer × DiscountGroup, unique)
