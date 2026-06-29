#!/usr/bin/env node
// harness-event.mjs — Append-only logger de eventos do harness.
//
// Uso: node scripts/harness-event.mjs <event_type> <name> [json_meta]
//
//   event_type:  hook | command | gate | phase | snapshot | error
//   name:        identificador específico (ex: "enforce-skills", "/kickoff", "06_SPECIFICATION")
//   json_meta:   string JSON opcional com campos extras
//
// Falha do logger nunca quebra o caller (exit 0 mesmo em erro).
// Telemetria respeita .harness-config.json: se telemetry.enabled=false, vira no-op.
// Rotação automática: arquivos > 10MB rotacionam para events-<ts>.jsonl.gz.

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { writeFileSync, unlinkSync } from "node:fs";

const ROOT = resolve(process.cwd());
const DIR = resolve(ROOT, ".harness");
const FILE = resolve(DIR, "events.jsonl");
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function isEnabled() {
  const cfgPath = resolve(ROOT, ".harness-config.json");
  if (!existsSync(cfgPath)) return true; // default opt-in até existir config
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    return cfg.telemetry?.enabled !== false;
  } catch {
    return true;
  }
}

function rotateIfNeeded() {
  if (!existsSync(FILE)) return;
  try {
    const sz = statSync(FILE).size;
    if (sz < MAX_BYTES) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const gzPath = resolve(DIR, `events-${ts}.jsonl.gz`);
    const data = readFileSync(FILE);
    writeFileSync(gzPath, gzipSync(data));
    unlinkSync(FILE);
  } catch {
    // ignora — telemetria nunca quebra o caller
  }
}

function main() {
  if (!isEnabled()) process.exit(0);

  const event = process.argv[2];
  const name = process.argv[3];
  if (!event || !name) {
    // mantém silêncio: hooks chamam sem args às vezes em corner cases
    process.exit(0);
  }

  let meta = {};
  if (process.argv[4]) {
    try {
      meta = JSON.parse(process.argv[4]);
    } catch {
      meta = { raw: process.argv[4] };
    }
  }

  try {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    rotateIfNeeded();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      name,
      ...meta,
    });
    appendFileSync(FILE, line + "\n", "utf8");
  } catch {
    // nunca quebra
  }
  process.exit(0);
}

main();
