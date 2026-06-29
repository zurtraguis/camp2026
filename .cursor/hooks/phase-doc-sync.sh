#!/usr/bin/env bash
# afterFileEdit — quando docs de fase ou prisma/schema.prisma mudam,
# emite avisos práticos. Não bloqueia. Não corre verify completo (rapidez).

set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.file_path // .filePath // ""')

WARN=""

case "$FILE" in
  docs/0[0-9]_*.md|docs/1[0-3]_*.md)
    if grep -qE "TODO|TBD|XXX|<placeholder>" "$FILE" 2>/dev/null; then
      WARN="[phase-doc-sync] $FILE ainda tem placeholders (TODO/TBD/XXX). Resolva antes de fechar a fase."
    fi
    ;;
  prisma/schema.prisma)
    WARN="[phase-doc-sync] schema.prisma mudou: lembre-se de 'npx prisma migrate dev' e atualizar prisma/seed.ts (dados demo) se aplicável."
    ;;
  src/app/styleguide/*|src/app/styleguide/**)
    WARN="[phase-doc-sync] Styleguide alterado: confirme que docs/05_DESIGN.md reflete mudanças (tokens, estados, componentes)."
    ;;
esac

node scripts/harness-event.mjs hook "phase-doc-sync" "{\"file\":\"$FILE\",\"warn\":$([ -n "$WARN" ] && echo true || echo false)}" >/dev/null 2>&1 || true

# Detecta fechamento de fase: se DOCS_INDEX foi editado e tem nova entrada "Concluído"
if [ "$FILE" = "docs/DOCS_INDEX.md" ]; then
  CLOSED=$(grep -oE 'Concluído.*phase-[0-9]+|✅ Concluído' "$FILE" 2>/dev/null | head -n1 || true)
  if [ -n "$CLOSED" ]; then
    node scripts/harness-event.mjs phase "DOCS_INDEX" "{\"status\":\"closed\"}" >/dev/null 2>&1 || true
    # WS8 auto-snapshot: extrai número da fase fechada e dispara snapshot se habilitado
    if command -v node >/dev/null 2>&1; then
      AUTO=$(node scripts/harness-config.mjs get snapshots.auto_on_phase_close 2>/dev/null || echo "false")
      if [ "$AUTO" = "true" ]; then
        # Detecta primeira fase NN com status Concluído na linha
        PHASE_NN=$(grep -E '^\| *[0-9]{2} ' "$FILE" 2>/dev/null \
          | grep -E '✅|Concluído' \
          | head -n1 \
          | grep -oE '[0-9]{2}' | head -n1 || true)
        if [ -n "$PHASE_NN" ]; then
          node scripts/snapshot.mjs create "$PHASE_NN" >/dev/null 2>&1 || true
        fi
      fi
    fi
  fi
fi

if [ -n "$WARN" ]; then
  jq -n --arg m "$WARN" '{userMessage:$m}'
else
  echo '{}'
fi
