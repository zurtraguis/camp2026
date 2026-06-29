// harness-init.test.mjs — port of verify-harness-init.sh in Vitest.
// Validates the kickoff bootstrap pipeline end-to-end without LLM.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkSandbox, rmSandbox, runIn } from "./_helpers.mjs";

describe("harness-init.sh", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("harness-init");
  });
  afterEach(() => {
    rmSandbox(sb);
    sb = null;
  });

  it("consumes .harness-pristine and creates .harness-pristine.consumed", () => {
    expect(existsSync(join(sb, ".harness-pristine"))).toBe(true);
    const r = runIn(sb, "bash scripts/harness-init.sh");
    expect(r.status).toBe(0);
    expect(existsSync(join(sb, ".harness-pristine"))).toBe(false);
    expect(existsSync(join(sb, ".harness-pristine.consumed"))).toBe(true);
  });

  it("renames package.json to sandbox folder name", () => {
    runIn(sb, "bash scripts/harness-init.sh");
    const pkg = JSON.parse(readFileSync(join(sb, "package.json"), "utf8"));
    expect(pkg.name).toBe("test-app");
  });

  it("creates .harness-config.json with valid schema", () => {
    runIn(sb, "bash scripts/harness-init.sh");
    const cfgPath = join(sb, ".harness-config.json");
    expect(existsSync(cfgPath)).toBe(true);
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    expect(cfg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(["nextjs", "api-only", "mobile", "cli"]).toContain(cfg.stack);
    expect(["lite", "standard", "enterprise"]).toContain(cfg.track);
    expect(cfg.telemetry).toBeDefined();
    expect(cfg.snapshots).toBeDefined();
  });

  it("respects HARNESS_STACK and HARNESS_TRACK env vars", () => {
    const r = runIn(sb, "bash scripts/harness-init.sh", {
      env: { HARNESS_STACK: "api-only", HARNESS_TRACK: "lite" },
    });
    expect(r.status).toBe(0);
    const cfg = JSON.parse(readFileSync(join(sb, ".harness-config.json"), "utf8"));
    expect(cfg.stack).toBe("api-only");
    expect(cfg.track).toBe("lite");
  });

  it("is idempotent on second invocation", () => {
    const r1 = runIn(sb, "bash scripts/harness-init.sh");
    expect(r1.status).toBe(0);
    const consumedBefore = readFileSync(join(sb, ".harness-pristine.consumed"), "utf8");

    const r2 = runIn(sb, "bash scripts/harness-init.sh");
    expect(r2.status).toBe(0);
    // Marker still present after re-run.
    expect(existsSync(join(sb, ".harness-pristine.consumed"))).toBe(true);
    const consumedAfter = readFileSync(join(sb, ".harness-pristine.consumed"), "utf8");
    // Content unchanged (idempotent — does not regenerate timestamp).
    expect(consumedAfter).toBe(consumedBefore);
  });

  it("DOCS_INDEX has no active status entries after init", () => {
    runIn(sb, "bash scripts/harness-init.sh");
    const idx = readFileSync(join(sb, "docs", "DOCS_INDEX.md"), "utf8");
    // Skip legend line (contains 'Legenda'); look for table rows that have 'Em andamento' or 'Concluído'.
    const activeRows = idx
      .split("\n")
      .filter((l) => l.startsWith("| ") && !/Legenda/i.test(l))
      .filter((l) => /(Em andamento|Concluído|Bloqueado)/.test(l));
    expect(activeRows).toEqual([]);
  });
});
