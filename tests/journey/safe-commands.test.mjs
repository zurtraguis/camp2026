// safe-commands.test.mjs — validate stack-aware blocking.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasJq, mkSandbox, rmSandbox, runHook, runIn } from "./_helpers.mjs";

function setStack(sb, stack) {
  writeFileSync(join(sb, ".env"), `HARNESS_STACK=${stack}\n`);
}

describe.skipIf(!hasJq())("safe-commands.sh", () => {
  let sb;

  beforeEach(() => {
    sb = mkSandbox("safe-cmd");
    runIn(sb, "bash scripts/harness-init.sh");
  });
  afterEach(() => {
    rmSandbox(sb);
    sb = null;
  });

  it("blocks rm -rf /", () => {
    const r = runHook(sb, "safe-commands", { command: "rm -rf /" });
    expect(r.status).toBe(0);
    expect(r.json.permission).toBe("deny");
  });

  it("blocks git push --force to main", () => {
    const r = runHook(sb, "safe-commands", { command: "git push --force origin main" });
    expect(r.json.permission).toBe("deny");
  });

  it("allows benign command", () => {
    const r = runHook(sb, "safe-commands", { command: "ls -la" });
    expect(r.json.permission).toBe("allow");
  });

  it("blocks prisma migrate reset on nextjs without override", () => {
    setStack(sb, "nextjs");
    const r = runHook(sb, "safe-commands", { command: "npx prisma migrate reset" });
    expect(r.json.permission).toBe("deny");
    expect(r.json.userMessage).toMatch(/ALLOW_DESTRUCTIVE/);
  });

  it("does NOT block prisma migrate reset on mobile stack", () => {
    setStack(sb, "mobile");
    const r = runHook(sb, "safe-commands", { command: "npx prisma migrate reset" });
    // mobile doesn't apply prisma rule → allow
    expect(r.json.permission).toBe("allow");
  });

  it("blocks rm -rf src/ on api-only stack", () => {
    setStack(sb, "api-only");
    const r = runHook(sb, "safe-commands", { command: "rm -rf src/" });
    expect(r.json.permission).toBe("deny");
  });

  it("blocks npm publish on cli stack without RR GO", () => {
    setStack(sb, "cli");
    const r = runHook(sb, "safe-commands", { command: "npm publish" });
    expect(r.json.permission).toBe("deny");
    expect(r.json.userMessage).toMatch(/RELEASE_READINESS|GO/);
  });

  it("emits telemetry event on block", () => {
    runHook(sb, "safe-commands", { command: "rm -rf /" });
    // Telemetry write is best-effort and async-ish; verify file exists with at least one event.
    const r = runIn(sb, "node scripts/harness-events.mjs --json");
    expect(r.status).toBe(0);
    const summary = JSON.parse(r.stdout);
    expect(summary.total).toBeGreaterThanOrEqual(1);
  });
});
