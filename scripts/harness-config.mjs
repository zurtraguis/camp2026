#!/usr/bin/env node
// harness-config.mjs — Single source of truth para .harness-config.json
//
// Uso:
//   node scripts/harness-config.mjs init                    # cria default se ausente
//   node scripts/harness-config.mjs get [key]               # imprime config (ou key dot-path)
//   node scripts/harness-config.mjs set <key> <value>       # set dot-path
//   node scripts/harness-config.mjs version                 # versão atual
//
// Schema é a única referência aceita por hooks, CLI, status, telemetria, snapshots.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const CONFIG_PATH = resolve(ROOT, ".harness-config.json");

const HARNESS_VERSION = "3.0.0";

const DEFAULT_CONFIG = {
  version: HARNESS_VERSION,
  stack: "nextjs",
  track: "standard",
  telemetry: { enabled: true, remote: null },
  snapshots: { enabled: true, auto_on_phase_close: true },
  created_at: null,
  last_phase_completed: null,
};

function load() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    throw new Error(`.harness-config.json corrompido: ${err.message}`);
  }
}

function save(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

function init({ stack, track } = {}) {
  if (existsSync(CONFIG_PATH)) {
    const cfg = load();
    // upgrade campos faltantes (forward-compat)
    const merged = { ...DEFAULT_CONFIG, ...cfg };
    if (stack) merged.stack = stack;
    if (track) merged.track = track;
    save(merged);
    return merged;
  }
  const cfg = {
    ...DEFAULT_CONFIG,
    stack: stack || DEFAULT_CONFIG.stack,
    track: track || DEFAULT_CONFIG.track,
    created_at: new Date().toISOString(),
  };
  save(cfg);
  return cfg;
}

function getPath(obj, dotPath) {
  if (!dotPath) return obj;
  return dotPath.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function setPath(obj, dotPath, value) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function coerce(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
  return raw;
}

export { load, save, init, DEFAULT_CONFIG, HARNESS_VERSION };

// CLI: só executa se invocado diretamente (não ao ser importado por outro módulo)
const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("harness-config.mjs");

if (invokedDirectly) {
  const cmd = process.argv[2];
  const args = process.argv.slice(3);

  switch (cmd) {
    case "init": {
      const opts = {};
      for (const a of args) {
        const m = a.match(/^--(\w+)=(.+)$/);
        if (m) opts[m[1]] = m[2];
      }
      const cfg = init(opts);
      console.log(JSON.stringify(cfg, null, 2));
      break;
    }
    case "get": {
      const cfg = load();
      if (!cfg) {
        console.error("config ausente; rode `node scripts/harness-config.mjs init`");
        process.exit(1);
      }
      const result = getPath(cfg, args[0]);
      console.log(
        typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)
      );
      break;
    }
    case "set": {
      let cfg = load();
      if (!cfg) cfg = init();
      if (args.length < 2) {
        console.error("uso: set <key> <value>");
        process.exit(2);
      }
      setPath(cfg, args[0], coerce(args[1]));
      save(cfg);
      console.log(JSON.stringify(cfg, null, 2));
      break;
    }
    case "version":
      console.log(HARNESS_VERSION);
      break;
    default:
      console.error("uso: harness-config.mjs <init|get|set|version> [args]");
      process.exit(2);
  }
}
