#!/usr/bin/env node
// brief-generator.mjs — Valida briefs slim (~200 tokens) contra a fase canônica.
//
// Cada brief em docs/briefs/<NN>_BRIEF.md tem um campo "Hash:" do conteúdo da fase
// canônica. Se a fase muda, o hash bate diferente e CI falha.
//
// Uso:
//   node scripts/brief-generator.mjs verify                 # valida todos
//   node scripts/brief-generator.mjs hash docs/01_PRD.md    # imprime hash
//   node scripts/brief-generator.mjs list                   # lista briefs e status

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(process.cwd());
const BRIEFS_DIR = resolve(ROOT, "docs", "briefs");

// Mapeia brief → arquivo canônico de fase
const PHASE_MAP = {
  "00_BRIEF": "docs/templates/00_VALIDATION.md",
  "01_BRIEF": "docs/templates/01_PRD.md",
  "02_BRIEF": "docs/templates/02_MONETIZATION.md",
  "03_BRIEF": "docs/templates/03_RESEARCH.md",
  "04_BRIEF": "docs/04_MARKET_AND_REFERENCES.md",
  "05_BRIEF": "docs/templates/05_DESIGN.md",
  "06_BRIEF": "docs/templates/06_SPECIFICATION.md",
  "07_BRIEF": "docs/templates/07_IMPLEMENTATION.md",
  "08_BRIEF": "docs/08_SECURITY.md",
  "09_BRIEF": "docs/09_TESTS.md",
  "10_BRIEF": "docs/10_DEBUG.md",
  "11_BRIEF": "docs/11_UX_AUDIT.md",
  "12_BRIEF": "docs/12_THREAT_MODEL.md",
  "13_BRIEF": "docs/13_RELEASE_READINESS.md",
  "14_BRIEF": "docs/templates/14_COMPLIANCE.md",
  "15_BRIEF": "docs/templates/15_DPA.md",
  "INT01_BRIEF": "docs/INT01_PLANO_ARQUITETURA.md",
  "INT02_BRIEF": "docs/INT02_PLANO_CONCLUSAO.md",
  "INT03_BRIEF": "docs/INT03_AI_DOCS_INDEXING.md",
  "OPS01_BRIEF": "docs/OPS01_DEPLOYMENT.md",
  "OPS02_BRIEF": "docs/OPS02_RUNBOOK.md",
  "OPS03_BRIEF": "docs/OPS03_POST_MORTEM.md",
  "S01_BRIEF": "docs/S01_QUICK_START.md",
  "S02_BRIEF": "docs/S02_PROMPT_PACKS.md",
  "S03_BRIEF": "docs/S03_SKILLS_INDEX.md",
  "S04_BRIEF": "docs/S04_IMAGE_GENERATION.md",
  "S05_BRIEF": "docs/S05_DESIGN_REFERENCES.md",
};

export function hashFile(path) {
  if (!existsSync(path)) return null;
  return createHash("sha256")
    .update(readFileSync(path, "utf8"))
    .digest("hex")
    .slice(0, 16);
}

export function extractBriefHash(briefPath) {
  if (!existsSync(briefPath)) return null;
  const m = readFileSync(briefPath, "utf8").match(/^Hash:\s*([a-f0-9]+)\s*$/m);
  return m ? m[1] : null;
}

export function approxTokens(text) {
  // Heurística simples: 1 token ≈ 4 chars (suficiente p/ ordem de grandeza)
  return Math.round(text.length / 4);
}

export function verify() {
  const issues = [];
  if (!existsSync(BRIEFS_DIR)) {
    return [{ kind: "missing-dir", path: BRIEFS_DIR }];
  }
  for (const [briefName, phaseRel] of Object.entries(PHASE_MAP)) {
    const briefPath = resolve(BRIEFS_DIR, `${briefName}.md`);
    const phasePath = resolve(ROOT, phaseRel);
    if (!existsSync(briefPath)) {
      issues.push({ kind: "missing", brief: briefName });
      continue;
    }
    if (!existsSync(phasePath)) {
      issues.push({ kind: "phase-missing", brief: briefName, phase: phaseRel });
      continue;
    }
    const expected = hashFile(phasePath);
    const actual = extractBriefHash(briefPath);
    if (actual !== expected) {
      issues.push({
        kind: "hash-drift",
        brief: briefName,
        expected,
        actual,
      });
    }
    const tokens = approxTokens(readFileSync(briefPath, "utf8"));
    if (tokens > 280) {
      issues.push({
        kind: "too-long",
        brief: briefName,
        tokens,
        limit: 280,
      });
    }
  }
  return issues;
}

const cmd = process.argv[2];
if (cmd === "hash") {
  const path = process.argv[3];
  if (!path) {
    console.error("uso: brief-generator.mjs hash <path>");
    process.exit(2);
  }
  const h = hashFile(resolve(ROOT, path));
  if (!h) {
    console.error("arquivo ausente");
    process.exit(1);
  }
  console.log(h);
} else if (cmd === "list") {
  for (const [briefName, phaseRel] of Object.entries(PHASE_MAP)) {
    const bp = resolve(BRIEFS_DIR, `${briefName}.md`);
    const status = existsSync(bp) ? "ok" : "ausente";
    console.log(`${briefName.padEnd(15)} ${status.padEnd(10)} ${phaseRel}`);
  }
} else if (cmd === "verify" || !cmd) {
  const issues = verify();
  if (issues.length === 0) {
    console.log("briefs OK — todos sincronizados, dentro do limite de tokens");
    process.exit(0);
  }
  for (const i of issues) {
    if (i.kind === "missing")
      console.error(`  ✗ ${i.brief} — brief ausente`);
    else if (i.kind === "missing-dir")
      console.error(`  ✗ ${i.path} — diretório ausente`);
    else if (i.kind === "phase-missing")
      console.error(`  ✗ ${i.brief} — fase canônica ausente: ${i.phase}`);
    else if (i.kind === "hash-drift")
      console.error(`  ✗ ${i.brief} — hash drift (esperado ${i.expected}, achado ${i.actual})`);
    else if (i.kind === "too-long")
      console.error(`  ✗ ${i.brief} — ${i.tokens} tokens > limite ${i.limit}`);
  }
  process.exit(1);
} else {
  console.error("uso: brief-generator.mjs <verify|hash <path>|list>");
  process.exit(2);
}
