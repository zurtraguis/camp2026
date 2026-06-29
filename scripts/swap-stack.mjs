#!/usr/bin/env node
// swap-stack.mjs — Apply a stack scaffold to the project root.
//
// Usage:
//   node scripts/swap-stack.mjs <stack> [--track=<x>] [--dry-run]
//
// Steps:
//   1. Validate stack id (api-only|mobile|cli|nextjs).
//   2. Read stacks/<id>/.harness-stack-meta.json (deps + scripts).
//   3. Copy stacks/<id>/scaffold/* to project root (skip if --dry-run).
//   4. Update package.json deps + scripts.
//   5. Update .harness-config.json.stack (and .track if --track given).
//   6. Append HARNESS_STACK=<id> to .env if absent.
//   7. Print ADR template path for user to fill.

import { existsSync, readFileSync, writeFileSync, cpSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const VALID_STACKS = [
  "nextjs", "api-only", "mobile", "cli",
  "landing", "single-page", "blog", "ecommerce", "internal-app", "repository-catalog",
];
// Stacks que ainda só têm STACK.md (sem scaffold/meta) — toleramos ausência.
const STACK_MD_ONLY = new Set([
  "landing", "single-page", "blog", "ecommerce", "internal-app", "repository-catalog",
]);

const args = process.argv.slice(2);
const stackId = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const trackArg = args.find((a) => a.startsWith("--track="))?.split("=")[1];

function fail(msg, code = 2) {
  console.error(`[swap-stack] ${msg}`);
  process.exit(code);
}

if (!stackId) fail("usage: swap-stack.mjs <stack> [--track=<x>] [--dry-run]");
if (!VALID_STACKS.includes(stackId)) fail(`invalid stack: ${stackId} (valid: ${VALID_STACKS.join(", ")})`);

const stackDir = resolve(ROOT, "stacks", stackId);
if (!existsSync(stackDir)) fail(`stack dir not found: ${stackDir}`);

const metaPath = resolve(stackDir, ".harness-stack-meta.json");
if (!existsSync(metaPath)) {
  if (STACK_MD_ONLY.has(stackId)) {
    console.log(`[swap-stack] stack '${stackId}' is STACK.md-only (no scaffold yet) — apenas registra HARNESS_STACK e segue.`);
    if (!dryRun) {
      const envPath = resolve(ROOT, ".env");
      const line = `HARNESS_STACK=${stackId}\n`;
      if (existsSync(envPath)) {
        const cur = readFileSync(envPath, "utf8");
        const next = /^HARNESS_STACK=/m.test(cur) ? cur.replace(/^HARNESS_STACK=.*$/m, line.trim()) : cur + line;
        writeFileSync(envPath, next);
      } else {
        writeFileSync(envPath, line);
      }
    }
    process.exit(0);
  }
  fail(`missing meta: ${metaPath}`);
}
const meta = JSON.parse(readFileSync(metaPath, "utf8"));

const scaffoldDir = resolve(stackDir, meta.scaffold_root || "scaffold");
if (!existsSync(scaffoldDir) && stackId !== "nextjs") {
  fail(`scaffold dir missing: ${scaffoldDir}`);
}

console.log(`[swap-stack] target: ${stackId} (${meta.name})`);
if (dryRun) console.log("[swap-stack] DRY RUN — no writes will occur");

// 3. Copy scaffold files (preserve existing .env, .git, node_modules, .harness-*).
function copyScaffold() {
  if (!existsSync(scaffoldDir)) return;
  const entries = readdirSync(scaffoldDir, { withFileTypes: true });
  for (const e of entries) {
    const src = join(scaffoldDir, e.name);
    const dst = join(ROOT, e.name);
    console.log(`  + ${e.name}${e.isDirectory() ? "/" : ""}`);
    if (!dryRun) cpSync(src, dst, { recursive: true });
  }
}
copyScaffold();

// 4. Update package.json (merge deps + scripts).
function updatePackageJson() {
  const pkgPath = resolve(ROOT, "package.json");
  if (!existsSync(pkgPath)) {
    console.log("  ! package.json missing — skipping merge");
    return;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies = { ...(pkg.dependencies || {}), ...(meta.dependencies || {}) };
  pkg.devDependencies = { ...(pkg.devDependencies || {}), ...(meta.devDependencies || {}) };
  pkg.scripts = { ...(pkg.scripts || {}), ...(meta.scripts || {}) };
  if (meta.bin) pkg.bin = { ...(pkg.bin || {}), ...meta.bin };
  if (!dryRun) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("  + package.json deps/scripts merged");
}
updatePackageJson();

// 5. Update .harness-config.json.
async function updateConfig() {
  const setStack = `node scripts/harness-config.mjs set stack ${stackId}`;
  console.log(`  + ${setStack}`);
  if (dryRun) return;
  const { execSync } = await import("node:child_process");
  try {
    execSync(setStack, { stdio: "inherit" });
    if (trackArg) execSync(`node scripts/harness-config.mjs set track ${trackArg}`, { stdio: "inherit" });
  } catch (e) {
    console.error(`  ! config update failed: ${e.message}`);
  }
}
await updateConfig();

// 6. Append HARNESS_STACK to .env if absent.
function updateEnv() {
  const envPath = resolve(ROOT, ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    if (content.includes("HARNESS_STACK=")) {
      const updated = content.replace(/^HARNESS_STACK=.*$/m, `HARNESS_STACK=${stackId}`);
      if (!dryRun) writeFileSync(envPath, updated);
      console.log("  + .env HARNESS_STACK updated");
    } else {
      if (!dryRun) writeFileSync(envPath, content + `\nHARNESS_STACK=${stackId}\n`);
      console.log("  + .env HARNESS_STACK appended");
    }
  } else {
    if (!dryRun) writeFileSync(envPath, `HARNESS_STACK=${stackId}\n`);
    console.log("  + .env created");
  }
}
updateEnv();

console.log(`\n[swap-stack] done. Suggested next step: register an ADR in docs/decisions/.`);
console.log(`[swap-stack] template: docs/decisions/template-madr.md`);
console.log(`[swap-stack] then run: npm install`);
