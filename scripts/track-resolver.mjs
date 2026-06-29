#!/usr/bin/env node
// track-resolver.mjs — Single source of truth for tracks (lite/standard/enterprise).
//
// Usage (CLI):
//   node scripts/track-resolver.mjs phases [track]    # required phases (one per line)
//   node scripts/track-resolver.mjs has <track> <NN>  # exit 0 if phase NN is required
//   node scripts/track-resolver.mjs current-track     # reads track from .harness-config.json
//
// Usage (import):
//   import { phasesForTrack, isPhaseRequired, currentTrack } from "./track-resolver.mjs";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Phase IDs: 2-digit slug prefix used in docs/<NN>_*.md.
// Required = "✓"; opt-in = "opt"; absent = "–".
const TRACK_MATRIX = {
  lite: ["00", "01", "05", "06", "07", "08", "09", "10", "13"],
  standard: ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"],
  enterprise: [
    "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15",
  ],
};

const VALID_TRACKS = Object.keys(TRACK_MATRIX);

export function phasesForTrack(track) {
  if (!VALID_TRACKS.includes(track)) {
    throw new Error(`unknown track: ${track} (valid: ${VALID_TRACKS.join(", ")})`);
  }
  return [...TRACK_MATRIX[track]];
}

export function isPhaseRequired(track, phaseNumber) {
  return phasesForTrack(track).includes(String(phaseNumber).padStart(2, "0"));
}

export function currentTrack(root = process.cwd()) {
  const p = resolve(root, ".harness-config.json");
  if (!existsSync(p)) return "standard";
  try {
    const cfg = JSON.parse(readFileSync(p, "utf8"));
    return VALID_TRACKS.includes(cfg.track) ? cfg.track : "standard";
  } catch {
    return "standard";
  }
}

export function isValidTrack(t) {
  return VALID_TRACKS.includes(t);
}

// CLI gate
const invokedDirectly = process.argv[1] && process.argv[1].endsWith("track-resolver.mjs");
if (invokedDirectly) {
  const [, , cmd, ...rest] = process.argv;
  try {
    if (cmd === "phases") {
      const t = rest[0] || currentTrack();
      console.log(phasesForTrack(t).join("\n"));
    } else if (cmd === "has") {
      const [t, ph] = rest;
      if (!t || !ph) {
        console.error("usage: track-resolver.mjs has <track> <NN>");
        process.exit(2);
      }
      process.exit(isPhaseRequired(t, ph) ? 0 : 1);
    } else if (cmd === "current-track") {
      console.log(currentTrack());
    } else if (cmd === "list") {
      console.log(VALID_TRACKS.join("\n"));
    } else {
      console.error("usage: track-resolver.mjs <phases|has|current-track|list> [args]");
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
