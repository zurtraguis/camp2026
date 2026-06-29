#!/usr/bin/env node
// harness-events.mjs — Agrega e sumariza eventos de telemetria.
//
// Uso:
//   node scripts/harness-events.mjs                  # tabela humana
//   node scripts/harness-events.mjs --json           # JSON estruturado
//   node scripts/harness-events.mjs --tail 20        # últimos N eventos crus
//   node scripts/harness-events.mjs --since 2025-01-01

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const DIR = resolve(ROOT, ".harness");
const FILE = resolve(DIR, "events.jsonl");

const args = process.argv.slice(2);
const FORMAT = args.includes("--json") ? "json" : "human";
const TAIL = (() => {
  const i = args.indexOf("--tail");
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : null;
})();
const SINCE = (() => {
  const i = args.indexOf("--since");
  return i >= 0 && args[i + 1] ? new Date(args[i + 1]) : null;
})();

function readEvents() {
  if (!existsSync(FILE)) return [];
  const lines = readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean);
  return lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function summarize(events) {
  const byEvent = {};
  const byName = {};
  const blockers = [];
  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
    const k = `${e.event}/${e.name}`;
    byName[k] = (byName[k] || 0) + 1;
    if (e.blocked) blockers.push(e);
  }
  return {
    total: events.length,
    byEvent,
    topNames: Object.entries(byName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    blockers: blockers.slice(-10),
    first: events[0]?.ts,
    last: events[events.length - 1]?.ts,
  };
}

let events = readEvents();
if (SINCE) events = events.filter((e) => new Date(e.ts) >= SINCE);

if (TAIL != null) {
  const tail = events.slice(-TAIL);
  if (FORMAT === "json") console.log(JSON.stringify(tail, null, 2));
  else for (const e of tail) console.log(JSON.stringify(e));
  process.exit(0);
}

const sum = summarize(events);

if (FORMAT === "json") {
  console.log(JSON.stringify(sum, null, 2));
  process.exit(0);
}

console.log("━━━ Harness Events ━━━");
if (!sum.total) {
  console.log("  nenhum evento registrado.");
  console.log("  (verifique se telemetria está habilitada em .harness-config.json)");
  process.exit(0);
}
console.log(`  total:       ${sum.total}`);
console.log(`  intervalo:   ${sum.first} → ${sum.last}`);
console.log("  por tipo:");
for (const [k, v] of Object.entries(sum.byEvent)) {
  console.log(`    ${k.padEnd(12)} ${v}`);
}
console.log("  top 10 nomes:");
for (const [k, v] of sum.topNames) {
  console.log(`    ${String(v).padStart(4)}  ${k}`);
}
if (sum.blockers.length) {
  console.log(`  últimos ${sum.blockers.length} bloqueios:`);
  for (const b of sum.blockers) {
    console.log(`    ${b.ts}  ${b.event}/${b.name}  ${b.reason || ""}`);
  }
}
