#!/usr/bin/env node
// Verify that every .cursor/commands/**/*.md (except indices) has YAML
// frontmatter with a non-empty `skills:` array, and that every skill
// referenced exists in .cursor/skills/<name>/SKILL.md or
// .cursor/skills-web-excellence/<name>.md.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, dirname, relative, sep } from "node:path";

const COMMANDS_DIR = ".cursor/commands";
const SKILLS_DIRS = [
  ".cursor/skills",
  ".cursor/skills-web-excellence",
  ".agents/skills",
  ".claude/skills",
];
const SKIP_FILES = new Set(["COMMANDS_INDEX.md", "README.md"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (entry.endsWith(".md")) out.push(p);
  }
  return out;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = text.slice(3, end).replace(/^\n/, "");
  const lines = fm.split("\n");
  const skills = [];
  let inSkills = false;
  let model = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (/^skills:\s*$/.test(line)) {
      inSkills = true;
      continue;
    }
    const mm = line.match(/^model:\s*(\S+)\s*$/);
    if (mm) {
      model = mm[1];
      inSkills = false;
      continue;
    }
    if (inSkills) {
      const m = line.match(/^\s*-\s+(.+?)\s*$/);
      if (m) {
        skills.push(m[1]);
        continue;
      }
      if (/^\S/.test(line)) inSkills = false;
    }
  }
  return { skills, model };
}

const VALID_MODELS = new Set(["opus", "sonnet", "haiku", "inherit"]);

const skillCache = new Set();
for (const base of SKILLS_DIRS) {
  if (!existsSync(base)) continue;
  for (const f of walk(base)) {
    if (basename(f) === "SKILL.md") {
      // .cursor/skills/<name>/SKILL.md → <name> (cross-platform: usa path, não "/")
      skillCache.add(basename(dirname(f)));
    } else if (f.endsWith(".md") && !basename(f).startsWith("SKILLS_INDEX")) {
      const rel = relative(base, f).replace(/\.md$/, "").split(sep).join("/");
      skillCache.add(rel);
      skillCache.add(basename(f, ".md"));
    }
  }
}

function skillExists(name) {
  return skillCache.has(name);
}

function main() {
  if (!existsSync(COMMANDS_DIR)) {
    console.error(`Missing ${COMMANDS_DIR}`);
    process.exit(2);
  }
  const files = walk(COMMANDS_DIR).filter(
    (f) => !SKIP_FILES.has(basename(f)),
  );
  const errors = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) {
      errors.push(`${f}: missing YAML frontmatter`);
      continue;
    }
    if (!fm.skills || fm.skills.length === 0) {
      errors.push(`${f}: empty or missing 'skills:' list`);
      continue;
    }
    for (const s of fm.skills) {
      if (!skillExists(s)) {
        errors.push(`${f}: skill '${s}' not found in .cursor/skills/** or .cursor/skills-web-excellence/**`);
      }
    }
    if (fm.model && !VALID_MODELS.has(fm.model)) {
      errors.push(`${f}: invalid 'model: ${fm.model}' (allowed: ${[...VALID_MODELS].join(", ")})`);
    }
  }

  if (errors.length > 0) {
    console.error(`verify-command-skills: ${errors.length} issue(s)`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`verify-command-skills OK — ${files.length} command files validated`);
}

main();
