/** Phase 00 — Validation: usuário smoke isolado. */
import type { PrismaClient } from "../../../src/generated/prisma/client";

export async function seedPhase00(prisma: PrismaClient) {
  await prisma.user.upsert({
    where: { email: "smoke@demo.local" },
    create: {
      email: "smoke@demo.local",
      name: "Smoke User",
      isDemo: true,
      emailVerified: new Date(),
    },
    update: { isDemo: true },
  });
}
