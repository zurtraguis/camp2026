#!/usr/bin/env node
// snapshot.mjs — WS8 — git-tag based phase snapshots.
//
// Usage:
//   node scripts/snapshot.mjs create <phase> [--message="..."]
//   node scripts/snapshot.mjs list [--phase=<NN>]
//   node scripts/snapshot.mjs rollback <tag> [--force]
//   node scripts/snapshot.mjs diff <tag>
//
// Tag format: phase-<NN>-<slug>-<YYYYMMDD-HHMM>
// Requires: git repo. Snapshots are no-op (warn) if .git missing.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const CONFIG_PATH = resolve(ROOT, ".harness-config.json");

function isGitRepo() {
  return existsSync(resolve(ROOT, ".git"));
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

function git(args, opts = {}) {
  return spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    ...opts,
  });
}

function gitOk(args) {
  const r = git(args);
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  }
  return r.stdout.trim();
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function phaseSlug(phaseNum) {
  // Try to derive slug from docs/<NN>_<NAME>.md filename.
  const docs = resolve(ROOT, "docs");
  if (!existsSync(docs)) return `phase-${phaseNum}`;
  const entries = readdirSync(docs);
  const match = entries.find((e) => e.startsWith(`${phaseNum}_`) && e.endsWith(".md"));
  if (!match) return `phase-${phaseNum}`;
  return slugify(match.replace(/^[0-9]+_/, "").replace(/\.md$/i, ""));
}

function emit(eventType, name, meta = {}) {
  spawnSync("node", ["scripts/harness-event.mjs", eventType, name, JSON.stringify(meta)], {
    cwd: ROOT,
    stdio: "ignore",
  });
}

// ---------- Subcommands ----------

function cmdCreate(args) {
  const phase = args[0];
  if (!phase || !/^[0-9]{2}$/.test(phase)) {
    console.error("snapshot create: phase deve ser NN (e.g. 06)");
    process.exit(2);
  }
  const cfg = loadConfig();
  if (cfg && cfg.snapshots && cfg.snapshots.enabled === false) {
    console.log(`[snapshot] disabled in .harness-config.json — pulando`);
    return;
  }
  if (!isGitRepo()) {
    console.warn(`[snapshot] não é repo git — pulando snapshot da fase ${phase}`);
    return;
  }
  const messageArg = args.find((a) => a.startsWith("--message="));
  const customMsg = messageArg ? messageArg.split("=").slice(1).join("=") : null;

  const slug = phaseSlug(phase);
  const ts = timestamp();
  const tag = `phase-${phase}-${slug}-${ts}`;
  const message = customMsg || `Snapshot fase ${phase} (${slug}) em ${ts}`;

  // Check working tree clean-ish: allow tagging current HEAD.
  const status = git(["status", "--porcelain"]).stdout.trim();
  if (status) {
    // Stage docs to ensure phase doc state is captured even if not committed.
    // Be conservative: only stage docs/ to avoid pulling in WIP code.
    git(["add", "docs"]);
    const head = git(["rev-parse", "HEAD"]).stdout.trim();
    if (head) {
      // Create a snapshot commit so the tag points to a real state.
      const commit = git([
        "commit",
        "-m",
        `chore(snapshot): ${tag}`,
        "--allow-empty",
        "--no-verify",
      ]);
      if (commit.status !== 0) {
        console.warn(`[snapshot] commit falhou: ${commit.stderr.trim()} — tentando tag direto`);
      }
    }
  }

  const tagRes = git(["tag", "-a", tag, "-m", message]);
  if (tagRes.status !== 0) {
    console.error(`[snapshot] git tag falhou: ${tagRes.stderr.trim()}`);
    process.exit(1);
  }

  // Update last_phase_completed.
  if (cfg) {
    cfg.last_phase_completed = phase;
    saveConfig(cfg);
  }

  emit("snapshot", "create", { tag, phase, slug });
  console.log(`[snapshot] criado: ${tag}`);
  console.log(`           rollback: vibecoding snapshot rollback ${tag}`);
}

function cmdList(args) {
  if (!isGitRepo()) {
    console.warn(`[snapshot] não é repo git — sem snapshots`);
    return;
  }
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const phase = phaseArg ? phaseArg.split("=")[1] : null;
  const pattern = phase ? `phase-${phase}-*` : "phase-*";

  const r = git(["tag", "-l", pattern, "--sort=-creatordate", "--format=%(refname:short)\t%(creatordate:short)\t%(subject)"]);
  if (r.status !== 0) {
    console.error(r.stderr);
    process.exit(1);
  }
  const lines = r.stdout.split("\n").filter(Boolean);
  if (lines.length === 0) {
    console.log("[snapshot] nenhum snapshot encontrado");
    return;
  }
  console.log(`[snapshot] ${lines.length} snapshot(s):\n`);
  for (const ln of lines) {
    const [tag, date, ...rest] = ln.split("\t");
    console.log(`  ${tag}  (${date})  ${rest.join(" ")}`);
  }
}

function cmdRollback(args) {
  const tag = args[0];
  if (!tag) {
    console.error("snapshot rollback: tag obrigatória");
    process.exit(2);
  }
  if (!isGitRepo()) {
    console.error("[snapshot] não é repo git — rollback impossível");
    process.exit(1);
  }
  const force = args.includes("--force");

  // Verify tag exists.
  const exists = git(["rev-parse", "--verify", `refs/tags/${tag}`]);
  if (exists.status !== 0) {
    console.error(`[snapshot] tag não encontrada: ${tag}`);
    process.exit(1);
  }

  // Refuse if working tree dirty (unless --force).
  const status = git(["status", "--porcelain"]).stdout.trim();
  if (status && !force) {
    console.error(`[snapshot] working tree sujo. Commit/stash primeiro ou use --force.`);
    process.exit(1);
  }

  // Restrictive checkout: only docs/ and src/ to avoid clobbering env/local.
  const paths = ["docs", "src"].filter((p) => existsSync(resolve(ROOT, p)));
  if (paths.length === 0) {
    console.error("[snapshot] nada para restaurar (docs/ e src/ ausentes)");
    process.exit(1);
  }

  const r = git(["checkout", tag, "--", ...paths]);
  if (r.status !== 0) {
    console.error(`[snapshot] checkout falhou: ${r.stderr.trim()}`);
    process.exit(1);
  }

  // Update last_phase_completed from tag if possible.
  const m = tag.match(/^phase-(\d{2})-/);
  if (m) {
    const cfg = loadConfig();
    if (cfg) {
      cfg.last_phase_completed = m[1];
      saveConfig(cfg);
    }
  }

  emit("snapshot", "rollback", { tag });
  console.log(`[snapshot] rollback aplicado: ${tag}`);
  console.log(`           paths restaurados: ${paths.join(", ")}`);
}

function cmdDiff(args) {
  const tag = args[0];
  if (!tag) {
    console.error("snapshot diff: tag obrigatória");
    process.exit(2);
  }
  if (!isGitRepo()) {
    console.error("[snapshot] não é repo git");
    process.exit(1);
  }
  const r = spawnSync("git", ["diff", `${tag}..HEAD`, "--stat"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  process.exit(r.status ?? 0);
}

// ---------- Entry ----------

const cmd = process.argv[2];
const rest = process.argv.slice(3);

switch (cmd) {
  case "create":
    cmdCreate(rest);
    break;
  case "list":
    cmdList(rest);
    break;
  case "rollback":
    cmdRollback(rest);
    break;
  case "diff":
    cmdDiff(rest);
    break;
  default:
    console.error(`uso: snapshot.mjs <create|list|rollback|diff> [args]

  create <NN>           cria tag phase-NN-<slug>-<ts>
  list [--phase=NN]     lista snapshots
  rollback <tag>        restaura docs/ e src/ do snapshot
  diff <tag>            mostra diff stat entre tag e HEAD`);
    process.exit(2);
}
