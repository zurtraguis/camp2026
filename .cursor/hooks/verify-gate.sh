#!/usr/bin/env bash
# stop — quando a sessão termina, se DOCS_INDEX.md marcar alguma fase como
# 'em revisão' / 'in review', corre verify-docs.sh para sinalizar gates.
# Não bloqueia (fail-open); apenas avisa.

set -euo pipefail

LOG_DIR=".cursor/logs"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG="$LOG_DIR/verify-gate.log"

INDEX="docs/DOCS_INDEX.md"
if [ ! -f "$INDEX" ]; then
  echo '{}'
  exit 0
fi

if ! grep -qiE 'em revisão|em revisao|in review' "$INDEX"; then
  echo '{}'
  exit 0
fi

if bash scripts/verify-docs.sh >"$LOG" 2>&1; then
  node scripts/harness-event.mjs hook "verify-gate" '{"result":"ok"}' >/dev/null 2>&1 || true
  jq -n '{userMessage:"[verify-gate] verify-docs OK — pode fechar a fase."}'
else
  TAIL=$(tail -n 20 "$LOG" 2>/dev/null || true)
  node scripts/harness-event.mjs gate "verify-gate" '{"blocked":true,"reason":"verify-docs failed"}' >/dev/null 2>&1 || true
  jq -n --arg t "$TAIL" '{userMessage: ("[verify-gate] verify-docs falhou. Resolva antes de fechar a fase.\n" + $t)}'
fi
