import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("🌱 Seeding …");

  // --- Rabattgruppen -------------------------------------------------------
  const groups = [
    { code: "A10", name: "Standard", percent: 10, individual: false, minMargin: 15 },
    { code: "B20", name: "Fachhandel", percent: 20, individual: false, minMargin: 12 },
    { code: "C30", name: "Großkunde", percent: 30, individual: false, minMargin: 8 },
    { code: "IND", name: "Individuell", percent: null, individual: true, minMargin: 20 },
    { code: "Z00", name: "Kein Rabatt", percent: 0, individual: false, minMargin: 25 },
  ];
  for (const g of groups) {
    await prisma.discountGroup.upsert({
      where: { code: g.code },
      update: g,
      create: g,
    });
  }
  console.log(`  ✓ ${groups.length} Rabattgruppen`);

  // --- Benutzer (interne User) --------------------------------------------
  const users = [
    { email: "admin@ekv.local", name: "Anna Admin", role: UserRole.ADMIN, pw: "admin123" },
    { email: "user@ekv.local", name: "Uwe User", role: UserRole.USER, pw: "user123" },
    { email: "vertrieb@ekv.local", name: "Vera Vertrieb", role: UserRole.USER, pw: "user123" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: await hash(u.pw),
      },
    });
  }
  console.log(`  ✓ ${users.length} Benutzer`);

  // --- Kunden --------------------------------------------------------------
  const customers = [
    {
      customerNumber: "K-1001",
      companyName: "Müller Automobile GmbH",
      contactName: "Hans Müller",
      email: "kunde@mueller-auto.de",
      pw: "kunde123",
      street: "Hauptstraße 12",
      zip: "70173",
      city: "Stuttgart",
      country: "DE",
      groups: [
        { code: "A10", discount: 12, individual: false },
        { code: "IND", discount: 27.5, individual: true },
      ],
    },
    {
      customerNumber: "K-1002",
      companyName: "Auto Fischer AG",
      contactName: "Petra Fischer",
      email: "einkauf@auto-fischer.ch",
      pw: "kunde123",
      street: "Bahnhofplatz 3",
      zip: "8001",
      city: "Zürich",
      country: "CH",
      groups: [{ code: "B20", discount: 22, individual: false }],
    },
    {
      customerNumber: "K-1003",
      companyName: "Wagner Teilehandel e.K.",
      contactName: "Klaus Wagner",
      email: null,
      pw: null,
      street: "Industrieweg 5",
      zip: "4020",
      city: "Linz",
      country: "AT",
      groups: [
        { code: "C30", discount: 30, individual: false },
        { code: "A10", discount: 8, individual: true },
      ],
    },
  ];

  for (const c of customers) {
    const { groups: cg, pw, ...data } = c;
    const customer = await prisma.customer.upsert({
      where: { customerNumber: c.customerNumber },
      update: {},
      create: {
        ...data,
        passwordHash: pw ? await hash(pw) : null,
      },
    });
    for (const g of cg) {
      await prisma.customerDiscount.upsert({
        where: {
          customerId_discountGroupCode: {
            customerId: customer.id,
            discountGroupCode: g.code,
          },
        },
        update: { discount: g.discount, individual: g.individual },
        create: {
          customerId: customer.id,
          discountGroupCode: g.code,
          discount: g.discount,
          individual: g.individual,
        },
      });
    }
  }
  console.log(`  ✓ ${customers.length} Kunden (+ Kundenrabatte)`);

  // --- Artikel -------------------------------------------------------------
  const articles = [
    { partNumber: "A0001234567", partNumberFmt: "A 000 123 45 67", titleDe: "Bremsbelagsatz vorne", titleEn: "Brake pad set front", listPrice: 89.9, group: "A10" },
    { partNumber: "A0009876543", partNumberFmt: "A 000 987 65 43", titleDe: "Ölfilter", titleEn: "Oil filter", listPrice: 14.5, group: "A10" },
    { partNumber: "A1234567890", partNumberFmt: "A 123 456 78 90", titleDe: "Zündkerze", titleEn: "Spark plug", listPrice: 9.95, group: "B20" },
    { partNumber: "A2223334445", partNumberFmt: "A 222 333 44 45", titleDe: "Luftfiltereinsatz", titleEn: "Air filter element", listPrice: 24.0, group: "B20" },
    { partNumber: "A5556667778", partNumberFmt: "A 555 666 77 78", titleDe: "Stoßdämpfer hinten", titleEn: "Shock absorber rear", listPrice: 149.0, group: "C30" },
    { partNumber: "A9998887776", partNumberFmt: "A 999 888 77 76", titleDe: "Scheibenwischer Satz", titleEn: "Wiper blade set", listPrice: 32.5, group: "IND" },
    { partNumber: "A0001112223", partNumberFmt: "A 000 111 22 23", titleDe: "Kraftstofffilter", titleEn: "Fuel filter", listPrice: 27.8, group: "Z00" },
  ];
  for (const a of articles) {
    const { group, ...data } = a;
    await prisma.article.upsert({
      where: { partNumber: a.partNumber },
      update: { ...data, discountGroupCode: group },
      create: { ...data, discountGroupCode: group },
    });
  }
  console.log(`  ✓ ${articles.length} Artikel`);

  console.log("✅ Seed fertig.");
  console.log("   Login Benutzer:  admin@ekv.local / admin123");
  console.log("   Login Kunde:     kunde@mueller-auto.de / kunde123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
