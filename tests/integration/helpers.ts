/**
 * Harness dos testes de integração.
 *
 * Guarda de segurança: recusa rodar se a DATABASE_URL não parecer descartável.
 * Estes testes APAGAM todas as tabelas entre casos — apontar para produção por
 * engano destruiria as inscrições reais.
 */
import { vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { RegistrationInput } from "@/lib/validation";
import { maxInstallmentsForDate } from "@/lib/carne";

const url = process.env.DATABASE_URL ?? "";

const pareceDescartavel =
  /localhost|127\.0\.0\.1|host\.docker\.internal|@postgres[:/]/.test(url) &&
  !/supabase|amazonaws|neon\.tech|render\.com/.test(url);

if (!url) {
  throw new Error(
    "DATABASE_URL ausente. Suba um Postgres descartável e exporte a URL:\n" +
      '  docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=ci -e POSTGRES_USER=ci -e POSTGRES_DB=ci postgres:16\n' +
      '  DATABASE_URL="postgresql://ci:ci@localhost:5433/ci" npm run test:integration',
  );
}
if (!pareceDescartavel) {
  throw new Error(
    `RECUSADO: DATABASE_URL não parece um banco descartável (${url.replace(/:[^:@]*@/, ":***@")}).\n` +
      "Os testes de integração APAGAM todas as tabelas. Use um Postgres local/CI.",
  );
}

const adapter = new PrismaPg({ connectionString: url });
export const db = new PrismaClient({ adapter });

/** Zera os dados entre casos. Ordem respeita as FKs (filhos primeiro). */
export async function resetDb(): Promise<void> {
  await db.$transaction([
    db.installment.deleteMany(),
    db.payment.deleteMany(),
    db.consentRecord.deleteMany(),
    db.healthProfile.deleteMany(),
    db.guardian.deleteMany(),
    db.registration.deleteMany(),
    db.coupon.deleteMany(),
    db.stripeEvent.deleteMany(),
  ]);
}

/** Lotes padrão (preços reais do projeto). Idempotente. */
export async function seedLotes(): Promise<void> {
  const lotes = [
    { name: "1º Lote", order: 1, priceCents: 30000, capacity: 80 },
    { name: "2º Lote", order: 2, priceCents: 40000, capacity: 80 },
    { name: "3º Lote", order: 3, priceCents: 40000, capacity: 80 },
  ];
  for (const l of lotes) {
    await db.lote.upsert({
      where: { order: l.order },
      create: l,
      update: { priceCents: l.priceCents, capacity: l.capacity, active: true },
    });
  }
}

/** Admin de teste (para as ações que exigem um revisor). */
export async function seedAdmin(): Promise<string> {
  const u = await db.user.upsert({
    where: { email: "teste@integracao.local" },
    create: {
      email: "teste@integracao.local",
      name: "Admin Teste",
      role: "ADMIN",
      passwordHash: "x",
    },
    update: {},
  });
  return u.id;
}

/** Payload válido de inscrição; `over` sobrescreve o que o teste precisar. */
export function inscricaoValida(
  over: Partial<RegistrationInput> = {},
): RegistrationInput {
  return {
    fullName: "Maria Clara Souza",
    birthDate: "2010-03-10",
    gender: "FEMALE" as const,
    cpf: "98765432100",
    phone: "11999998888",
    email: "",
    shirtSize: "M" as const,
    church: "Igreja Teste",
    city: "Manaus",
    guardianName: "João Souza",
    guardianCpf: "12345678901",
    guardianPhone: "11988887777",
    guardianEmail: "",
    guardianRelationship: "pai" as const,
    allergies: "",
    medications: "",
    dietaryRestrictions: "",
    chronicConditions: "",
    healthNotes: "",
    triageFlags: [],
    triageNotes: "",
    consentData: true,
    consentHealth: true,
    consentActivities: true,
    consentImage: false,
    paymentMethod: "PIX" as const,
    installments: 1,
    ...over,
  };
}

/**
 * Preço do lote vigente AGORA. Os testes não podem chumbar R$300: o preço muda
 * por data (1º lote até 31/07, depois 400) e o teto de parcelas encolhe
 * até o acampamento. Derivar mantém a suíte verde ao longo do tempo.
 */
export async function precoVigente(): Promise<number> {
  const { getActiveLote } = await import("@/lib/lote.service");
  const lote = await getActiveLote();
  if (!lote) throw new Error("Nenhum lote ativo — rode seedLotes() antes.");
  return lote.priceCents;
}

/**
 * Data fixa em que o carnê AINDA existe, para os testes que precisam de um.
 *
 * O parcelamento encolhe sozinho até acabar — a última parcela tem de vencer
 * antes do acampamento, então de 26/08/2026 em diante não há mais carnê
 * nenhum. Sem congelar o relógio, toda a suíte de carnê passa a criar
 * inscrições à vista e falha em bloco num dia qualquer, sem ninguém ter
 * tocado no código. Foi o que aconteceu em 31/08/2026.
 *
 * Derivar de `new Date()` não resolvia: derivava para 1x, que não é carnê.
 * O que estes testes querem é um cenário com carnê, não "o que der hoje".
 */
export const DATA_COM_CARNE = new Date("2026-06-01T12:00:00-03:00");

/** Parcelas de carnê disponíveis na data de teste (hoje seria 1 = à vista). */
export const PARCELAS_NO_TESTE = maxInstallmentsForDate(DATA_COM_CARNE);

/**
 * Congela o relógio em DATA_COM_CARNE. Só o `Date` é falsificado: com timers
 * falsos de verdade o driver do Postgres trava esperando um timeout que nunca
 * dispara.
 */
export function congelarEmDataComCarne(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DATA_COM_CARNE);
}

export function descongelarRelogio(): void {
  vi.useRealTimers();
}
