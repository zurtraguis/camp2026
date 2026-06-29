#!/usr/bin/env bash
# verify-docs.sh — Verificação de saúde do framework VibeCoding v3
# Uso: bash scripts/verify-docs.sh
# Exit 0 = OK | Exit 0+warns = revisar antes do PR | Exit 1 = bloquear

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; NC='\033[0m'
ERRORS=0; WARNINGS=0

ok()   { echo -e "  ${GRN}OK${NC}    $1"; }
warn() { echo -e "  ${YEL}WARN${NC}  $1"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; ERRORS=$((ERRORS+1)); }
skip() { echo -e "  ${YEL}SKIP${NC}  $1"; }

# Trilha ativa (lite/standard/enterprise). Default: standard.
TRACK="standard"
if command -v node >/dev/null 2>&1 && [ -f scripts/track-resolver.mjs ]; then
  TRACK=$(node scripts/track-resolver.mjs current-track 2>/dev/null || echo "standard")
fi
echo "  Trilha ativa: $TRACK"

# phase_required <NN> → exit 0 se a fase NN é exigida na trilha ativa.
phase_required() {
  if [ ! -f scripts/track-resolver.mjs ]; then return 0; fi
  node scripts/track-resolver.mjs has "$TRACK" "$1" >/dev/null 2>&1
}

# ── 1. EXISTÊNCIA DOS DOCS BASE ──────────────────────────────────────────────
echo ""; echo "━━━ 1. Docs de fase (track-aware) ━━━"
# (fase_NN, doc) pares.
PHASE_PAIRS=(
  "04:docs/04_MARKET_AND_REFERENCES.md"
  "08:docs/08_SECURITY.md"
  "09:docs/09_TESTS.md"
  "10:docs/10_DEBUG.md"
  "11:docs/11_UX_AUDIT.md"
  "12:docs/12_THREAT_MODEL.md"
  "13:docs/13_RELEASE_READINESS.md"
  "14:docs/14_COMPLIANCE.md"
  "15:docs/15_DPA.md"
)
for pair in "${PHASE_PAIRS[@]}"; do
  num="${pair%%:*}"; f="${pair##*:}"
  if phase_required "$num"; then
    [ -f "$f" ] && ok "$f" || fail "$f — AUSENTE (fase $num exigida em trilha $TRACK)"
  else
    skip "$f — fase $num não exigida em trilha $TRACK"
  fi
done

echo ""; echo "━━━ 1b. Docs de suporte ━━━"
SUPPORT_DOCS=(
  docs/DOCS_INDEX.md
  docs/S01_QUICK_START.md docs/S02_PROMPT_PACKS.md docs/S03_SKILLS_INDEX.md
  docs/S04_IMAGE_GENERATION.md docs/S05_DESIGN_REFERENCES.md
)
for f in "${SUPPORT_DOCS[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f — AUSENTE"
done

echo ""; echo "━━━ 1c. Docs de operações ━━━"
OPS_DOCS=(
  docs/OPS01_DEPLOYMENT.md docs/OPS02_RUNBOOK.md docs/OPS03_POST_MORTEM.md
)
for f in "${OPS_DOCS[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f — AUSENTE"
done

echo ""; echo "━━━ 1d. Docs internos ━━━"
INT_DOCS=(
  docs/INT01_PLANO_ARQUITETURA.md docs/INT02_PLANO_CONCLUSAO.md
  docs/INT03_AI_DOCS_INDEXING.md
)
for f in "${INT_DOCS[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f — AUSENTE"
done

echo ""; echo "━━━ 1e. Templates ━━━"
TEMPLATES=(
  docs/templates/README.md
  docs/templates/00_VALIDATION.md docs/templates/01_PRD.md
  docs/templates/02_MONETIZATION.md docs/templates/03_RESEARCH.md
  docs/templates/05_DESIGN.md docs/templates/06_SPECIFICATION.md
  docs/templates/07_IMPLEMENTATION.md
)
for f in "${TEMPLATES[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f — AUSENTE"
done

echo ""; echo "━━━ 1f. Estrutura essencial ━━━"
ESSENTIAL=(
  WORKFLOW.md README.md
  docs/decisions/README.md docs/decisions/template-madr.md
  .cursor/hooks.json package.json .env.example
)
for f in "${ESSENTIAL[@]}"; do
  [ -f "$f" ] && ok "$f" || warn "$f — AUSENTE"
done

# ── 2. VEREDITO NOS DOCS DE QUALIDADE ────────────────────────────────────────
echo ""; echo "━━━ 2. Veredito nos docs de qualidade ━━━"
cv() {
  local file="$1" pat="$2" lbl="$3"
  [ ! -f "$file" ] && { warn "$lbl — arquivo não encontrado"; return; }
  grep -qiE "$pat" "$file" && ok "$lbl — veredito encontrado" || fail "$lbl — sem veredito (esperado: $pat)"
}
phase_required "08" && cv "docs/08_SECURITY.md"          "APROVADO|REPROVADO|READY|NOT READY"      "08_SECURITY" || skip "08_SECURITY (não exigido em trilha $TRACK)"
phase_required "09" && cv "docs/09_TESTS.md"             "APROVADO|REPROVADO|READY|NOT READY|VERDE" "09_TESTS" || skip "09_TESTS (não exigido em trilha $TRACK)"
phase_required "10" && cv "docs/10_DEBUG.md"             "PRONTO|NÃO PRONTO|READY|NOT READY"       "10_DEBUG" || skip "10_DEBUG (não exigido em trilha $TRACK)"
phase_required "11" && cv "docs/11_UX_AUDIT.md"          "READY|NOT READY"                          "11_UX_AUDIT" || skip "11_UX_AUDIT (não exigido em trilha $TRACK)"
phase_required "12" && cv "docs/12_THREAT_MODEL.md"      "READY|NOT READY"                          "12_THREAT_MODEL" || skip "12_THREAT_MODEL (não exigido em trilha $TRACK)"
phase_required "13" && cv "docs/13_RELEASE_READINESS.md" "GO|NO-GO|GO WITH RISK"                    "13_RELEASE_READINESS" || skip "13_RELEASE (não exigido em trilha $TRACK)"
phase_required "14" && cv "docs/14_COMPLIANCE.md"        "APROVADO|GO|GO WITH RISK|NO-GO"           "14_COMPLIANCE" || skip "14_COMPLIANCE (apenas trilha enterprise)"
phase_required "15" && cv "docs/15_DPA.md"               "APROVADO|GO|GO WITH RISK|NO-GO"           "15_DPA" || skip "15_DPA (apenas trilha enterprise)"

# ── 3. PLACEHOLDERS EM DOCS CRÍTICOS ─────────────────────────────────────────
echo ""; echo "━━━ 3. Placeholders [preencher] ━━━"
CRITICAL=(docs/08_SECURITY.md docs/09_TESTS.md docs/10_DEBUG.md
          docs/11_UX_AUDIT.md docs/12_THREAT_MODEL.md docs/13_RELEASE_READINESS.md)
for f in "${CRITICAL[@]}"; do
  [ ! -f "$f" ] && continue
  COUNT=$(grep -ci "\[preencher\]" "$f" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 5 ]; then
    warn "$f — $COUNT campos [preencher] (DRAFT?)"
  elif [ "$COUNT" -gt 0 ]; then
    ok "$f — $COUNT campo(s) [preencher] (aceitável)"
  else
    ok "$f — sem [preencher]"
  fi
done

# ── 4. GATE DE MONETIZAÇÃO ───────────────────────────────────────────────────
echo ""; echo "━━━ 4. Gate de monetização ━━━"
if [ -f "docs/templates/02_MONETIZATION.md" ]; then
  ok "Template de monetização existe"
else
  fail "Template docs/templates/02_MONETIZATION.md — AUSENTE"
fi

# ── 5. GATES TÉCNICOS ────────────────────────────────────────────────────────
echo ""; echo "━━━ 5. Gates técnicos ━━━"
if [ -f "package.json" ]; then
  npm run typecheck --silent 2>/dev/null && ok "typecheck" || warn "typecheck — falhou ou não configurado"
  npm run lint --silent 2>/dev/null && ok "lint" || warn "lint — falhou ou não configurado"
  AUDIT=$(npm audit --audit-level=critical 2>&1 || true)
  echo "$AUDIT" | grep -q "found 0 vulnerabilities" && ok "npm audit — sem críticos" \
    || (echo "$AUDIT" | grep -qiE "critical" && fail "npm audit — críticos encontrados" || ok "npm audit — sem críticos (pode haver moderados)")
else
  warn "package.json não encontrado — gates técnicos ignorados"
fi

# ── 6. CONSISTÊNCIA DO DOCS_INDEX ────────────────────────────────────────────
echo ""; echo "━━━ 6. Consistência do DOCS_INDEX ━━━"
if [ -f "docs/DOCS_INDEX.md" ]; then
  grep -q "S03_SKILLS_INDEX" docs/DOCS_INDEX.md && ok "DOCS_INDEX → S03_SKILLS_INDEX" || warn "DOCS_INDEX não referencia S03_SKILLS_INDEX.md"
  grep -q "13_RELEASE"       docs/DOCS_INDEX.md && ok "DOCS_INDEX → 13_RELEASE"       || warn "DOCS_INDEX não referencia 13_RELEASE_READINESS.md"
  grep -q "02_MONETIZATION"  docs/DOCS_INDEX.md && ok "DOCS_INDEX → 02_MONETIZATION"  || warn "DOCS_INDEX não referencia 02_MONETIZATION.md"
else
  fail "docs/DOCS_INDEX.md — AUSENTE"
fi

# ── 7. ESTRUTURA CURSOR ──────────────────────────────────────────────────────
echo ""; echo "━━━ 7. Estrutura .cursor/ ━━━"
CURSOR_DIRS=(
  .cursor/rules/core .cursor/rules/framework .cursor/rules/domain .cursor/rules/security
  .cursor/rules/stack .cursor/rules/quality .cursor/rules/design
  .cursor/hooks .cursor/commands .cursor/skills .cursor/skills-web-excellence
)
for d in "${CURSOR_DIRS[@]}"; do
  [ -d "$d" ] && ok "$d/" || warn "$d/ — AUSENTE"
done

# ── 7b. Kit Web Excellence (docs) ────────────────────────────────────────────
echo ""; echo "━━━ 7b. Docs Web Excellence ━━━"
[ -f "docs/web-excellence/DOCS_INDEX.md" ] && ok "docs/web-excellence/DOCS_INDEX.md" || warn "docs/web-excellence/DOCS_INDEX.md — AUSENTE"
[ -f "docs/web-excellence/framework-manifest.json" ] && ok "framework-manifest.json (web-excellence)" || warn "docs/web-excellence/framework-manifest.json — gere com npm run manifest"

# ── 8. SKILLS INSTALADAS (amostra) ───────────────────────────────────────────
echo ""; echo "━━━ 8. Skills instaladas (amostra) ━━━"
CORE_SKILLS=(using-superpowers brainstorming validate prd market design spec implement-backend implement-frontend test-writer debugger release pr)
for s in "${CORE_SKILLS[@]}"; do
  if [ -d ".cursor/skills/$s" ] || [ -d ".agents/skills/$s" ] || [ -L ".cursor/skills/$s" ]; then
    ok "$s"
  else
    warn "SKILL AUSENTE: $s"
  fi
done
[ -d ".cursor/skills-web-excellence/foundations" ] && ok "skills-web-excellence (kit páginas)" || warn "skills-web-excellence — AUSENTE"

# ── 9. SKILLS OPERACIONAIS (D1–D5) ───────────────────────────────────────────
echo ""; echo "━━━ 9. Skills operacionais (D1–D5) ━━━"
OPS_SKILLS=(security-audit observability-setup performance-baseline progressive-rollout incident-response)
for s in "${OPS_SKILLS[@]}"; do
  [ -f ".cursor/skills/$s/SKILL.md" ] && ok "$s" || fail "SKILL AUSENTE: $s"
done
OPS_COMMANDS=(security-audit observability-setup performance-baseline progressive-rollout incident-response kickoff resume init-stack)
for c in "${OPS_COMMANDS[@]}"; do
  [ -f ".cursor/commands/$c.md" ] && ok "/$c" || fail "COMMAND AUSENTE: /$c"
done

# ── 10. KICKOFF & STACKS ─────────────────────────────────────────────────────
echo ""; echo "━━━ 10. Kickoff & Stacks ━━━"
[ -f "scripts/harness-init.sh" ] && ok "scripts/harness-init.sh" || fail "scripts/harness-init.sh — AUSENTE"
[ -x "scripts/harness-init.sh" ] && ok "harness-init.sh executável" || warn "harness-init.sh sem +x"
STACKS=(nextjs api-only mobile cli)
for s in "${STACKS[@]}"; do
  [ -f "stacks/$s/STACK.md" ] && ok "stacks/$s/STACK.md" || warn "stacks/$s/STACK.md — AUSENTE"
done

# ── 11. WORKFLOW.md referencia ciclo D1–D5 ───────────────────────────────────
echo ""; echo "━━━ 11. Refs operacionais em WORKFLOW.md ━━━"
if [ -f "WORKFLOW.md" ]; then
  for ref in security-audit observability-setup performance-baseline progressive-rollout incident-response kickoff; do
    grep -q "/$ref" WORKFLOW.md && ok "WORKFLOW.md → /$ref" || warn "WORKFLOW.md sem /$ref"
  done
fi

# ── RESUMO ────────────────────────────────────────────────────────────────────
echo ""; echo "━━━ Resumo ━━━"
echo -e "  Erros:   ${RED}$ERRORS${NC}   Avisos: ${YEL}$WARNINGS${NC}"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "\n  ${RED}✗ FALHOU — corrigir antes de avançar de fase${NC}"; exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "\n  ${YEL}⚠ OK com avisos — revisar antes do PR${NC}"; exit 0
else
  echo -e "\n  ${GRN}✓ OK — todos os checks passaram${NC}"; exit 0
fi
