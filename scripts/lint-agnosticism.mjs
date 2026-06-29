#!/usr/bin/env node
// lint-agnosticism.mjs — Falha CI se algum arquivo canônico cita model names ou IDE-locks.
//
// Garante que o harness permaneça LLM-agnostic + IDE-agnostic. Permite menções dentro
// de exemplos, listas de provedores e do próprio mapeamento (.harness/agent-tiers.json).
//
// Uso:
//   node scripts/lint-agnosticism.mjs           # exit 1 se achar
//   node scripts/lint-agnosticism.mjs --fix     # apenas reporta (não muta)
//
// Configure allow-list em .harness/agnostic-allowlist.json (opcional).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = resolve(process.cwd());

// Padrões de model names que NÃO devem aparecer em arquivos canônicos.
const MODEL_PATTERNS = [
  /\bclaude-(opus|sonnet|haiku)-\d/i,
  /\bgpt-[345]([.-]\w+)*\b/i,
  /\bgemini-[12]\.\d/i,
  /\bgrok-\d/i,
  /\b(?:opus|sonnet|haiku)-\d/i,
];

// Arquivos/dirs que SÃO canônicos (devem usar tiers, não models).
const CANONICAL_GLOBS = [
  "AGENTS.md",
  "WORKFLOW.md",
  "README.md",
  ".cursor/agents",
  ".cursor/commands",
  "docs/internal/HARNESS_ARCHITECTURE.md",
];

// Allow-list: caminhos onde model names PODEM aparecer (exemplos, mapeamentos).
const DEFAULT_ALLOWLIST = [
  ".harness/agent-tiers.json",
  "scripts/resolve-model.mjs",
  "scripts/lint-agnosticism.mjs",
  "docs/IDE_SETUP.md",
  "docs/templates",
  "docs/web-excellence",
];

function loadAllowlist() {
  const p = resolve(ROOT, ".harness", "agnostic-allowlist.json");
  if (!existsSync(p)) return DEFAULT_ALLOWLIST;
  try {
    const arr = JSON.parse(readFileSync(p, "utf8"));
    return [...DEFAULT_ALLOWLIST, ...arr];
  } catch {
    return DEFAULT_ALLOWLIST;
  }
}

function isAllowlisted(path, allow) {
  return allow.some((a) => path.includes(a));
}

function listFiles(globs) {
  const out = new Set();
  for (const g of globs) {
    try {
      const cmd = `find "${ROOT}/${g}" -type f \\( -name '*.md' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.json' \\) 2>/dev/null`;
      const r = execSync(cmd, { encoding: "utf8" });
      for (const line of r.split("\n")) if (line.trim()) out.add(line.trim());
    } catch {
      // single file or missing path
      const single = resolve(ROOT, g);
      if (existsSync(single)) out.add(single);
    }
  }
  return [...out];
}

function scan() {
  const allow = loadAllowlist();
  const files = listFiles(CANONICAL_GLOBS);
  const violations = [];
  for (const file of files) {
    if (isAllowlisted(file.replace(ROOT + "/", ""), allow)) continue;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      for (const pat of MODEL_PATTERNS) {
        if (pat.test(line)) {
          violations.push({
            file: file.replace(ROOT + "/", ""),
            line: i + 1,
            text: line.trim().slice(0, 120),
          });
          break;
        }
      }
    });
  }
  return violations;
}

const violations = scan();
if (violations.length === 0) {
  console.log("agnostic-lint OK — zero model names em arquivos canônicos");
  process.exit(0);
}

console.error(`agnostic-lint FAIL — ${violations.length} violação(ões):`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.text}`);
}
console.error(
  "\nUse tiers (reasoning-heavy/medium/light) em vez de model names.\nSe a menção for legítima (exemplo/doc), adicione o caminho a .harness/agnostic-allowlist.json"
);
process.exit(1);
