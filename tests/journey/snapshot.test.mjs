// snapshot.test.mjs — WS8 — verifies scripts/snapshot.mjs subcommands.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkSandbox, rmSandbox, runIn } from "./_helpers.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

describe("snapshot.mjs", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("snapshot");
    // Initialize harness config so snapshot.mjs can read it.
    runIn(sb, "node scripts/harness-config.mjs init");
  });

  afterEach(() => rmSandbox(sb));

  it("prints help when invoked with no args", () => {
    const r = runIn(sb, "node scripts/snapshot.mjs");
    expect(r.stderr + r.stdout).toMatch(/uso: snapshot\.mjs/);
    expect(r.status).not.toBe(0);
  });

  it("warns when not a git repo and skips create", () => {
    const r = runIn(sb, "node scripts/snapshot.mjs create 06");
    expect(r.stdout + r.stderr).toMatch(/não é repo git/);
  });

  it("list returns no snapshots in non-git project", () => {
    const r = runIn(sb, "node scripts/snapshot.mjs list");
    expect(r.stdout + r.stderr).toMatch(/sem snapshots|nenhum snapshot/);
  });

  it("rejects invalid phase format", () => {
    const r = runIn(sb, "node scripts/snapshot.mjs create XX");
    expect(r.stderr).toMatch(/phase deve ser NN/);
    expect(r.status).not.toBe(0);
  });

  it("create + list works after git init (smoke)", () => {
    // Configure git in sandbox (CI-friendly).
    runIn(
      sb,
      'git init -q && git config user.email "test@test.com" && git config user.name "Test" && git add -A && git commit -q -m init'
    );

    const create = runIn(sb, "node scripts/snapshot.mjs create 06");
    expect(create.stdout).toMatch(/criado: phase-06-/);

    const list = runIn(sb, "node scripts/snapshot.mjs list");
    expect(list.stdout).toMatch(/phase-06-/);
  });

  it("emits telemetry on create", () => {
    runIn(
      sb,
      'git init -q && git config user.email "test@test.com" && git config user.name "Test" && git add -A && git commit -q -m init'
    );
    runIn(sb, "node scripts/snapshot.mjs create 07");
    const events = join(sb, ".harness", "events.jsonl");
    expect(existsSync(events)).toBe(true);
    const lines = readFileSync(events, "utf8").trim().split("\n");
    const hasSnapshotEvent = lines.some((l) => {
      try {
        const o = JSON.parse(l);
        return o.event === "snapshot" && o.name === "create";
      } catch {
        return false;
      }
    });
    expect(hasSnapshotEvent).toBe(true);
  });

  it("respects snapshots.enabled=false", () => {
    // Disable snapshots in config.
    const cfgPath = join(sb, ".harness-config.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    cfg.snapshots.enabled = false;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    runIn(
      sb,
      'git init -q && git config user.email "test@test.com" && git config user.name "Test" && git add -A && git commit -q -m init'
    );
    const r = runIn(sb, "node scripts/snapshot.mjs create 06");
    expect(r.stdout).toMatch(/disabled/);
  });
});
