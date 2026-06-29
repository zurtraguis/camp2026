/**
 * seed/index.ts — Orquestra seeders por fase.
 *
 * Lê activePhase de .harness/phase-state.json (fallback: detect via docs).
 * Roda apenas seeders ≤ activePhase. Idempotente.
 *
 * Uso:
 *   npm run db:seed                  # roda até a fase ativa
 *   HARNESS_SEED_PHASE=07 npm run db:seed   # força até fase 07
 *   HARNESS_SEED_PHASE=all npm run db:seed  # todos (testes)
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PHASE_SEEDERS, seedersUpTo } from "./registry";

const ROOT = resolve(process.cwd());

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
  console.error("[seed] BLOQUEIO: NODE_ENV=production. Rode com ALLOW_DEMO_SEED=1 se intencional.");
  process.exit(1);
}

function readActivePhase(): string | null {
  if (process.env.HARNESS_SEED_PHASE) return process.env.HARNESS_SEED_PHASE;
  const p = resolve(ROOT, ".harness", "phase-state.json");
  if (!existsSync(p)) return null;
  try {
    const s = JSON.parse(readFileSync(p, "utf8"));
    return s.activePhase || null;
  } catch {
    return null;
  }
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const requested = readActivePhase();
  const phase = requested === "all" ? "15" : requested;
  const seeders = phase ? seedersUpTo(phase) : [];

  if (seeders.length === 0) {
    console.log("[seed] nenhuma fase ativa detectada — nada a semear.");
    console.log("       use HARNESS_SEED_PHASE=NN ou ative uma fase via:");
    console.log("       node scripts/phase-state.mjs set --active=03");
    return;
  }

  console.log(`[seed] activePhase=${phase} → ${seeders.length} seeder(s)`);
  for (const s of seeders) {
    console.log(`  → fase ${s.phase}: ${s.description}`);
    await s.run(prisma);
  }
  console.log("[seed] OK (idempotente). Para apagar: npm run db:demo:wipe");
}

main()
  .catch((err) => {
    console.error("[seed] falhou:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
