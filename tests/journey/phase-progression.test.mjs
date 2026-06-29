// phase-progression.test.mjs — validate harness-status reports correct phase.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAllPhaseDocs,
  fillPhaseDoc,
  mkSandbox,
  rmSandbox,
  runIn,
} from "./_helpers.mjs";

describe("harness-status phase detection", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("phase-prog");
    runIn(sb, "bash scripts/harness-init.sh");
    clearAllPhaseDocs(sb);
  });
  afterEach(() => {
    rmSandbox(sb);
    sb = null;
  });

  it("reports current_phase null when no phase doc filled", () => {
    const r = runIn(sb, "node scripts/harness-status.mjs --json");
    expect(r.status).toBe(0);
    const status = JSON.parse(r.stdout);
    expect(status.ok).toBe(true);
    expect(status.next_suggested).toMatch(/kickoff|resume|harness-init/);
  });

  it("detects phase 06 when SPECIFICATION is filled", () => {
    fillPhaseDoc(sb, "00_VALIDATION.md");
    fillPhaseDoc(sb, "01_PRD.md");
    fillPhaseDoc(sb, "06_SPECIFICATION.md");
    const r = runIn(sb, "node scripts/harness-status.mjs --json");
    expect(r.status).toBe(0);
    const status = JSON.parse(r.stdout);
    expect(status.current_phase).toBeTruthy();
    expect(status.current_phase.slug).toBe("06_SPECIFICATION");
    expect(status.current_phase.number).toBe("06");
  });

  it("detects phase 13 when RELEASE_READINESS is filled", () => {
    fillPhaseDoc(sb, "00_VALIDATION.md");
    fillPhaseDoc(sb, "13_RELEASE_READINESS.md");
    const r = runIn(sb, "node scripts/harness-status.mjs --json");
    expect(r.status).toBe(0);
    const status = JSON.parse(r.stdout);
    expect(status.current_phase.slug).toBe("13_RELEASE_READINESS");
  });

  it("config getter returns version from .harness-config.json", () => {
    const r = runIn(sb, "node scripts/harness-config.mjs get version");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("config get track returns valid track", () => {
    const r = runIn(sb, "node scripts/harness-config.mjs get track");
    expect(r.status).toBe(0);
    expect(["lite", "standard", "enterprise"]).toContain(r.stdout.trim());
  });
});
