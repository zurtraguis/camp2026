// gates.test.mjs — validate enforce-skills.sh phase gates.
// Hook contract: receives JSON on stdin with `prompt`, returns JSON with continue:true/false.

import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fillPhaseDoc, hasJq, mkSandbox, rmSandbox, runHook, runIn } from "./_helpers.mjs";

describe.skipIf(!hasJq())("enforce-skills.sh gates", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("gates");
    runIn(sb, "bash scripts/harness-init.sh");
  });
  afterEach(() => {
    rmSandbox(sb);
    sb = null;
  });

  it("non-slash prompt passes through unchanged", () => {
    const r = runHook(sb, "enforce-skills", { prompt: "hello world" });
    expect(r.status).toBe(0);
    expect(r.json).toEqual({ continue: true });
  });

  it("/prd is blocked when 00_VALIDATION.md is missing", () => {
    rmSync(join(sb, "docs", "00_VALIDATION.md"), { force: true });
    const r = runHook(sb, "enforce-skills", { prompt: "/prd" });
    expect(r.status).toBe(0);
    expect(r.json.continue).toBe(false);
    expect(r.json.userMessage).toMatch(/00_VALIDATION/);
  });

  it("/prd passes once 00_VALIDATION.md exists with content", () => {
    fillPhaseDoc(sb, "00_VALIDATION.md");
    const r = runHook(sb, "enforce-skills", { prompt: "/prd" });
    expect(r.status).toBe(0);
    expect(r.json.continue).toBe(true);
    expect(r.json.prompt).toMatch(/skills-policy/);
  });

  it("/release blocks when 08_SECURITY.md is missing", () => {
    fillPhaseDoc(sb, "07_IMPLEMENTATION.md");
    rmSync(join(sb, "docs", "08_SECURITY.md"), { force: true });
    const r = runHook(sb, "enforce-skills", { prompt: "/release" });
    expect(r.status).toBe(0);
    expect(r.json.continue).toBe(false);
    expect(r.json.userMessage).toMatch(/08_SECURITY|security-audit/);
  });

  it("unknown slash command passes through (no gate)", () => {
    const r = runHook(sb, "enforce-skills", { prompt: "/unknown-cmd-xyz" });
    expect(r.status).toBe(0);
    expect(r.json.continue).toBe(true);
  });
});
