#!/usr/bin/env bash
# beforeSubmitPrompt — quando o utilizador envia um slash command,
# carrega o frontmatter `skills:` do .md correspondente e prefixa um
# lembrete ao prompt para o agente carregar essas skills.
#
# Também bloqueia (continue:false) se a fase exigir doc predecessor ausente.

set -euo pipefail

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# Aceitar prompts não-slash sem alteração.
if ! printf '%s' "$PROMPT" | grep -qE '^[[:space:]]*/[a-zA-Z][a-zA-Z0-9_-]*'; then
  echo '{"continue":true}'
  exit 0
fi

CMD_NAME=$(printf '%s' "$PROMPT" | sed -E 's@^[[:space:]]*/([a-zA-Z][a-zA-Z0-9_-]*).*@\1@')

CMD_FILE=$(find .cursor/commands -type f -name "${CMD_NAME}.md" 2>/dev/null | head -n1 || true)

if [ -z "$CMD_FILE" ]; then
  echo '{"continue":true}'
  exit 0
fi

# Extrair skills do frontmatter YAML.
SKILLS=$(awk '
  BEGIN { infm=0; insk=0 }
  /^---[[:space:]]*$/ { infm=!infm; next }
  infm && /^skills:[[:space:]]*$/ { insk=1; next }
  infm && insk && /^[[:space:]]*-[[:space:]]*/ {
    sub(/^[[:space:]]*-[[:space:]]*/, "")
    gsub(/[[:space:]]+$/, "")
    print
    next
  }
  infm && insk && /^[a-zA-Z]/ { insk=0 }
' "$CMD_FILE" | tr '\n' ' ' | sed 's/[[:space:]]*$//')

# Detetar trilha ativa (lite|standard|enterprise). Default: standard.
TRACK="standard"
if command -v node >/dev/null 2>&1 && [ -f scripts/track-resolver.mjs ]; then
  TRACK=$(node scripts/track-resolver.mjs current-track 2>/dev/null || echo "standard")
fi

# phase_required <NN> → exit 0 se a fase for exigida na trilha ativa.
phase_required() {
  if [ ! -f scripts/track-resolver.mjs ]; then return 0; fi
  node scripts/track-resolver.mjs has "$TRACK" "$1" >/dev/null 2>&1
}

# gate_doc_for <CMD> <NN> <doc> — só vira gate se a fase NN é exigida na trilha.
gate_doc_for() {
  local phase="$1" doc="$2"
  if phase_required "$phase" && [ ! -f "$doc" ]; then
    echo "$doc"
  fi
}

# Detetar gates de fase (doc predecessor exigido). Track-aware.
PHASE_GATE_MISSING=""
case "$CMD_NAME" in
  kickoff)
    # /kickoff exige harness inicializado e VALIDATION ainda em template.
    if [ ! -f .harness-pristine.consumed ] && [ ! -f .harness-pristine ]; then
      PHASE_GATE_MISSING=".harness-pristine.consumed (rode 'bash scripts/harness-init.sh --force' antes)"
    elif [ -f docs/00_VALIDATION.md ] && ! grep -q '\[preencher\]' docs/00_VALIDATION.md 2>/dev/null; then
      PHASE_GATE_MISSING="docs/00_VALIDATION.md já preenchido — use /resume para retomar"
    fi
    ;;
  prd) PHASE_GATE_MISSING=$(gate_doc_for "00" "docs/00_VALIDATION.md") ;;
  monetization-check) PHASE_GATE_MISSING=$(gate_doc_for "01" "docs/01_PRD.md") ;;
  market) PHASE_GATE_MISSING=$(gate_doc_for "02" "docs/02_MONETIZATION.md") ;;
  design) PHASE_GATE_MISSING=$(gate_doc_for "04" "docs/04_MARKET_AND_REFERENCES.md") ;;
  spec) PHASE_GATE_MISSING=$(gate_doc_for "05" "docs/05_DESIGN.md") ;;
  implement-backend|implement-frontend) PHASE_GATE_MISSING=$(gate_doc_for "06" "docs/06_SPECIFICATION.md") ;;
  release)
    PHASE_GATE_MISSING=$(gate_doc_for "07" "docs/07_IMPLEMENTATION.md")
    if [ -z "$PHASE_GATE_MISSING" ]; then
      PHASE_GATE_MISSING=$(gate_doc_for "08" "docs/08_SECURITY.md")
      [ -n "$PHASE_GATE_MISSING" ] && PHASE_GATE_MISSING="$PHASE_GATE_MISSING (rode /security-audit antes de /release)"
    fi
    # Enterprise: exige 14 + 15.
    if [ -z "$PHASE_GATE_MISSING" ]; then
      PHASE_GATE_MISSING=$(gate_doc_for "14" "docs/14_COMPLIANCE.md")
      [ -n "$PHASE_GATE_MISSING" ] && PHASE_GATE_MISSING="$PHASE_GATE_MISSING (trilha enterprise exige compliance)"
    fi
    if [ -z "$PHASE_GATE_MISSING" ]; then
      PHASE_GATE_MISSING=$(gate_doc_for "15" "docs/15_DPA.md")
      [ -n "$PHASE_GATE_MISSING" ] && PHASE_GATE_MISSING="$PHASE_GATE_MISSING (trilha enterprise exige DPA + pen-test)"
    fi
    ;;
  pr) PHASE_GATE_MISSING=$(gate_doc_for "07" "docs/07_IMPLEMENTATION.md") ;;
esac

if [ -n "$PHASE_GATE_MISSING" ]; then
  node scripts/harness-event.mjs gate "$CMD_NAME" "{\"blocked\":true,\"reason\":\"$PHASE_GATE_MISSING\"}" >/dev/null 2>&1 || true
  MSG="Comando /${CMD_NAME} requer ${PHASE_GATE_MISSING} preenchido. Conclua a fase anterior antes de prosseguir."
  jq -n --arg m "$MSG" '{continue:false, userMessage:$m}'
  exit 0
fi

if [ -z "$SKILLS" ]; then
  REMINDER="[skills-policy] Comando /${CMD_NAME} sem skills declaradas no frontmatter. Adicione skills antes de continuar (ver WORKFLOW.md → 'Skills obrigatórias por comando')."
else
  REMINDER="[skills-policy] /${CMD_NAME} requer carregar as skills: ${SKILLS}. Carregue-as via Read em .cursor/skills/<nome>/SKILL.md (ou .cursor/skills-web-excellence/) ANTES de executar o comando. Cruzar com docs/S03_SKILLS_INDEX.md para skills da fase atual."
fi

node scripts/harness-event.mjs command "$CMD_NAME" "{\"skills_required\":\"$SKILLS\"}" >/dev/null 2>&1 || true
ATTACH=$(jq -n --arg r "$REMINDER" --arg p "$PROMPT" '{continue:true, prompt: ($r + "\n\n" + $p)}')
echo "$ATTACH"
