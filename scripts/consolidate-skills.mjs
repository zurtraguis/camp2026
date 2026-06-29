#!/usr/bin/env node
// consolidate-skills.mjs — Idempotente.
// 1. Substitui as 13 duplicações em .cursor/skills/<dup>/ por symlinks para
//    .agents/skills/<dup>/ (canonical = source mantida via `npx skills add`).
// 2. Garante que .claude/skills/<name> tenha symlink para cada skill em
//    .cursor/skills/<name>/ (expõe skills VibeCoding ao Claude Code).
// Não toca .cursor/skills-web-excellence (modelo flat-md, mantém-se).

import { readdirSync, statSync, lstatSync, readlinkSync, existsSync, symlinkSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

const CURSOR = ".cursor/skills";
const AGENTS = ".agents/skills";
const CLAUDE = ".claude/skills";

function isSymlinkTo(path, expectedTarget) {
  try {
    const lst = lstatSync(path);
    if (!lst.isSymbolicLink()) return false;
    return readlinkSync(path) === expectedTarget;
  } catch { return false; }
}

function listDirs(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter(name => {
    if (name.startsWith(".") || name === "README.md") return false;
    try { return statSync(join(base, name)).isDirectory(); } catch { return false; }
  });
}

const cursorEntries = listDirs(CURSOR);
const agentEntries = new Set(listDirs(AGENTS));
const dupes = cursorEntries.filter(n => agentEntries.has(n)).sort();

let changed = 0;

console.log(`Step 1: ${dupes.length} duplicate(s) → convert .cursor/skills/<dup>/ to symlinks`);
for (const name of dupes) {
  const cursorPath = join(CURSOR, name);
  const target = `../../${AGENTS}/${name}`;
  if (isSymlinkTo(cursorPath, target)) {
    console.log(`  ok    ${name} (already symlink)`);
    continue;
  }
  const lst = lstatSync(cursorPath);
  if (lst.isSymbolicLink()) {
    unlinkSync(cursorPath);
  } else {
    rmSync(cursorPath, { recursive: true, force: true });
  }
  symlinkSync(target, cursorPath);
  console.log(`  link  ${name} → ${target}`);
  changed++;
}

console.log("");
console.log(`Step 2: expose .cursor/skills/* in .claude/skills/ (symlinks)`);
const finalCursor = listDirs(CURSOR);
let added = 0;
for (const name of finalCursor) {
  const claudePath = join(CLAUDE, name);
  // Skip if .claude already has a working entry (could point to agents for dupes).
  if (existsSync(claudePath)) continue;
  const target = `../../${CURSOR}/${name}`;
  symlinkSync(target, claudePath);
  console.log(`  add   ${name} → ${target}`);
  added++;
}

console.log("");
console.log(`Done. ${changed} duplicate(s) consolidated, ${added} new .claude/skills entries.`);
