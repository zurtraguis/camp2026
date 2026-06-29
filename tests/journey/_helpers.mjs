// _helpers.mjs — utilities for deterministic journey tests.
// No LLM calls. All operations are local file/process.

import { execSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..", "..");

/**
 * Create a sandbox directory with a minimal copy of the harness needed for hooks/scripts to run.
 * @param {string} name folder name within tmp
 * @returns {string} absolute path to sandbox project root
 */
export function mkSandbox(name = "harness-sandbox") {
  const base = mkdtempSync(join(tmpdir(), `${name}-`));
  const sb = join(base, "test-app");
  mkdirSync(sb, { recursive: true });

  // Copy minimal subset (no node_modules, no .git, no .next).
  const include = [
    "scripts",
    ".cursor",
    "docs",
    "package.json",
    "WORKFLOW.md",
    "README.md",
    ".harness-pristine",
  ];
  for (const item of include) {
    const src = join(REPO_ROOT, item);
    if (!existsSync(src)) continue;
    cpSync(src, join(sb, item), { recursive: true });
  }
  // Ensure pristine marker exists; remove any consumed marker.
  writeFileSync(join(sb, ".harness-pristine"), "");
  try {
    rmSync(join(sb, ".harness-pristine.consumed"));
  } catch {}
  return sb;
}

/**
 * Cleanup sandbox.
 */
export function rmSandbox(sb) {
  if (!sb) return;
  // sb is .../tmp/<random>/test-app — remove the parent
  const parent = dirname(sb);
  try {
    rmSync(parent, { recursive: true, force: true });
  } catch {}
}

/**
 * Run a shell command in the sandbox. Returns { stdout, stderr, status }.
 */
export function runIn(sb, cmd, opts = {}) {
  const r = spawnSync("bash", ["-c", cmd], {
    cwd: sb,
    encoding: "utf8",
    env: { ...process.env, ...(opts.env || {}) },
    timeout: opts.timeout ?? 30_000,
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status ?? -1 };
}

/**
 * Run a hook with stdin payload. Returns { stdout, stderr, status, json }.
 * `json` is parsed only if stdout is valid JSON.
 */
export function runHook(sb, hookName, payload = {}) {
  const hookPath = join(sb, ".cursor", "hooks", `${hookName}.sh`);
  if (!existsSync(hookPath)) {
    throw new Error(`Hook not found: ${hookPath}`);
  }
  const r = spawnSync("bash", [hookPath], {
    cwd: sb,
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 15_000,
  });
  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  let json = null;
  try {
    json = JSON.parse(stdout.trim());
  } catch {}
  return { stdout, stderr, status: r.status ?? -1, json };
}

/**
 * Set a phase as "Em andamento" in DOCS_INDEX (mutates).
 */
export function setPhase(sb, phaseId) {
  const idx = join(sb, "docs", "DOCS_INDEX.md");
  if (!existsSync(idx)) return;
  const content = readFileSync(idx, "utf8");
  const re = new RegExp(`^(\\| ${phaseId}.*?\\| )(Pendente|Em andamento|Concluído|Bloqueado)`, "m");
  const updated = content.replace(re, `$1Em andamento`);
  writeFileSync(idx, updated, "utf8");
}

/**
 * Write content to a phase doc to satisfy precondition checks (>200 bytes).
 */
export function fillPhaseDoc(sb, fileName, body = null) {
  const dst = join(sb, "docs", fileName);
  const content = body ?? "# " + fileName + "\n\n" + "x".repeat(220);
  writeFileSync(dst, content, "utf8");
}

/**
 * Clear all phase docs (truncate to empty) so phase detection starts clean.
 */
export function clearAllPhaseDocs(sb) {
  const phases = [
    "00_VALIDATION",
    "01_PRD",
    "02_MONETIZATION",
    "03_RESEARCH",
    "04_MARKET_AND_REFERENCES",
    "05_DESIGN",
    "06_SPECIFICATION",
    "07_IMPLEMENTATION",
    "08_SECURITY",
    "09_TESTS",
    "10_DEBUG",
    "11_UX_AUDIT",
    "12_THREAT_MODEL",
    "13_RELEASE_READINESS",
  ];
  for (const slug of phases) {
    const p = join(sb, "docs", `${slug}.md`);
    if (existsSync(p)) writeFileSync(p, "", "utf8");
  }
}

/**
 * Read .harness/events.jsonl as an array of parsed objects.
 */
export function readEvents(sb) {
  const p = join(sb, ".harness", "events.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Check if `jq` is available — many hooks require it.
 */
export function hasJq() {
  try {
    execSync("command -v jq", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
