#!/usr/bin/env bash
# harness-init.sh — Reset idempotente para uma nova solução baseada no harness.
#
# Modos:
#   bash scripts/harness-init.sh           # detecta primeira execução; só roda se .harness-pristine existir
#   bash scripts/harness-init.sh --force   # força reset (gera backup em .harness-backup-<ts>)
#   bash scripts/harness-init.sh --check   # imprime estado e sai (não escreve)
#
# Efeitos:
#   1. Renomeia campo `name` em package.json para o nome do diretório atual.
#   2. Substitui o título principal de README.md pelo nome do projeto.
#   3. Reseta a coluna "Status" da tabela em docs/DOCS_INDEX.md para "Pendente".
#   4. Apaga docs/00..07 (fase) que tenham template em docs/templates/ — recopia o template.
#   5. Marca pasta como consumida criando .harness-pristine.consumed e remove .harness-pristine.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="auto"
case "${1:-}" in
  --force) MODE="force" ;;
  --check) MODE="check" ;;
  "") ;;
  *) echo "Uso: $0 [--force|--check]" >&2; exit 2 ;;
esac

PRISTINE_MARK=".harness-pristine"
CONSUMED_MARK=".harness-pristine.consumed"

if [ "$MODE" = "check" ]; then
  if [ -f "$PRISTINE_MARK" ]; then
    echo "state: pristine (vai inicializar na próxima sessão)"
  elif [ -f "$CONSUMED_MARK" ]; then
    echo "state: initialized (já consumido em $(stat -c %y "$CONSUMED_MARK" 2>/dev/null | cut -d. -f1))"
  else
    echo "state: unknown (sem marker)"
  fi
  exit 0
fi

if [ "$MODE" = "auto" ] && [ ! -f "$PRISTINE_MARK" ]; then
  exit 0
fi

# Safeguard: a pasta base do harness (BASE-CURSOR-PRO*) não deve ser auto-inicializada.
# Use --force se você realmente quer resetar a pasta base.
BASENAME="$(basename "$ROOT")"
case "$BASENAME" in
  BASE-CURSOR-PRO*)
    if [ "$MODE" = "auto" ]; then
      echo "[harness-init] skip: pasta base do harness ($BASENAME). Use --force se intencional."
      exit 0
    fi
    ;;
esac

PROJECT_NAME="$(basename "$ROOT" | tr ' ()' '-' | sed -E 's/-+/-/g; s/^-|-$//g' | tr '[:upper:]' '[:lower:]')"
[ -z "$PROJECT_NAME" ] && PROJECT_NAME="vibecoding-app"

echo "[harness-init] projeto: $PROJECT_NAME"
echo "[harness-init] modo:    $MODE"

if [ "$MODE" = "force" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP=".harness-backup-$TS"
  mkdir -p "$BACKUP/docs"
  for f in docs/00_VALIDATION.md docs/01_PRD.md docs/02_MONETIZATION.md docs/03_RESEARCH.md docs/05_DESIGN.md docs/06_SPECIFICATION.md docs/07_IMPLEMENTATION.md; do
    [ -f "$f" ] && cp "$f" "$BACKUP/$f"
  done
  cp package.json "$BACKUP/package.json" 2>/dev/null || true
  cp README.md "$BACKUP/README.md" 2>/dev/null || true
  cp docs/DOCS_INDEX.md "$BACKUP/docs/DOCS_INDEX.md" 2>/dev/null || true
  echo "[harness-init] backup criado em $BACKUP"
fi

# 1. package.json — campo "name"
if [ -f package.json ] && grep -q '"name"' package.json; then
  node -e 'const fs=require("fs");const p="package.json";const d=JSON.parse(fs.readFileSync(p,"utf8"));d.name=process.argv[1];fs.writeFileSync(p,JSON.stringify(d,null,2)+"\n");console.log("[harness-init] package.json name = "+process.argv[1]);' "$PROJECT_NAME"
fi

# 2. README.md — título principal (primeira linha começando com # )
if [ -f README.md ]; then
  HUMAN_NAME="$(echo "$PROJECT_NAME" | sed -E 's/-/ /g' | awk '{for(i=1;i<=NF;i++)$i=toupper(substr($i,1,1))substr($i,2)}1')"
  node -e 'const fs=require("fs");const p="README.md";const t=fs.readFileSync(p,"utf8");const n=t.replace(/^# .+/m,"# "+process.argv[1]);if(n!==t){fs.writeFileSync(p,n);console.log("[harness-init] README.md titulo = "+process.argv[1]);}' "$HUMAN_NAME"
fi

# 3. DOCS_INDEX.md — status para Pendente
if [ -f docs/DOCS_INDEX.md ]; then
  node -e '
const fs=require("fs");
const p="docs/DOCS_INDEX.md";
const text=fs.readFileSync(p,"utf8");
function reset(line){
  const cols=line.split("|");
  if(cols.length>=10){ cols[4]=" Pendente "; cols[5]=" - "; }
  return cols.join("|");
}
const out=text.split("\n").map((l)=>{
  if(/^\| \d.* \|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|$/.test(l)) return reset(l);
  if(/^\| Final.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|.*\|$/.test(l)) return reset(l);
  return l;
}).join("\n");
if(out!==text){ fs.writeFileSync(p,out); console.log("[harness-init] docs/DOCS_INDEX.md status reset para Pendente"); }
'
fi

# 4. Docs de fase com template — recopiar
copy_template() {
  local target="$1"
  local template="docs/templates/$(basename "$target")"
  if [ -f "$template" ]; then
    cp "$template" "$target"
    echo "[harness-init] reset $target (do template)"
  fi
}

for target in \
  docs/00_VALIDATION.md \
  docs/01_PRD.md \
  docs/02_MONETIZATION.md \
  docs/03_RESEARCH.md \
  docs/05_DESIGN.md \
  docs/06_SPECIFICATION.md \
  docs/07_IMPLEMENTATION.md
do
  copy_template "$target"
done

# 5. .harness-config.json — gerar/atualizar
if [ -f scripts/harness-config.mjs ]; then
  STACK_ARG="${HARNESS_STACK:-nextjs}"
  TRACK_ARG="${HARNESS_TRACK:-standard}"
  node scripts/harness-config.mjs init --stack="$STACK_ARG" --track="$TRACK_ARG" >/dev/null \
    && echo "[harness-init] .harness-config.json (stack=$STACK_ARG, track=$TRACK_ARG)"
fi

# 6. Markers
rm -f "$PRISTINE_MARK"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$CONSUMED_MARK"
echo "[harness-init] OK — pronto. Próximo passo: /kickoff"
