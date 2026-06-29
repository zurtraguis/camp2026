#!/usr/bin/env node
// skills-audit.mjs — Cruza skills no disco com S03_SKILLS_INDEX.md.
//
// Detecta:
//   - skills no disco SEM entrada no índice (faltando documentar)
//   - menções no índice SEM skill correspondente no disco (drift)
//
// Uso:
//   node scripts/skills-audit.mjs              # report human
//   node scripts/skills-audit.mjs --json       # JSON estruturado
//   node scripts/skills-audit.mjs --strict     # exit 1 em qualquer divergência

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SKILLS_DIRS = [
  ".cursor/skills",
  ".cursor/skills-web-excellence",
];
const INDEX_PATH = resolve(ROOT, "docs", "S03_SKILLS_INDEX.md");

function listSkillSlugs() {
  const out = new Set();
  for (const dir of SKILLS_DIRS) {
    const full = resolve(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full)) {
      const p = resolve(full, entry);
      if (statSync(p).isDirectory()) {
        const skillFile = resolve(p, "SKILL.md");
        if (existsSync(skillFile)) out.add(entry);
      }
    }
  }
  return [...out].sort();
}

function listIndexedSlugs() {
  if (!existsSync(INDEX_PATH)) return new Set();
  const content = readFileSync(INDEX_PATH, "utf8");
  // Captura ocorrências de `skill-name` em backticks ou em listas
  const slugs = new Set();
  // Padrão: backticks em linhas de tabela e bullets
  const re = /`([a-z0-9][a-z0-9-_]+)`/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const candidate = m[1];
    // Filtra falso-positivos óbvios (curtos, palavras comuns)
    if (candidate.length < 3) continue;
    if (["npm", "yarn", "pnpm", "git", "ci", "cd", "ide", "url", "cli", "tdd", "ai"].includes(candidate)) continue;
    slugs.add(candidate);
  }
  return slugs;
}

function audit() {
  const onDisk = new Set(listSkillSlugs());
  const inIndex = listIndexedSlugs();

  const missingInIndex = [...onDisk].filter((s) => !inIndex.has(s)).sort();
  const orphanInIndex = [...inIndex].filter((s) => !onDisk.has(s) && /^[a-z][a-z0-9-]+[a-z0-9]$/.test(s)).sort();

  return {
    totalOnDisk: onDisk.size,
    totalIndexed: inIndex.size,
    missingInIndex,
    orphanInIndex,
  };
}

const result = audit();
const flags = process.argv.slice(2);
const strict = flags.includes("--strict");
const asJson = flags.includes("--json");

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("━━━ S03 Skills Audit ━━━");
  console.log(`  no disco:      ${result.totalOnDisk}`);
  console.log(`  indexadas:     ${result.totalIndexed}`);
  console.log(
    `  no disco mas SEM entrada no S03: ${result.missingInIndex.length}`
  );
  for (const s of result.missingInIndex) console.log(`    + ${s}`);
  console.log(
    `  no S03 mas SEM skill no disco:    ${result.orphanInIndex.length}`
  );
  for (const s of result.orphanInIndex) console.log(`    - ${s}`);
}

const hasDivergence =
  result.missingInIndex.length > 0 || result.orphanInIndex.length > 0;
process.exit(strict && hasDivergence ? 1 : 0);
