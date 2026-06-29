#!/usr/bin/env node
// phase-state.mjs — Fonte única de verdade para o estado de fase do harness.
//
// Lê e muta `.harness/phase-state.json`. Todos os hooks, scripts e CLI
// devem consumir este módulo (não inferir fase por conta própria).
//
// Uso (CLI):
//   node scripts/phase-state.mjs get [field]
//   node scripts/phase-state.mjs set --active=04 --complete=03
//   node scripts/phase-state.mjs detect           # auto-detect (fallback) e persist
//   node scripts/phase-state.mjs validate         # exit 1 se inconsistente
//
// Uso (import):
//   import { getPhaseState, setPhaseState, detectActivePhase } from "./phase-state.mjs";

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { phasesForTrack, currentTrack } from "./track-resolver.mjs";

const ROOT = resolve(process.cwd());
const STATE_PATH = resolve(ROOT, ".harness", "phase-state.json");

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
  ["14", "14_COMPLIANCE"],
  ["15", "15_DPA"],
];

const DEFAULT_STATE = {
  version: 2,
  activePhase: null,
  completedPhases: [],
  track: "standard",
  project_type: null,
  gates_skipped: [],
  lastSnapshotHash: null,
  updatedAt: null,
};

// project_type ∈ PROJECT_TYPES. null = ainda não definido (perguntar no /kickoff).
export const PROJECT_TYPES = [
  "saas",
  "internal-app",
  "landing",
  "single-page",
  "blog",
  "ecommerce",
  "repository-catalog",
];

// Matriz gate × project_type. Valores: "required" | "light" | "skip" | "optional" | "replaced:<cmd>".
// Consumida por hooks (.cursor/hooks.json) e por harness-doctor.
export const GATE_MATRIX = {
  validate: {
    saas: "required", "internal-app": "light", landing: "light", "single-page": "light",
    blog: "light", ecommerce: "required", "repository-catalog": "required",
  },
  prd: {
    saas: "required", "internal-app": "required", landing: "required", "single-page": "required",
    blog: "required", ecommerce: "required", "repository-catalog": "required",
  },
  "monetization-check": {
    saas: "required", "internal-app": "skip", landing: "skip", "single-page": "skip",
    blog: "skip", ecommerce: "required", "repository-catalog": "optional",
  },
  market: {
    saas: "required", "internal-app": "replaced:internal-stakeholder-map",
    landing: "light", "single-page": "light", blog: "light",
    ecommerce: "required", "repository-catalog": "required",
  },
  design: {
    saas: "required", "internal-app": "required", landing: "required", "single-page": "required",
    blog: "required", ecommerce: "required", "repository-catalog": "required",
  },
  spec: {
    saas: "required", "internal-app": "required", landing: "light", "single-page": "light",
    blog: "light", ecommerce: "required", "repository-catalog": "required",
  },
  seo: {
    saas: "optional", "internal-app": "skip", landing: "required", "single-page": "optional",
    blog: "required", ecommerce: "required", "repository-catalog": "required",
  },
  "content-model": {
    saas: "optional", "internal-app": "optional", landing: "skip", "single-page": "skip",
    blog: "required", ecommerce: "required", "repository-catalog": "required",
  },
};

export function gatePolicy(gate, projectType) {
  const row = GATE_MATRIX[gate];
  if (!row) return "optional";
  return row[projectType] || row.saas || "optional";
}

export function shouldSkipGate(gate, projectType = null) {
  const pt = projectType || getPhaseState().project_type || "saas";
  return gatePolicy(gate, pt) === "skip";
}

function ensureDir(p) {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function getPhaseState() {
  if (!existsSync(STATE_PATH)) {
    return { ...DEFAULT_STATE, track: currentTrack(ROOT) };
  }
  try {
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return { ...DEFAULT_STATE, ...raw };
  } catch (err) {
    throw new Error(`.harness/phase-state.json corrompido: ${err.message}`);
  }
}

export function setPhaseState(patch) {
  const cur = getPhaseState();
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  if (next.activePhase) next.activePhase = String(next.activePhase).padStart(2, "0");
  if (Array.isArray(next.completedPhases)) {
    next.completedPhases = [
      ...new Set(next.completedPhases.map((p) => String(p).padStart(2, "0"))),
    ].sort();
  }
  ensureDir(STATE_PATH);
  writeFileSync(STATE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

// Fallback: descobre fase ativa pela existência/conteúdo dos docs.
// Usado apenas se phase-state.json estiver vazio/ausente.
export function detectActivePhase(root = ROOT) {
  let detected = null;
  for (const [n, slug] of PHASE_FILES) {
    const p = resolve(root, "docs", `${slug}.md`);
    if (existsSync(p) && statSync(p).size > 200) detected = n;
  }
  return detected;
}

export function isPhaseActive(phaseNumber) {
  const s = getPhaseState();
  return s.activePhase === String(phaseNumber).padStart(2, "0");
}

export function isPhaseCompleted(phaseNumber) {
  const s = getPhaseState();
  return (s.completedPhases || []).includes(String(phaseNumber).padStart(2, "0"));
}

export function listPhasesForCurrentTrack() {
  return phasesForTrack(getPhaseState().track || currentTrack(ROOT));
}

export function validate() {
  const s = getPhaseState();
  const errors = [];
  if (s.activePhase && !/^\d{2}$/.test(s.activePhase)) {
    errors.push(`activePhase invalid: ${s.activePhase}`);
  }
  for (const p of s.completedPhases || []) {
    if (!/^\d{2}$/.test(p)) errors.push(`completedPhases entry invalid: ${p}`);
  }
  if (s.project_type && !PROJECT_TYPES.includes(s.project_type)) {
    errors.push(`project_type invalid: ${s.project_type}`);
  }
  for (const g of s.gates_skipped || []) {
    if (!g || typeof g !== "object" || !g.gate) errors.push(`gates_skipped entry invalid`);
  }
  const trackPhases = phasesForTrack(s.track || "standard");
  if (s.activePhase && !trackPhases.includes(s.activePhase)) {
    errors.push(`activePhase ${s.activePhase} not in track ${s.track}`);
  }
  return errors;
}

// CLI gate
const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("phase-state.mjs");

if (invokedDirectly) {
  const cmd = process.argv[2];
  const args = process.argv.slice(3);

  function parseFlags() {
    const out = {};
    for (const a of args) {
      const m = a.match(/^--([\w-]+)(?:=(.*))?$/);
      if (m) out[m[1]] = m[2] ?? true;
    }
    return out;
  }

  switch (cmd) {
    case "get": {
      const s = getPhaseState();
      const field = args[0];
      if (field) {
        const v = s[field];
        console.log(typeof v === "object" ? JSON.stringify(v, null, 2) : String(v));
      } else {
        console.log(JSON.stringify(s, null, 2));
      }
      break;
    }
    case "set": {
      const flags = parseFlags();
      const patch = {};
      if (flags.active) patch.activePhase = flags.active;
      if (flags.complete) {
        const cur = getPhaseState();
        patch.completedPhases = [...(cur.completedPhases || []), flags.complete];
      }
      if (flags.track) patch.track = flags.track;
      if (flags.snapshot) patch.lastSnapshotHash = flags.snapshot;
      if (flags["project-type"]) {
        const pt = flags["project-type"];
        if (!PROJECT_TYPES.includes(pt)) {
          console.error(`project_type inválido: ${pt}. Aceitos: ${PROJECT_TYPES.join(", ")}`);
          process.exit(2);
        }
        patch.project_type = pt;
      }
      if (flags["skip-gate"]) {
        const cur = getPhaseState();
        const [gate, reason] = String(flags["skip-gate"]).split(":");
        patch.gates_skipped = [
          ...(cur.gates_skipped || []).filter((g) => g.gate !== gate),
          { gate, reason: reason || `project_type=${cur.project_type}` },
        ];
      }
      const next = setPhaseState(patch);
      console.log(JSON.stringify(next, null, 2));
      break;
    }
    case "gate-policy": {
      const gate = args[0];
      const pt = args[1] || getPhaseState().project_type || "saas";
      if (!gate) {
        console.error("uso: phase-state.mjs gate-policy <gate> [project_type]");
        process.exit(2);
      }
      console.log(gatePolicy(gate, pt));
      break;
    }
    case "detect": {
      const detected = detectActivePhase();
      if (!detected) {
        console.error("nenhuma fase detectada (docs ausentes ou apenas placeholders)");
        process.exit(1);
      }
      const next = setPhaseState({ activePhase: detected });
      console.log(JSON.stringify(next, null, 2));
      break;
    }
    case "validate": {
      const errs = validate();
      if (errs.length === 0) {
        console.log("phase-state OK");
        process.exit(0);
      }
      for (const e of errs) console.error(`  ✗ ${e}`);
      process.exit(1);
    }
    default:
      console.error(
        "uso: phase-state.mjs <get|set|detect|validate|gate-policy> [--active=NN] [--complete=NN] [--track=...] [--snapshot=hash] [--project-type=...] [--skip-gate=name:reason]"
      );
      process.exit(2);
  }
}
