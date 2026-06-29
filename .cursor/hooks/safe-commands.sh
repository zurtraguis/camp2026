#!/usr/bin/env bash
# Safe Commands Hook — blocks dangerous shell commands before execution.
# Returns JSON with permission: "deny" for blocked commands.
# Stack-aware: lê HARNESS_STACK do .env (default nextjs) e ajusta bloqueios.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // ""')

# Stack ativo (default nextjs).
STACK="nextjs"
if [ -f .env ] && grep -q '^HARNESS_STACK=' .env; then
  STACK=$(grep -E '^HARNESS_STACK=' .env | head -n1 | cut -d= -f2 | tr -d '"' | tr -d "'" | xargs)
fi
case "$STACK" in
  nextjs|api-only|mobile|cli) ;;
  *) STACK="nextjs" ;;
esac

BLOCKED_PATTERNS=(
  "rm -rf /"
  "rm -rf /\*"
  "git push --force.*main"
  "git push --force.*master"
  "git push -f.*main"
  "git push -f.*master"
  "git reset --hard"
  "> /dev/sda"
  "mkfs\."
  "dd if=/dev/zero"
)

deny() {
  local msg="$1"
  node scripts/harness-event.mjs gate "safe-commands" "{\"blocked\":true,\"reason\":\"$msg\",\"stack\":\"$STACK\"}" >/dev/null 2>&1 || true
  printf '{"permission":"deny","userMessage":%s}\n' "$(jq -Rn --arg m "$msg" '$m')"
  exit 0
}

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern"; then
    deny "Blocked dangerous command: ${COMMAND}"
  fi
done

# Block destructive Prisma reset without explicit override (nextjs/api-only).
case "$STACK" in
  nextjs|api-only)
    if echo "$COMMAND" | grep -qE "prisma migrate reset"; then
      if [ "${ALLOW_DESTRUCTIVE:-}" != "1" ]; then
        deny "prisma migrate reset bloqueado. Reexecute com ALLOW_DESTRUCTIVE=1 se for intencional."
      fi
    fi
    ;;
esac

# Block demo wipe in production-like environments (apenas Next.js).
if [ "$STACK" = "nextjs" ]; then
  if echo "$COMMAND" | grep -qE "db:demo:wipe|wipe-demo"; then
    if [ "${NODE_ENV:-}" = "production" ]; then
      deny "db:demo:wipe bloqueado em NODE_ENV=production."
    fi
  fi
fi

# Mobile-specific: bloquear eas build com auto-submit sem RR GO.
if [ "$STACK" = "mobile" ]; then
  if echo "$COMMAND" | grep -qE "eas build .*--auto-submit"; then
    RR="docs/13_RELEASE_READINESS.md"
    if [ ! -f "$RR" ] || ! grep -qE "^(Veredito|Decisão|Decision):.*(GO|GO WITH RISK)" "$RR"; then
      deny "eas build --auto-submit bloqueado: $RR ausente ou sem veredito GO/GO WITH RISK."
    fi
  fi
  if echo "$COMMAND" | grep -qE "rm -rf (ios|android)"; then
    if [ "${ALLOW_DESTRUCTIVE:-}" != "1" ]; then
      deny "Remoção de ios/ ou android/ bloqueada. Reexecute com ALLOW_DESTRUCTIVE=1 se intencional."
    fi
  fi
fi

# CLI-specific: npm publish sem release readiness GO.
if [ "$STACK" = "cli" ]; then
  if echo "$COMMAND" | grep -qE "npm publish"; then
    RR="docs/13_RELEASE_READINESS.md"
    if [ ! -f "$RR" ] || ! grep -qE "^(Veredito|Decisão|Decision):.*(GO|GO WITH RISK)" "$RR"; then
      deny "npm publish bloqueado: $RR ausente ou sem veredito GO/GO WITH RISK."
    fi
  fi
fi

# api-only-specific: rm -rf src/ sem override.
if [ "$STACK" = "api-only" ]; then
  if echo "$COMMAND" | grep -qE "rm -rf src(/|$)"; then
    if [ "${ALLOW_DESTRUCTIVE:-}" != "1" ]; then
      deny "rm -rf src/ bloqueado. Reexecute com ALLOW_DESTRUCTIVE=1 se intencional."
    fi
  fi
fi

# Block git push to main/master without release readiness GO.
if echo "$COMMAND" | grep -qE "git push( |.*)(origin )?(main|master)( |$)"; then
  RR="docs/13_RELEASE_READINESS.md"
  if [ ! -f "$RR" ] || ! grep -qE "^(Veredito|Decisão|Decision):.*(GO|GO WITH RISK)" "$RR"; then
    deny "Push a main/master bloqueado: $RR ausente ou sem veredito GO/GO WITH RISK."
  fi
fi

echo '{"permission":"allow"}'
