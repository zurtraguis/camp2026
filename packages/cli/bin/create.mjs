#!/usr/bin/env node
// create-vibecoding-harness — bootstrap a new VibeCoding harness project.
//
// Usage:
//   npx create-vibecoding-harness <name> [--stack=<id>] [--track=<id>] [--from-tarball=<path>] [--from-dir=<path>]
//
// Sources (in order of precedence):
//   --from-dir=<path>      copy from local directory (dev/offline)
//   --from-tarball=<path>  extract local .tar.gz
//   --from-release=<vX.Y.Z> download GitHub Release tarball (default: latest)
//
// Always:
//   1. Verify destination doesn't exist (unless --force).
//   2. Copy/extract template tree.
//   3. Run scripts/harness-init.sh with HARNESS_STACK / HARNESS_TRACK env vars.
//   4. Print next-step hint.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flag = (name, def = null) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  if (a) return a.split("=").slice(1).join("=");
  if (args.includes(`--${name}`)) return true;
  return def;
};

const name = positional[0];
const stack = flag("stack", "nextjs");
const track = flag("track", "standard");
const fromDir = flag("from-dir");
const fromTarball = flag("from-tarball");
const fromRelease = flag("from-release", "latest");
const force = flag("force", false);
const help = flag("help", false) || args.includes("-h");

if (help || !name) {
  const usage = `create-vibecoding-harness <name> [options]

Options:
  --stack=<id>          nextjs (default) | api-only | mobile | cli
  --track=<id>          lite | standard (default) | enterprise
  --from-dir=<path>     copy local dir (dev/offline)
  --from-tarball=<path> extract local .tar.gz
  --from-release=<tag>  download from GitHub Release (default: latest)
  --force               overwrite if destination exists
  -h, --help            show this help`;
  if (help) {
    console.log(usage);
    process.exit(0);
  } else {
    console.error(usage);
    process.exit(2);
  }
}

const dest = resolve(process.cwd(), name);
if (existsSync(dest) && !force) {
  console.error(`[create] destination exists: ${dest} (use --force to overwrite)`);
  process.exit(2);
}
mkdirSync(dest, { recursive: true });

console.log(`[create] target: ${dest}`);
console.log(`[create] stack: ${stack} | track: ${track}`);

// 1. Source resolution.
if (fromDir) {
  const src = resolve(fromDir);
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    console.error(`[create] --from-dir not a dir: ${src}`);
    process.exit(2);
  }
  console.log(`[create] copying from ${src}…`);
  // Exclude heavy/local-only artifacts.
  cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const b = basename(s);
      if (["node_modules", ".git", ".next", ".harness", ".harness-pristine.consumed"].includes(b)) return false;
      return true;
    },
  });
} else if (fromTarball) {
  const tar = resolve(fromTarball);
  if (!existsSync(tar)) {
    console.error(`[create] tarball not found: ${tar}`);
    process.exit(2);
  }
  console.log(`[create] extracting ${tar}…`);
  execSync(`tar -xzf "${tar}" -C "${dest}" --strip-components=1`, { stdio: "inherit" });
} else {
  // Future: download from GitHub Release.
  // For now, instruct user.
  console.error(`[create] no source specified.

Use one of:
  --from-dir=<path>      (recommended for dev/offline)
  --from-tarball=<path>  (extract a local tarball)

GitHub Release tarball download (--from-release) is not yet implemented in this CLI version.
See https://github.com/<org>/vibecoding-harness for releases.`);
  process.exit(2);
}

// 2. Ensure pristine marker (so harness-init runs).
const pristinePath = resolve(dest, ".harness-pristine");
if (!existsSync(pristinePath)) {
  // create empty marker
  await import("node:fs").then((fs) => fs.writeFileSync(pristinePath, ""));
}

// 3. Run harness-init.
console.log(`[create] running harness-init…`);
const init = spawnSync("bash", ["scripts/harness-init.sh"], {
  cwd: dest,
  stdio: "inherit",
  env: { ...process.env, HARNESS_STACK: stack, HARNESS_TRACK: track },
});
if (init.status !== 0) {
  console.error(`[create] harness-init failed (exit ${init.status})`);
  process.exit(init.status ?? 1);
}

console.log(`
[create] ✓ ${name} ready.

Next steps:
  cd ${name}
  npm install
  # then open in your editor and run /kickoff
`);
