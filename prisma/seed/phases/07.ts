/** Phase 07 — Implementation: usage events típicos para feature flags. */
import type { PrismaClient } from "../../../src/generated/prisma/client";

const EVENT_TYPES = [
  "feature.export.csv",
  "feature.share.link",
  "feature.bulk.action",
  "api.invocation",
];

export async function seedPhase07(prisma: PrismaClient) {
  const owner = await prisma.user.findUnique({
    where: { email: "demo.owner@demo.local" },
  });
  if (!owner) return;

  for (const type of EVENT_TYPES) {
    await prisma.usage.create({
      data: {
        userId: owner.id,
        type,
        quantity: 1,
        metadata: { source: "seed-phase-07", demo: true },
      },
    });
  }
}
