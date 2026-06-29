#!/usr/bin/env bash
# verify-harness-init.sh — Smoke-test do fluxo de inicialização do harness.
#
# Executa em sandbox temporário:
#   1. Copia o harness para /tmp/harness-init-test-<pid>/teste-solucao
#   2. Confirma que .harness-pristine existe
#   3. Roda harness-init.sh (modo auto)
#   4. Valida: package.json renomeado, README.md atualizado, DOCS_INDEX resetado,
#      .harness-pristine consumido, .harness-pristine.consumed criado
#   5. Limpa o sandbox
#
# Exit 0 = OK | Exit 1 = falha em algum check

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; NC='\033[0m'
ERRORS=0
ok()   { echo -e "  ${GRN}OK${NC}    $1"; }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; ERRORS=$((ERRORS+1)); }

SANDBOX="/tmp/harness-init-test-$$"
COPY="$SANDBOX/teste-solucao"

cleanup() { rm -rf "$SANDBOX" 2>/dev/null || true; }
trap cleanup EXIT

echo "━━━ 1. Preparar sandbox ━━━"
mkdir -p "$COPY"
# Copia subset suficiente para o smoke-test (evita node_modules / .git / .agents / .claude).
# Usa tar (portável: Linux/macOS/Git-Bash) em vez de rsync (ausente no Windows).
tar -C "$ROOT" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.next \
  --exclude='.harness-backup-*' \
  --exclude=.claude \
  --exclude=.agents/skills \
  -cf - . | tar -C "$COPY" -xf -
# Garante o marker .harness-pristine
touch "$COPY/.harness-pristine"
# Remove .harness-pristine.consumed se acidentalmente copiado
rm -f "$COPY/.harness-pristine.consumed"
ok "sandbox criado em $COPY"

echo ""; echo "━━━ 2. Estado inicial ━━━"
[ -f "$COPY/.harness-pristine" ] && ok ".harness-pristine presente" || fail ".harness-pristine ausente após copy"
[ -f "$COPY/scripts/harness-init.sh" ] && ok "harness-init.sh disponível" || { fail "harness-init.sh ausente"; exit 1; }

echo ""; echo "━━━ 3. Executar harness-init (modo auto) ━━━"
( cd "$COPY" && bash scripts/harness-init.sh 2>&1 ) | sed 's/^/    /' || true

echo ""; echo "━━━ 4. Validar estado pós-init ━━━"
[ ! -f "$COPY/.harness-pristine" ] && ok ".harness-pristine consumido" || fail ".harness-pristine ainda presente"
[ -f "$COPY/.harness-pristine.consumed" ] && ok ".harness-pristine.consumed criado" || fail ".harness-pristine.consumed não criado"

# package.json com nome correto
if [ -f "$COPY/package.json" ]; then
  NAME=$( (cd "$COPY" && node -e "console.log(require('./package.json').name || '')") 2>/dev/null || echo "")
  if [ "$NAME" = "teste-solucao" ]; then
    ok "package.json.name = teste-solucao"
  else
    fail "package.json.name = '$NAME' (esperado 'teste-solucao')"
  fi
fi

# README.md com nome no título
if [ -f "$COPY/README.md" ]; then
  HEAD=$(head -1 "$COPY/README.md")
  case "$HEAD" in
    *teste-solucao*|*"Teste Solucao"*|*"Teste-Solucao"*) ok "README.md título atualizado: $HEAD" ;;
    *) fail "README.md título não atualizado: $HEAD" ;;
  esac
fi

# DOCS_INDEX status resetado — verifica apenas linhas da tabela de status (que começam com `| `)
if [ -f "$COPY/docs/DOCS_INDEX.md" ]; then
  # Pula linhas de legenda; só verifica linhas que parecem entradas de tabela com 7+ pipes
  ACTIVE=$(awk -F'|' '/^\| / && NF>=8 { for(i=1;i<=NF;i++) if($i ~ /Em andamento|Concluído|Bloqueado/) { print $i; break } }' "$COPY/docs/DOCS_INDEX.md" | grep -v "Legenda" || true)
  if [ -n "$ACTIVE" ]; then
    fail "DOCS_INDEX ainda tem entradas com status ativo: $ACTIVE"
  else
    ok "DOCS_INDEX sem entradas com status ativo (resetado)"
  fi
fi

# Templates copiados para docs/00..07
for f in 00_VALIDATION 01_PRD 06_SPECIFICATION; do
  [ -f "$COPY/docs/$f.md" ] && ok "docs/$f.md presente" || fail "docs/$f.md ausente após init"
done

# .harness-config.json criado
if [ -f "$COPY/.harness-config.json" ]; then
  VERSION=$( (cd "$COPY" && node -e "console.log(require('./.harness-config.json').version)") 2>/dev/null || echo "?")
  ok ".harness-config.json criado (version=$VERSION)"
else
  fail ".harness-config.json ausente após init"
fi

echo ""; echo "━━━ 5. Idempotência (segunda execução não deve apagar tudo) ━━━"
( cd "$COPY" && bash scripts/harness-init.sh 2>&1 ) | sed 's/^/    /' || true
[ -f "$COPY/.harness-pristine.consumed" ] && ok "consumed ainda presente após 2ª execução" || fail "consumed removido em 2ª execução"

echo ""; echo "━━━ Resumo ━━━"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "  ${RED}✗ FALHOU — $ERRORS erros${NC}"; exit 1
else
  echo -e "  ${GRN}✓ OK — harness-init funcionando${NC}"; exit 0
fi
