#!/usr/bin/env node
// audit-skills.mjs — Inventário canônico de skills do harness.
// Lista skills reais vs. symlinks em .cursor/skills, .agents/skills,
// .claude/skills e .cursor/skills-web-excellence, e detecta duplicações.
// Saída: tabela legível em stdout + grava docs/internal/SKILLS_AUDIT.md.
// Exit 1 se houver duplicações entre .cursor/skills e .agents/skills.

import { readdirSync, statSync, lstatSync, readlinkSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LOCATIONS = [
  { id: "cursor-vibe", path: ".cursor/skills", style: "skill-dir" },
  { id: "cursor-web-excellence", path: ".cursor/skills-web-excellence", style: "flat-md" },
  { id: "agents", path: ".agents/skills", style: "skill-dir" },
  { id: "claude", path: ".claude/skills", style: "symlink-mirror" },
];

function walkMd(dir, base, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walkMd(p, base, out);
    else if (name.endsWith(".md") && name !== "SKILLS_INDEX.md" && name !== "README.md") {
      const id = p.slice(base.length + 1).replace(/\.md$/, "");
      out.push({ id, path: p, isSymlink: false, target: null, hasSkillFile: true });
    }
  }
  return out;
}

function scan(dir, style) {
  if (!existsSync(dir)) return [];
  if (style === "flat-md") {
    return walkMd(dir, dir).sort((a, b) => a.id.localeCompare(b.id));
  }
  const entries = readdirSync(dir);
  const out = [];
  for (const name of entries) {
    if (name.startsWith(".") || name === "README.md") continue;
    const p = join(dir, name);
    let lst;
    try { lst = lstatSync(p); } catch { continue; }
    const isSymlink = lst.isSymbolicLink();
    const target = isSymlink ? readlinkSync(p) : null;
    let st;
    try { st = statSync(p); } catch { continue; }
    if (!st.isDirectory()) continue;
    const skillFile = join(p, "SKILL.md");
    out.push({
      id: name,
      path: p,
      isSymlink,
      target,
      hasSkillFile: existsSync(skillFile),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

const inventory = {};
for (const loc of LOCATIONS) {
  inventory[loc.id] = scan(loc.path, loc.style);
}

const cursorVibeMap = new Map(inventory["cursor-vibe"].map(s => [s.id, s]));
const agents = new Set(inventory.agents.map(s => s.id));
// A real duplicate = same id present in both AND .cursor/skills/<id> is NOT a
// symlink already pointing into .agents/skills (those are intentional aliases).
const dupes = [...cursorVibeMap.keys()]
  .filter(id => {
    if (!agents.has(id)) return false;
    const entry = cursorVibeMap.get(id);
    if (entry.isSymlink && entry.target && entry.target.includes(".agents/skills")) return false;
    return true;
  })
  .sort();

const lines = [];
lines.push("# Skills Audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Counts");
lines.push("");
lines.push("| Location | Real | Symlinks | With SKILL.md |");
lines.push("| --- | ---: | ---: | ---: |");
for (const loc of LOCATIONS) {
  const items = inventory[loc.id];
  const real = items.filter(i => !i.isSymlink).length;
  const sym = items.filter(i => i.isSymlink).length;
  const hasSkill = items.filter(i => i.hasSkillFile).length;
  lines.push(`| \`${loc.path}\` | ${real} | ${sym} | ${hasSkill} |`);
}

lines.push("");
lines.push("## Duplicates between .cursor/skills and .agents/skills");
lines.push("");
if (dupes.length === 0) {
  lines.push("None. Inventory clean.");
} else {
  lines.push(`${dupes.length} duplicate skill id(s) detected.`);
  lines.push("");
  lines.push("| Skill | .cursor/skills | .agents/skills | Canonical |");
  lines.push("| --- | --- | --- | --- |");
  for (const d of dupes) {
    lines.push(`| \`${d}\` | present | present | \`.agents/skills/\` (external, kept up-to-date via \`npx skills add\`) |`);
  }
}

lines.push("");
lines.push("## .claude/skills symlink targets");
lines.push("");
lines.push("| Symlink | Target |");
lines.push("| --- | --- |");
for (const item of inventory.claude) {
  lines.push(`| \`${item.id}\` | \`${item.target ?? "(not a symlink)"}\` |`);
}

lines.push("");
lines.push("## Full skill list per location");
lines.push("");
for (const loc of LOCATIONS) {
  lines.push(`### ${loc.path}`);
  lines.push("");
  const items = inventory[loc.id];
  if (items.length === 0) {
    lines.push("(empty)");
    lines.push("");
    continue;
  }
  for (const item of items) {
    const badge = item.isSymlink ? `→ ${item.target}` : (item.hasSkillFile ? "" : "(no SKILL.md)");
    lines.push(`- \`${item.id}\` ${badge}`);
  }
  lines.push("");
}

const outDir = join(ROOT, "docs", "internal");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "SKILLS_AUDIT.md");
writeFileSync(outPath, lines.join("\n") + "\n");

// Console summary
console.log("Skills audit");
for (const loc of LOCATIONS) {
  const n = inventory[loc.id].length;
  console.log(`  ${loc.path.padEnd(36)} ${n} entries`);
}
console.log(`  duplicates (cursor↔agents):${" ".repeat(11)} ${dupes.length}`);
console.log(`  report written to:                  ${outPath.replace(ROOT + "/", "")}`);

if (dupes.length > 0) {
  console.error("");
  console.error("ERROR: duplicates detected between .cursor/skills and .agents/skills:");
  for (const d of dupes) console.error(`  - ${d}`);
  console.error("Resolve by removing the .cursor/skills/<dup> copy (canonical source = .agents/skills).");
  process.exit(1);
}
