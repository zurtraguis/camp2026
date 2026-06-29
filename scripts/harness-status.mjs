#!/usr/bin/env node
// harness-status.mjs — Snapshot do estado atual do harness/projeto.
//
// Lê:
//   .harness-config.json      (versão, stack, trilha)
//   docs/DOCS_INDEX.md        (status de cada fase)
//   .harness/events.jsonl     (último evento de telemetria, se existir)
//   docs/00..15_*.md          (existência → fase em progresso)
//
// Output:
//   --json   → JSON estruturado (consumido por CLI vibecoding)
//   default  → texto humano

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadConfig } from "./harness-config.mjs";

const ROOT = resolve(process.cwd());
const FORMAT = process.argv.includes("--json") ? "json" : "human";

const PHASE_FILES = [
  ["00", "00_VALIDATION"],
  ["01", "01_PRD"],
  ["02", "02_MONETIZATION"],
  ["03", "03_RESEARCH"],
  ["04", "04_MARKET_AND_REFERENCES"],
  ["05", "05_DESIGN"],
  ["06", "06_SPECIFICATION"],
  ["07", "07_IMPLEMENTATION"],
  ["08", "08_SECURITY"],
  ["09", "09_TESTS"],
  ["10", "10_DEBUG"],
  ["11", "11_UX_AUDIT"],
  ["12", "12_THREAT_MODEL"],
  ["13", "13_RELEASE_READINESS"],
];

function detectCurrentPhase() {
  // pega a fase mais alta cujo doc existe e tem conteúdo > 200 bytes (não é template)
  let current = null;
  for (const [n, slug] of PHASE_FILES) {
    const p = resolve(ROOT, "docs", `${slug}.md`);
    if (existsSync(p) && statSync(p).size > 200) current = { number: n, slug };
  }
  return current;
}

function lastEvent() {
  const p = resolve(ROOT, ".harness", "events.jsonl");
  if (!existsSync(p)) return null;
  try {
    const lines = readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
    if (!lines.length) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

function suggestNext(cfg, phase) {
  if (!existsSync(resolve(ROOT, ".harness-pristine.consumed"))) {
    return "rode `bash scripts/harness-init.sh` para inicializar a cópia";
  }
  if (!phase || phase.number === "00") return "/kickoff (ou /resume se já preenchido)";
  const map = {
    "00": "/prd",
    "01": "/market",
    "02": "/research",
    "03": "/market",
    "04": "/design",
    "05": "/spec",
    "06": "/implement-backend (ou /implement-frontend)",
    "07": "/test-writer → /security-audit",
    "08": "/observability-setup",
    "09": "/debugger (se falhas) ou /performance-baseline",
    "10": "/performance-baseline",
    "11": "/threat-model",
    "12": "/release",
    "13": "/progressive-rollout → /pr",
  };
  return map[phase.number] || "/resume";
}

function build() {
  const cfg = loadConfig();
  if (!cfg) {
    return {
      ok: false,
      reason: "config ausente — rode `node scripts/harness-config.mjs init`",
    };
  }
  const phase = detectCurrentPhase();
  const ev = lastEvent();
  return {
    ok: true,
    version: cfg.version,
    stack: cfg.stack,
    track: cfg.track,
    pristine_consumed: existsSync(resolve(ROOT, ".harness-pristine.consumed")),
    current_phase: phase,
    last_phase_completed: cfg.last_phase_completed,
    last_event: ev,
    next_suggested: suggestNext(cfg, phase),
  };
}

const status = build();

if (FORMAT === "json") {
  console.log(JSON.stringify(status, null, 2));
  process.exit(status.ok ? 0 : 1);
}

if (!status.ok) {
  console.error(`[harness-status] ${status.reason}`);
  process.exit(1);
}

console.log("━━━ Harness Status ━━━");
console.log(`  versão:      ${status.version}`);
console.log(`  stack:       ${status.stack}`);
console.log(`  trilha:      ${status.track}`);
console.log(`  consumido:   ${status.pristine_consumed ? "sim" : "não (cópia ainda pristine)"}`);
console.log(
  `  fase atual:  ${
    status.current_phase
      ? `${status.current_phase.number} (${status.current_phase.slug})`
      : "nenhuma (kickoff pendente)"
  }`
);
if (status.last_phase_completed) {
  console.log(`  última fechada: ${status.last_phase_completed}`);
}
if (status.last_event) {
  console.log(
    `  último evento: ${status.last_event.event}/${status.last_event.name} @ ${status.last_event.ts}`
  );
}
console.log(`  próximo:     ${status.next_suggested}`);
