#!/usr/bin/env node
// .harness/hooks/tdd-loop.mjs — Lembra de rodar testes se houve edits em src/ sem teste.
// Hook não-bloqueante (apenas notifica).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const STATE = resolve(ROOT, ".harness", "cache", "tdd-state.json");

function readJson(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const state = readJson(STATE) || { lastEditTs: 0, lastTestTs: 0 };

if (state.lastEditTs > state.lastTestTs) {
  const minSinceEdit = Math.round((Date.now() - state.lastEditTs) / 60000);
  if (minSinceEdit > 5) {
    console.log(
      "[harness] dica: você editou código fonte há " +
        minSinceEdit +
        " min sem rodar `npm test`. TDD?"
    );
  }
}

process.exit(0);
