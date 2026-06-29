#!/usr/bin/env bash
# sessionStart — Quando uma sessão começa:
#   1. Se for cópia nova do harness (.harness-pristine presente), executa
#      scripts/harness-init.sh para resetar nome do projeto e docs de fase.
#   2. Detecta a fase VibeCoding atual (último doc preenchido).
#   3. Emite banner orientador para o agente.

set -euo pipefail

INIT_LOG=""
if [ -f .harness-pristine ]; then
  if [ -x scripts/harness-init.sh ]; then
    INIT_LOG=$(bash scripts/harness-init.sh 2>&1 || true)
  fi
fi

PHASE="desconhecida"
for f in \
  docs/13_RELEASE_READINESS.md \
  docs/12_THREAT_MODEL.md \
  docs/11_UX_AUDIT.md \
  docs/10_DEBUG.md \
  docs/09_TESTS.md \
  docs/08_SECURITY.md \
  docs/07_IMPLEMENTATION.md \
  docs/06_SPECIFICATION.md \
  docs/05_DESIGN.md \
  docs/04_MARKET_AND_REFERENCES.md \
  docs/02_MONETIZATION.md \
  docs/01_PRD.md \
  docs/00_VALIDATION.md
do
  if [ -f "$f" ] && [ "$(wc -c <"$f")" -gt 200 ]; then
    PHASE=$(basename "$f" .md)
    break
  fi
done

if [ -f .harness-pristine.consumed ] && [ ! -f docs/00_VALIDATION.md ]; then
  STATE="kickoff-pending"
elif [ -f .harness-pristine.consumed ] && [ "$PHASE" = "00_VALIDATION" ]; then
  STATE="kickoff-or-resume"
else
  STATE="resume"
fi

case "$STATE" in
  kickoff-pending)
    NEXT_HINT="Use /kickoff para iniciar nova solução (gera docs/00_VALIDATION.md)."
    ;;
  kickoff-or-resume)
    NEXT_HINT="Use /kickoff (re-iniciar validação) ou /resume (continuar a partir da fase atual)."
    ;;
  *)
    NEXT_HINT="Use /resume para identificar a próxima ação a partir do DOCS_INDEX."
    ;;
esac

# Lê config (versão/stack/trilha) se disponível, sem falhar se ausente
CONFIG_LINE=""
if [ -f .harness-config.json ] && command -v node >/dev/null 2>&1; then
  CONFIG_LINE=$(node -e "
try {
  const c = require('./.harness-config.json');
  console.log('version=' + c.version + ' | stack=' + c.stack + ' | track=' + c.track);
} catch {}
" 2>/dev/null || echo "")
fi

MSG=$(printf '%s\n' \
  "[harness] Cópia inicializada: $([ -f .harness-pristine.consumed ] && echo "sim ($(cat .harness-pristine.consumed))" || echo "não")" \
  "${CONFIG_LINE:+[harness] $CONFIG_LINE}" \
  "[harness] Fase detetada: ${PHASE} | estado: ${STATE}" \
  "[harness] ${NEXT_HINT}" \
  "[bootstrap] Sempre rode /using-superpowers antes de qualquer skill manual." \
  "[bootstrap] Leituras orientadoras: .cursorrules → WORKFLOW.md → docs/DOCS_INDEX.md → docs/S01_QUICK_START.md → docs/S03_SKILLS_INDEX.md." \
  "[bootstrap] Política: todo .cursor/commands/**/*.md exige carregar as skills do frontmatter."
)

if [ -n "$INIT_LOG" ]; then
  MSG=$(printf '%s\n%s' "$MSG" "[harness-init log]
$INIT_LOG")
fi

node scripts/harness-event.mjs hook "session-bootstrap" "{\"phase\":\"$PHASE\",\"state\":\"$STATE\"}" >/dev/null 2>&1 || true
jq -n --arg m "$MSG" '{userMessage:$m}'
