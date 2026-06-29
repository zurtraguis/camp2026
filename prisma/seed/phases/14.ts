/** Phase 14 — LGPD: ROPA + audit log + DSR fixtures (track enterprise). */
import type { PrismaClient } from "../../../src/generated/prisma/client";

// Apenas insere se modelos existirem (track enterprise pode ter models opcionais)
async function safeUpsert<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.code === "P2025" || /Unknown table|relation .* does not exist/i.test(err?.message || "")) {
      return null;
    }
    throw err;
  }
}

export async function seedPhase14(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({
    where: { email: "demo.owner@demo.local" },
  });
  if (!owner) return;

  // 1. Audit log fixture (3 eventos)
  // @ts-ignore — modelo opcional no track enterprise
  await safeUpsert(() => (prisma as any).auditLog?.createMany?.({
    data: [
      {
        actor: owner.id,
        action: "user.login",
        target: owner.id,
        metadata: { ip: "192.0.2.1", source: "seed-phase-14" },
      },
      {
        actor: owner.id,
        action: "data.export",
        target: owner.id,
        metadata: { fields: ["email", "name"], source: "seed-phase-14" },
      },
      {
        actor: "system",
        action: "consent.granted",
        target: owner.id,
        metadata: { purpose: "marketing", source: "seed-phase-14" },
      },
    ],
    skipDuplicates: true,
  }));

  // 2. Data Subject Request fixture (1 ticket aberto)
  // @ts-ignore
  await safeUpsert(() => (prisma as any).dataSubjectRequest?.upsert?.({
    where: { id: "dsr_demo_owner_access" },
    create: {
      id: "dsr_demo_owner_access",
      userId: owner.id,
      type: "ACCESS",
      status: "OPEN",
      dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
    update: {},
  }));

  console.log("    ↳ LGPD fixtures: audit log + DSR (skip se modelos opcionais ausentes)");
}
