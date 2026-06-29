#!/usr/bin/env node
// .harness/hooks/subagent-brief.mjs — Injeta brief slim da fase ativa no contexto.
// Lê fase de scripts/phase-state.mjs (fonte única). Emite o conteúdo do brief
// correspondente em stdout. Hook não-bloqueante.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPhaseState, detectActivePhase } from "../../scripts/phase-state.mjs";

const ROOT = resolve(process.cwd());

function briefFor(phaseNumber) {
  if (!phaseNumber) return null;
  const candidates = [
    resolve(ROOT, "docs", "briefs", `${phaseNumber}_BRIEF.md`),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  return null;
}

const state = getPhaseState();
const active = state.activePhase || detectActivePhase();
const brief = briefFor(active);

if (!brief) {
  // Hook não-bloqueante: sai 0 mesmo sem brief
  process.exit(0);
}

console.log("=== Harness Brief (fase " + active + ") ===");
console.log(brief);
process.exit(0);
