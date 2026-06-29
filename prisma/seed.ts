/**
 * Seed idempotente — Acampamento RAIZ 2026.
 *
 * Cria os 3 lotes, um admin demo e algumas inscrições demo (isDemo=true).
 * `wipe-demo.ts` apaga apenas registos com isDemo=true.
 *
 * Uso: `npm run db:seed`  |  apagar demo: `npm run db:demo:wipe`
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { chooseTribo, emptyCounts, applyAssignment, type Gender } from "../src/lib/tribos";
import { ageOn, makePublicCode } from "../src/lib/format";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const LOTES = [
  { name: "1º Lote", order: 1, priceCents: 30000, capacity: 80 },
  { name: "2º Lote", order: 2, priceCents: 40000, capacity: 80 },
  { name: "3º Lote", order: 3, priceCents: 45000, capacity: 80 },
];

const DEMO_NAMES = [
  ["Ana Beatriz Souza", "FEMALE", 13],
  ["Pedro Henrique Lima", "MALE", 15],
  ["Mariana Costa", "FEMALE", 17],
  ["Lucas Almeida", "MALE", 12],
  ["Júlia Fernandes", "FEMALE", 19],
  ["Gabriel Rocha", "MALE", 16],
  ["Larissa Martins", "FEMALE", 14],
  ["Rafael Oliveira", "MALE", 18],
] as const;

async function main() {
  console.log("[seed] Lotes...");
  let firstLoteId = "";
  for (const l of LOTES) {
    const lote = await prisma.lote.upsert({
      where: { order: l.order },
      create: l,
      update: { name: l.name, priceCents: l.priceCents, capacity: l.capacity },
    });
    if (l.order === 1) firstLoteId = lote.id;
  }

  console.log("[seed] Admin demo (admin@raiz.local / raiz123456)...");
  await prisma.user.upsert({
    where: { email: "admin@raiz.local" },
    create: {
      email: "admin@raiz.local",
      name: "Admin RAIZ",
      role: "ADMIN",
      isDemo: true,
      emailVerified: new Date(),
      passwordHash: await hashPassword("raiz123456"),
    },
    update: {
      role: "ADMIN",
      isDemo: true,
      passwordHash: await hashPassword("raiz123456"),
    },
  });

  console.log("[seed] Inscrições demo...");
  const counts = emptyCounts();
  for (const [name, gender, age] of DEMO_NAMES) {
    const tribo = chooseTribo(gender as Gender, age, counts);
    applyAssignment(tribo, gender as Gender, age, counts);
    const code = makePublicCode(name.replace(/\s/g, "") + age);
    const birthDate = new Date(2026, 5, 1);
    birthDate.setFullYear(birthDate.getFullYear() - age);
    const existing = await prisma.registration.findFirst({
      where: { fullName: name, isDemo: true },
    });
    if (existing) continue;
    await prisma.registration.create({
      data: {
        publicCode: code,
        fullName: name,
        birthDate,
        gender: gender as Gender,
        ageAtCamp: ageOn(birthDate, new Date(2026, 5, 1)),
        phone: "11999990000",
        tribo,
        status: "CONFIRMED",
        isDemo: true,
        loteId: firstLoteId,
        guardian: {
          create: {
            name: `Responsável de ${name.split(" ")[0]}`,
            cpf: "00000000000",
            phone: "11999990000",
            relationship: "mae",
          },
        },
        health: { create: { triageFlags: age === 12 ? ["primeira_vez"] : [] } },
        consent: {
          create: {
            guardianName: `Responsável de ${name.split(" ")[0]}`,
            guardianCpf: "00000000000",
            consentData: true,
            consentHealth: true,
            consentActivities: true,
            consentImage: true,
            termVersion: "v1-2026-06",
          },
        },
        payment: {
          create: {
            method: "PIX",
            status: "CONFIRMED",
            amountCents: 30000,
            loteOrder: 1,
            pixTxid: code,
          },
        },
      },
    });
  }

  console.log("[seed] OK. Admin: admin@raiz.local / raiz123456");
}

main()
  .catch((err) => {
    console.error("[seed] falhou:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
