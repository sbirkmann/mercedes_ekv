#!/bin/sh
# Start-Ablauf im Container – gibt jede Phase aus, damit Logs sichtbar sind.
set -e

echo "──────────────────────────────────────────────"
echo "▶ EKV Portal – Container-Start"
echo "  NODE_ENV=${NODE_ENV:-} PORT=${PORT:-3000}"

if [ -z "$DATABASE_URL" ]; then
  echo "✖ DATABASE_URL ist nicht gesetzt – bitte in Coolify konfigurieren." >&2
  exit 1
fi
if [ -z "$AUTH_SECRET" ]; then
  echo "✖ AUTH_SECRET ist nicht gesetzt – bitte in Coolify konfigurieren." >&2
  exit 1
fi

echo "▶ [1/3] Datenbank-Migrationen (prisma migrate deploy) …"
npx prisma migrate deploy

echo "▶ [2/3] Admin-Benutzer sicherstellen …"
node prisma/ensure-admin.mjs

echo "▶ [3/3] Next.js starten (0.0.0.0:${PORT:-3000}) …"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
