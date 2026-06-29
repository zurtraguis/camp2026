/**
 * registry.ts — Lista ordenada de seeders por fase.
 *
 * Cada fase exporta `seedPhaseNN(prisma)`. O index.ts roda apenas seeders
 * cuja fase ≤ activePhase (lido de .harness/phase-state.json).
 */

import type { PrismaClient } from "../../src/generated/prisma/client";
import { seedPhase00 } from "./phases/00";
import { seedPhase03 } from "./phases/03";
import { seedPhase04 } from "./phases/04";
import { seedPhase06 } from "./phases/06";
import { seedPhase07 } from "./phases/07";
import { seedPhase14 } from "./phases/14";

export type PhaseSeeder = {
  phase: string;
  description: string;
  run: (prisma: PrismaClient) => Promise<void>;
};

export const PHASE_SEEDERS: PhaseSeeder[] = [
  { phase: "00", description: "Validation: usuário fictício para smoke", run: seedPhase00 },
  { phase: "03", description: "Auth: roles + admin demo + member demo",   run: seedPhase03 },
  { phase: "04", description: "Dashboard: métricas mock e eventos",       run: seedPhase04 },
  { phase: "06", description: "Stripe: customers + subscriptions demo",   run: seedPhase06 },
  { phase: "07", description: "Implementation: usage events típicos",     run: seedPhase07 },
  { phase: "14", description: "LGPD: ROPA + audit log + DSR fixtures",    run: seedPhase14 },
];

export function seedersUpTo(activePhase: string | null): PhaseSeeder[] {
  if (!activePhase) return [];
  const target = parseInt(activePhase, 10);
  return PHASE_SEEDERS.filter((s) => parseInt(s.phase, 10) <= target);
}
