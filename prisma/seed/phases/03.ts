/** Phase 03 — Auth: roles + admin demo + member demo. */
import type { PrismaClient } from "../../../src/generated/prisma/client";

const ROLES = [
  { email: "demo.owner@demo.local",  name: "Demo Owner",  role: "owner"  },
  { email: "demo.admin@demo.local",  name: "Demo Admin",  role: "admin"  },
  { email: "demo.member@demo.local", name: "Demo Member", role: "member" },
  { email: "demo.viewer@demo.local", name: "Demo Viewer", role: "viewer" },
];

export async function seedPhase03(prisma: PrismaClient) {
  for (const u of ROLES) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        isDemo: true,
        emailVerified: new Date(),
      },
      update: { name: u.name, isDemo: true },
    });
  }
}
