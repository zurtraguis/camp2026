#!/usr/bin/env node
// resolve-model.mjs — Resolve um agent → tier → model concreto via .harness/agent-tiers.json.
//
// Permite que o harness rode em qualquer LLM/IDE sem hard-coding de model names.
//
// Uso (CLI):
//   node scripts/resolve-model.mjs <agent>            # imprime model do provider default
//   node scripts/resolve-model.mjs <agent> --provider=openai
//   node scripts/resolve-model.mjs --list             # lista agents e tiers
//
// Env:
//   HARNESS_PROVIDER=openai|claude|google|xai|local|auto
//
// Uso (import):
//   import { resolveModel, tierForAgent } from "./resolve-model.mjs";

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TIERS_PATH = resolve(ROOT, ".harness", "agent-tiers.json");

export function loadTiers() {
  if (!existsSync(TIERS_PATH)) {
    throw new Error(`.harness/agent-tiers.json ausente`);
  }
  return JSON.parse(readFileSync(TIERS_PATH, "utf8"));
}

function readProjectTypeFromState() {
  try {
    const p = resolve(ROOT, ".harness", "phase-state.json");
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")).project_type || null;
  } catch {
    return null;
  }
}

export function tierForAgent(agent, projectType) {
  const cfg = loadTiers();
  const pt = projectType || readProjectTypeFromState();
  const override = pt && cfg.agentsByProjectType && cfg.agentsByProjectType[pt];
  if (override && override[agent]) return override[agent];
  return cfg.agents[agent] || null;
}

export function resolveModel(agent, providerOverride, projectTypeOverride) {
  const cfg = loadTiers();
  const provider =
    providerOverride ||
    process.env.HARNESS_PROVIDER ||
    cfg.defaultProvider ||
    "claude";
  const tier = tierForAgent(agent, projectTypeOverride);
  if (!tier) throw new Error(`agent desconhecido: ${agent}`);
  const tierMap = cfg.tiers[tier];
  if (!tierMap) throw new Error(`tier desconhecido: ${tier}`);
  if (provider === "auto") {
    // Pick first provider with env key set
    for (const [name, meta] of Object.entries(cfg.providers || {})) {
      if (!meta.envKey || process.env[meta.envKey]) return { agent, tier, provider: name, model: tierMap[name] };
    }
  }
  const model = tierMap[provider];
  if (!model) throw new Error(`provider ${provider} não suporta tier ${tier}`);
  return { agent, tier, provider, model };
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("resolve-model.mjs");

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    const cfg = loadTiers();
    for (const [a, t] of Object.entries(cfg.agents)) {
      console.log(`${a.padEnd(20)} → ${t}`);
    }
    process.exit(0);
  }
  const flagArg = (name) => {
    const f = args.find((a) => a.startsWith(`--${name}=`));
    return f ? f.split("=")[1] : undefined;
  };
  const agent = args.find((a) => !a.startsWith("--"));
  const provider = flagArg("provider");
  const projectType = flagArg("project-type");
  if (!agent) {
    console.error("uso: resolve-model.mjs <agent> [--provider=...] [--project-type=...]");
    process.exit(2);
  }
  try {
    const r = resolveModel(agent, provider, projectType);
    if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else console.log(r.model);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
