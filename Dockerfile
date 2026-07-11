# Coolify / Docker Deployment für die Next.js-App
FROM node:22-slim AS base
WORKDIR /app
# OpenSSL wird von Prisma benötigt
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Abhängigkeiten (Prisma-Schema vorab kopieren, damit postinstall `prisma generate` läuft)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Quellcode + Build
COPY . .
RUN npm run build && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Startet: DATABASE_URL/AUTH_SECRET-Check + migrate deploy + Admin-Seed + next start
CMD ["./docker-entrypoint.sh"]
