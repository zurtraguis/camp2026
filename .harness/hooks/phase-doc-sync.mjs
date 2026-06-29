#!/usr/bin/env node
// .harness/hooks/phase-doc-sync.mjs — Atualiza phase-state após edits em docs.
// Hook não-bloqueante.

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  getPhaseState,
  setPhaseState,
  detectActivePhase,
} from "../../scripts/phase-state.mjs";

const ROOT = resolve(process.cwd());
const editedFile = process.argv[2] || process.env.HARNESS_EDITED_FILE;

if (!editedFile || !editedFile.includes("/docs/")) {
  process.exit(0);
}

// Re-detecta fase ativa (a fase mais alta com doc > 200 bytes)
const detected = detectActivePhase();
const cur = getPhaseState();

if (detected && detected !== cur.activePhase) {
  setPhaseState({ activePhase: detected });
  console.log(`[harness] phase-state → activePhase=${detected}`);
}

process.exit(0);
