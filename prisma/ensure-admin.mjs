// Legt beim Deploy einen Admin-Benutzer an, falls noch keiner mit dieser
// E-Mail existiert. Idempotent – kann bei jedem Start laufen.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.env.ADMIN_EMAIL || "admin@ekv.local").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "admin123";
const name = process.env.ADMIN_NAME || "Administrator";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin '${email}' existiert bereits – kein Seed nötig.`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`✅ Admin-Benutzer '${email}' angelegt.`);
  if (password === "admin123") {
    console.warn("⚠  Standard-Passwort verwendet – ADMIN_PASSWORD als Env-Var setzen!");
  }
}

main()
  .catch((e) => {
    console.error("Admin-Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
