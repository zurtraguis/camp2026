#!/usr/bin/env node
// .harness/hooks/enforce-skills.mjs — Bloqueia submit se /comando referenciado não tem skill.
//
// Lê o prompt do usuário do stdin (ou env HARNESS_PROMPT) e procura por /comando.
// Se o comando existe em .cursor/commands/<cmd>.md mas a skill associada não existe
// em .cursor/skills/<skill>/SKILL.md, bloqueia.
//
// Cada arquivo .cursor/commands/<cmd>.md pode declarar `skill: <skill-name>` no front-matter.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

function readPrompt() {
  if (process.env.HARNESS_PROMPT) return process.env.HARNESS_PROMPT;
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function extractSkillRef(commandFile) {
  if (!existsSync(commandFile)) return null;
  const content = readFileSync(commandFile, "utf8");
  const m = content.match(/^skill:\s*([a-z0-9-_]+)/im);
  return m ? m[1] : null;
}

function skillExists(slug) {
  const candidates = [
    resolve(ROOT, ".cursor", "skills", slug, "SKILL.md"),
    resolve(ROOT, ".cursor", "skills-web-excellence", slug, "SKILL.md"),
    resolve(ROOT, ".agents", "skills", slug, "SKILL.md"),
  ];
  return candidates.some((c) => existsSync(c));
}

const prompt = readPrompt();
const cmdMatches = [...prompt.matchAll(/\/([a-z][a-z0-9-]+)/g)].map((m) => m[1]);

const missing = [];
for (const cmd of new Set(cmdMatches)) {
  const cmdFile = resolve(ROOT, ".cursor", "commands", `${cmd}.md`);
  if (!existsSync(cmdFile)) continue; // não é nosso comando
  const skill = extractSkillRef(cmdFile);
  if (skill && !skillExists(skill)) missing.push({ cmd, skill });
}

if (missing.length === 0) process.exit(0);

console.error("[harness] BLOQUEIO — comandos sem skill instalada:");
for (const { cmd, skill } of missing) {
  console.error(`  /${cmd} requer skill '${skill}' (não encontrada)`);
}
console.error("Resolva instalando a skill ou removendo o comando do prompt.");
process.exit(1);
