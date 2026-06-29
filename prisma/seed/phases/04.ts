/** Phase 04 — Dashboard: métricas mock + eventos para visualização. */
import type { PrismaClient } from "../../../src/generated/prisma/client";

export async function seedPhase04(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({
    where: { email: "demo.owner@demo.local" },
  });
  if (!owner) return;

  // 30 dias de eventos sintéticos para popular gráficos
  const now = Date.now();
  for (let d = 29; d >= 0; d--) {
    const ts = new Date(now - d * 24 * 60 * 60 * 1000);
    const qty = 50 + Math.round(Math.sin(d / 4) * 20 + Math.random() * 10);
    const id = `seed-usage-${owner.id}-${d}`;
    await prisma.usage.upsert({
      where: { id }, // chave determinística (PK) para idempotência
      create: {
        id,
        userId: owner.id,
        type: "demo.pageview",
        quantity: qty,
        createdAt: ts,
        metadata: { source: "seed-phase-04" },
      },
      update: { quantity: qty },
    });
  }
}
