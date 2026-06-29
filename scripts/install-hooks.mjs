#!/usr/bin/env node
// install-hooks.mjs — Gera config de hooks para a IDE alvo a partir do manifest neutro.
//
// Uso:
//   node scripts/install-hooks.mjs --ide=cursor
//   node scripts/install-hooks.mjs --ide=claude-code --dry-run
//   node scripts/install-hooks.mjs --ide=cline
//
// IDEs suportadas: cursor, claude-code, cline, continue, aider, vscode, cli

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(process.cwd());
const MANIFEST = resolve(ROOT, ".harness", "hooks", "manifest.json");

const args = process.argv.slice(2);
const ideArg = args.find((a) => a.startsWith("--ide=")) || "--ide=cli";
const ide = ideArg.split("=")[1];
const dryRun = args.includes("--dry-run");

if (!existsSync(MANIFEST)) {
  console.error("ausente: " + MANIFEST);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

function ensureDir(p) {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function writeOrLog(path, content) {
  if (dryRun) {
    console.log("---", path, "---");
    console.log(content);
    return;
  }
  ensureDir(path);
  writeFileSync(path, content, "utf8");
  console.log("escrito: " + path.replace(ROOT + "/", ""));
}

// Adapters por IDE -----------------------------------------------------------

function adapterCursor() {
  // Cursor usa .cursor/hooks.json + scripts em .cursor/hooks/
  const cfg = {
    hooks: manifest.hooks.map((h) => ({
      event: h.trigger,
      command: `node ${h.entry}`,
      blocking: !!h.blocking,
    })),
  };
  writeOrLog(resolve(ROOT, ".cursor", "hooks.json"), JSON.stringify(cfg, null, 2));
  // Shims em shell para compatibilidade com instalações antigas
  for (const h of manifest.hooks) {
    const shim = `#!/usr/bin/env bash\n# Shim Cursor → harness canonical hook\nexec node "$(dirname "$0")/../../${h.entry}" "$@"\n`;
    writeOrLog(resolve(ROOT, ".cursor", "hooks", `${h.name}.sh`), shim);
  }
}

function adapterClaudeCode() {
  // Claude Code usa .claude/settings.json (hooks block)
  const triggerMap = {
    beforeSubmit: "beforeSubmitPrompt",
    afterFileEdit: "afterFileEdit",
    onStop: "Stop",
    onSubagentStart: "subagentStart",
  };
  const settings = {
    hooks: {},
  };
  for (const h of manifest.hooks) {
    const ev = triggerMap[h.trigger] || h.trigger;
    settings.hooks[ev] = settings.hooks[ev] || [];
    settings.hooks[ev].push({
      command: `node ${h.entry}`,
      blocking: !!h.blocking,
    });
  }
  writeOrLog(
    resolve(ROOT, ".claude", "settings.json"),
    JSON.stringify(settings, null, 2)
  );
}

function adapterCline() {
  const cfg = manifest.hooks.map((h) => ({
    event: h.trigger,
    run: `node ${h.entry}`,
    blocking: !!h.blocking,
  }));
  writeOrLog(resolve(ROOT, ".cline", "hooks.json"), JSON.stringify(cfg, null, 2));
}

function adapterContinue() {
  // Continue: hooks via config.json (extensão recente) ou pre/post commands
  const cfg = {
    hooks: manifest.hooks.map((h) => ({
      trigger: h.trigger,
      command: `node ${h.entry}`,
    })),
  };
  writeOrLog(resolve(ROOT, ".continue", "hooks.json"), JSON.stringify(cfg, null, 2));
}

function adapterAider() {
  // Aider tem pré/post commit + on edit. Mapeamento limitado.
  const yaml = `# Harness hooks para Aider (gerado por install-hooks.mjs)
# Aider só suporta lifecycle limitado; rode os outros hooks manualmente:
#   node .harness/hooks/enforce-skills.mjs <<< "$prompt"
#   node .harness/hooks/subagent-brief.mjs

pre-commit:
  - node .harness/hooks/phase-doc-sync.mjs
post-edit:
  - node .harness/hooks/tdd-loop.mjs
`;
  writeOrLog(resolve(ROOT, ".aider.harness.yml"), yaml);
}

function adapterVscode() {
  // VS Code: tasks manuais
  const tasks = {
    version: "2.0.0",
    tasks: manifest.hooks.map((h) => ({
      label: `harness:${h.name}`,
      type: "shell",
      command: `node ${h.entry}`,
      problemMatcher: [],
    })),
  };
  writeOrLog(
    resolve(ROOT, ".vscode", "tasks.harness.json"),
    JSON.stringify(tasks, null, 2)
  );
}

function adapterCli() {
  console.log("Modo CLI: rode hooks manualmente.");
  for (const h of manifest.hooks) {
    console.log(`  ${h.name.padEnd(20)} → node ${h.entry}`);
  }
}

const adapters = {
  cursor: adapterCursor,
  "claude-code": adapterClaudeCode,
  cline: adapterCline,
  continue: adapterContinue,
  aider: adapterAider,
  vscode: adapterVscode,
  cli: adapterCli,
};

const fn = adapters[ide];
if (!fn) {
  console.error(`IDE desconhecida: ${ide}`);
  console.error(`Disponíveis: ${Object.keys(adapters).join(", ")}`);
  process.exit(2);
}

console.log(`[install-hooks] gerando para IDE=${ide}${dryRun ? " (dry-run)" : ""}`);
fn();
console.log("ok");
