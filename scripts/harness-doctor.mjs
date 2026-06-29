#!/usr/bin/env node
// harness-doctor.mjs — Orquestrador de validações do harness.
//
// Executa 8 sub-validações e reporta saúde global.
// Usado como gate em CI e localmente antes de avançar fase.

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const ROOT = resolve(process.cwd());

const CHECKS = [
  {
    id: "phase-state",
    label: "phase-state válido e sincronizado",
    cmd: "node scripts/phase-state.mjs validate",
  },
  {
    id: "briefs",
    label: "briefs sincronizados (hash bate)",
    cmd: "node scripts/brief-generator.mjs verify",
  },
  {
    id: "agnostic",
    label: "zero model names em arquivos canônicos",
    cmd: "node scripts/lint-agnosticism.mjs",
  },
  {
    id: "hooks",
    label: "manifest.json + 4 hooks .mjs presentes",
    cmd: null,
    fn: () => {
      const must = [
        ".harness/hooks/manifest.json",
        ".harness/hooks/enforce-skills.mjs",
        ".harness/hooks/phase-doc-sync.mjs",
        ".harness/hooks/tdd-loop.mjs",
        ".harness/hooks/subagent-brief.mjs",
      ];
      const missing = must.filter((f) => !existsSync(resolve(ROOT, f)));
      if (missing.length) throw new Error("ausentes: " + missing.join(", "));
    },
  },
  {
    id: "skills-audit",
    label: "S03 sincronizado com disco",
    cmd: "node scripts/skills-audit.mjs --strict",
  },
  {
    id: "demo",
    label: "seeders por fase carregam",
    cmd: null,
    fn: () => {
      const must = [
        "prisma/seed/index.ts",
        "prisma/seed/registry.ts",
        "prisma/seed/phases/00.ts",
        "prisma/seed/phases/03.ts",
        "prisma/seed/phases/04.ts",
        "prisma/seed/phases/06.ts",
        "prisma/seed/phases/07.ts",
        "prisma/seed/phases/14.ts",
      ];
      const missing = must.filter((f) => !existsSync(resolve(ROOT, f)));
      if (missing.length) throw new Error("ausentes: " + missing.join(", "));
    },
  },
  {
    id: "lgpd",
    label: "track enterprise tem ROPA template",
    cmd: null,
    fn: () => {
      const ropa = resolve(
        ROOT,
        "docs",
        "templates",
        "14_COMPLIANCE_FIXTURES",
        "ROPA_TEMPLATE.md"
      );
      if (!existsSync(ropa)) throw new Error("ROPA_TEMPLATE.md ausente");
    },
  },
  {
    id: "project-type-coherence",
    label: "project_type ↔ stack ↔ gates coerentes",
    cmd: null,
    fn: () => {
      const statePath = resolve(ROOT, ".harness", "phase-state.json");
      if (!existsSync(statePath)) return; // pre-kickoff é ok
      const state = JSON.parse(readFileSync(statePath, "utf8"));
      const pt = state.project_type;
      if (!pt) return; // ainda não definido — ok antes de /kickoff
      const VALID = ["saas", "internal-app", "landing", "single-page", "blog", "ecommerce", "repository-catalog"];
      if (!VALID.includes(pt)) throw new Error(`project_type inválido: ${pt}`);
      // Recomendação de stack por tipo (warn, não falha)
      const recommend = {
        landing: "landing", "single-page": "single-page", blog: "blog",
        ecommerce: "ecommerce", "internal-app": "internal-app",
        "repository-catalog": "repository-catalog", saas: "nextjs",
      };
      const stack = process.env.HARNESS_STACK || "nextjs";
      if (recommend[pt] && recommend[pt] !== stack) {
        console.warn(`  ⚠ project_type=${pt} sugere stack=${recommend[pt]} (atual: ${stack})`);
      }
      // gates_skipped devem ter reason
      for (const g of state.gates_skipped || []) {
        if (!g.reason) throw new Error(`gate skipped sem reason: ${g.gate}`);
      }
    },
  },
  {
    id: "notice-cache",
    label: "cache de notices íntegro (ou vazio)",
    cmd: null,
    fn: () => {
      const cache = resolve(ROOT, ".harness", "cache", "notices.json");
      if (!existsSync(cache)) return; // primeira execução é válida
      const content = readFileSync(cache, "utf8");
      JSON.parse(content); // throws se corrompido
    },
  },
];

let ok = 0;
let fail = 0;
const failures = [];

for (const c of CHECKS) {
  process.stdout.write(`  [${c.id}] ${c.label} ... `);
  try {
    if (c.cmd) execSync(c.cmd, { cwd: ROOT, stdio: "pipe" });
    else if (c.fn) c.fn();
    console.log("OK");
    ok++;
  } catch (err) {
    console.log("FAIL");
    failures.push({ id: c.id, msg: (err && err.message) || String(err) });
    fail++;
  }
}

console.log("");
console.log(`━━ Doctor: ${ok} OK · ${fail} FAIL ━━`);
if (fail > 0) {
  for (const f of failures) {
    console.error(`  ✗ ${f.id}: ${f.msg.split("\n")[0]}`);
  }
  process.exit(1);
}
console.log("✓ Harness saudável");
