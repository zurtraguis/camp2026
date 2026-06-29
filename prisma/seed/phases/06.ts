/** Phase 06 — Stripe: customers + subscriptions demo. */
import type { PrismaClient } from "../../../src/generated/prisma/client";

const PLANS = [
  { email: "demo.owner@demo.local",  plan: "pro",   status: "active"   },
  { email: "demo.admin@demo.local",  plan: "team",  status: "active"   },
  { email: "demo.member@demo.local", plan: "free",  status: "inactive" },
];

export async function seedPhase06(prisma: PrismaClient) {
  for (const p of PLANS) {
    const user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) continue;
    if (p.plan === "free") continue;

    const customerId = `cus_demo_${user.id}`;
    const subId = `sub_demo_${user.id}`;
    const priceId = `price_demo_${p.plan}`;
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subId },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        stripePriceId: priceId,
        status: p.status,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        status: p.status,
        stripePriceId: priceId,
      },
    });
  }
}
