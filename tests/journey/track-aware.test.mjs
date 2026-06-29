// track-aware.test.mjs — track resolver and track-aware behavior.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkSandbox, rmSandbox, runIn } from "./_helpers.mjs";

describe("track-resolver", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("track");
  });
  afterEach(() => {
    rmSandbox(sb);
    sb = null;
  });

  it("lite excludes phases 02/03/04/11/12/14/15", () => {
    const r = runIn(sb, "node scripts/track-resolver.mjs phases lite");
    expect(r.status).toBe(0);
    const phases = r.stdout.trim().split("\n");
    expect(phases).not.toContain("02");
    expect(phases).not.toContain("11");
    expect(phases).not.toContain("12");
    expect(phases).not.toContain("14");
    expect(phases).toContain("00");
    expect(phases).toContain("13");
  });

  it("standard includes 02/11/12 but not 14/15", () => {
    const r = runIn(sb, "node scripts/track-resolver.mjs phases standard");
    const phases = r.stdout.trim().split("\n");
    expect(phases).toContain("02");
    expect(phases).toContain("11");
    expect(phases).toContain("12");
    expect(phases).not.toContain("14");
    expect(phases).not.toContain("15");
  });

  it("enterprise includes 14 and 15", () => {
    const r = runIn(sb, "node scripts/track-resolver.mjs phases enterprise");
    const phases = r.stdout.trim().split("\n");
    expect(phases).toContain("14");
    expect(phases).toContain("15");
  });

  it("`has` returns exit 0 for required, 1 for not", () => {
    const yes = runIn(sb, "node scripts/track-resolver.mjs has standard 02");
    expect(yes.status).toBe(0);
    const no = runIn(sb, "node scripts/track-resolver.mjs has lite 02");
    expect(no.status).toBe(1);
  });

  it("rejects unknown track", () => {
    const r = runIn(sb, "node scripts/track-resolver.mjs phases bogus");
    expect(r.status).not.toBe(0);
  });

  it("current-track reflects .harness-config.json after init", () => {
    runIn(sb, "bash scripts/harness-init.sh", {
      env: { HARNESS_TRACK: "lite" },
    });
    const r = runIn(sb, "node scripts/track-resolver.mjs current-track");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("lite");
  });
});
