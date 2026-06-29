#!/usr/bin/env node
// vibecoding — multi-tool CLI for an existing harness project.
//
// Subcommands:
//   doctor       run npm verify:all
//   status       run npm run harness:status
//   events       run npm run harness:events (or node scripts/harness-events.mjs)
//   upgrade      apply migrations from <previous version> → current.
//   snapshot {list|create|rollback <tag>}
//   --help

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const args = process.argv.slice(2);
const cmd = args[0];

function fail(msg, code = 2) {
  console.error(`[vibecoding] ${msg}`);
  process.exit(code);
}
function run(c, opts = {}) {
  const r = spawnSync("bash", ["-c", c], { cwd: ROOT, stdio: "inherit", ...opts });
  process.exit(r.status ?? 0);
}

function ensureProject() {
  if (!existsSync(resolve(ROOT, ".harness-config.json"))) {
    fail("no .harness-config.json found in cwd. Are you in a harness project?");
  }
}

function help() {
  console.log(`vibecoding <command> [args]

Commands:
  doctor                       run all verifies (verify:all)
  status                       show current phase + stack + track
  events [--tail N | --json]   show telemetry summary
  upgrade                      apply pending migrations
  snapshot list                list snapshots (git tags phase-*)
  snapshot create <phase>      create snapshot of current state
  snapshot rollback <tag>      rollback to snapshot tag
  --help                       show this help`);
}

if (!cmd || cmd === "--help" || cmd === "-h") {
  help();
  process.exit(0);
}

switch (cmd) {
  case "doctor": {
    ensureProject();
    run("npm run verify:all");
    break;
  }
  case "status": {
    ensureProject();
    run("npm run harness:status -- " + args.slice(1).join(" "));
    break;
  }
  case "events": {
    ensureProject();
    const rest = args.slice(1).join(" ");
    run(`node scripts/harness-events.mjs ${rest}`);
    break;
  }
  case "upgrade": {
    ensureProject();
    const cfgPath = resolve(ROOT, ".harness-config.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    const cliPkg = resolve(import.meta.dirname || resolve(new URL(import.meta.url).pathname, ".."), "..", "package.json");
    let cliVersion = "3.0.0";
    try {
      cliVersion = JSON.parse(readFileSync(cliPkg, "utf8")).version || cliVersion;
    } catch {}
    console.log(`[upgrade] project version: ${cfg.version} → cli target: ${cliVersion}`);
    if (cfg.version === cliVersion) {
      console.log("[upgrade] nothing to do.");
      process.exit(0);
    }
    // Migrations live in packages/cli/src/migrations/<from>-to-<to>.mjs
    const migrationsDir = resolve(import.meta.dirname || ".", "..", "src", "migrations");
    if (!existsSync(migrationsDir)) {
      console.log("[upgrade] no migrations dir; updating version field only.");
      cfg.version = cliVersion;
      const { writeFileSync } = await import("node:fs");
      writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
      process.exit(0);
    }
    // Future: walk migrations between versions.
    console.log("[upgrade] migration system stub — manual review required.");
    break;
  }
  case "snapshot": {
    ensureProject();
    const sub = args[1];
    const rest = args.slice(2).join(" ");
    if (!sub) fail("usage: vibecoding snapshot <list|create|rollback> [args]");
    run(`node scripts/snapshot.mjs ${sub} ${rest}`);
    break;
  }
  default:
    fail(`unknown command: ${cmd}. Run 'vibecoding --help'.`);
}
