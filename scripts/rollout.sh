#!/usr/bin/env bash
# rollout.sh — Helpers para release progressivo (canary / feature flag).
# Pré-requer plano em docs/13_RELEASE_READINESS.md (seção Progressive Rollout).
#
# Subcomandos:
#   promote <stage>    Avança ao próximo estágio (10|30|50|100).
#   hold               Pausa promoção (apenas registra estado).
#   rollback <release> Desliga flag e/ou faz revert do deploy.
#   status             Imprime estágio atual e link para painel.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STATE_FILE=".rollout-state.json"
RR="docs/13_RELEASE_READINESS.md"

usage() {
  echo "Uso: $0 {promote <stage>|hold|rollback <release>|status}"
  exit 2
}

require_rr() {
  if [ ! -f "$RR" ]; then
    echo "ERRO: $RR ausente. Rode /progressive-rollout antes." >&2
    exit 1
  fi
  if ! grep -qE "Progressive Rollout|## Rollout" "$RR"; then
    echo "ERRO: $RR sem seção Progressive Rollout." >&2
    exit 1
  fi
}

write_state() {
  local stage="$1"
  local note="${2:-}"
  printf '{"stage":%s,"updated":"%s","note":"%s"}\n' \
    "$stage" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$note" \
    > "$STATE_FILE"
  echo "rollout state -> stage=${stage} note=${note}"
}

case "${1:-}" in
  promote)
    require_rr
    STAGE="${2:?stage requerido (10|30|50|100)}"
    case "$STAGE" in 10|30|50|100) ;; *) echo "stage inválido: $STAGE"; exit 2 ;; esac
    write_state "$STAGE" "promote"
    echo "Verifique /performance-baseline e o painel antes de promover ao próximo estágio."
    ;;
  hold)
    require_rr
    PREV=$(jq -r '.stage // "?"' "$STATE_FILE" 2>/dev/null || echo "?")
    write_state "$PREV" "hold"
    ;;
  rollback)
    require_rr
    REL="${2:?release requerido}"
    write_state 0 "rollback:${REL}"
    echo "Execute rollback no provider de feature flag e/ou \`git revert <commit>\` + \`git push\`."
    ;;
  status)
    if [ -f "$STATE_FILE" ]; then
      cat "$STATE_FILE"
    else
      echo '{"stage":0,"note":"sem release ativo"}'
    fi
    ;;
  *) usage ;;
esac
