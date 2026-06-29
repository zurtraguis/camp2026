#!/usr/bin/env node
// notice.mjs — Emissor único de mensagens dialógicas, não-invasivas.
//
// Níveis:
//   tip    → info silenciosa, prefixo "·"
//   nudge  → sugestão de 1 linha, prefixo "→"
//   warn   → atenção (não bloqueia), prefixo "⚠"
//   block  → bloqueio com 1 linha de ação, prefixo "✗", exit 1
//
// Rate-limit: mesma mensagem max 1×/hora (cache em .harness/cache/notices.json).
// Env HARNESS_QUIET=1 silencia tudo exceto block. HARNESS_LANG=en alterna idioma.
//
// Uso:
//   node scripts/notice.mjs --level=tip --msg="phase-state pode estar stale"
//   node scripts/notice.mjs --level=block --msg="rode npm install" --code=missing-deps

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(process.cwd());
const CACHE = resolve(ROOT, ".harness", "cache", "notices.json");
const RATE_WINDOW_MS = 60 * 60 * 1000;

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  const m = a.match(/^--([\w-]+)=(.*)$/);
  if (m) flags[m[1]] = m[2];
}

const level = flags.level || "tip";
const msg = flags.msg || "";
const code = flags.code || createHash("sha1").update(msg).digest("hex").slice(0, 8);

const PREFIX = { tip: "·", nudge: "→", warn: "⚠", block: "✗" };
const QUIET = process.env.HARNESS_QUIET === "1";

if (QUIET && level !== "block") process.exit(0);
if (!msg) {
  console.error("uso: notice.mjs --level=<tip|nudge|warn|block> --msg=...");
  process.exit(2);
}

function ensureDir(p) {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function readCache() {
  if (!existsSync(CACHE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(c) {
  ensureDir(CACHE);
  writeFileSync(CACHE, JSON.stringify(c, null, 2), "utf8");
}

const cache = readCache();
const last = cache[code];
const now = Date.now();
if (last && now - last < RATE_WINDOW_MS && level !== "block") {
  // Suprimido por rate-limit
  process.exit(0);
}
cache[code] = now;
writeCache(cache);

const out = `${PREFIX[level] || "·"} ${msg}`;
if (level === "block") {
  console.error(out);
  process.exit(1);
}
console.log(out);
