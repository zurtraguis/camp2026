---
id: cmd-init-stack
title: Init Stack — selecionar stack base
category: project
model: sonnet
skills:
  - using-superpowers
  - context-driven-development
  - architecture-decision-records
---

# `/init-stack <id> [--track=<lite|standard|enterprise>]` — Selecionar stack base e trilha

Configura a árvore para um stack alternativo (api-only, mobile, cli). Stack default é `nextjs`.
A flag opcional `--track` ajusta a trilha em `.harness-config.json` (ver `docs/internal/TRACKS.md`).

## Pré-condições

- `.harness-pristine.consumed` presente (cópia inicializada).
- `docs/00_VALIDATION.md` preenchido (não confunde escolha de stack com kickoff).
- Diretório limpo de mudanças não commitadas (warn, não bloqueia).

## Skills obrigatórias

- `/using-superpowers`
- `/context-driven-development`
- `/architecture-decision-records` (registrar a escolha de stack como ADR)

## Stacks disponíveis

| ID | Status |
| --- | --- |
| `nextjs` | default — não precisa rodar este comando |
| `api-only` | beta |
| `mobile` | beta |
| `cli` | beta |

Detalhes: ver `stacks/<id>/STACK.md`.

## Passos

1. Validar argumento `<id>`. Se inválido, listar opções.
2. Ler `stacks/<id>/STACK.md` e expor pré-condições e diferenças.
3. Confirmar com usuário (lista de arquivos a serem alterados).
4. Aplicar:
   - Atualizar `package.json` com deps de `stacks/<id>/package.json.template`.
   - Copiar `stacks/<id>/scaffold/*` para a raiz.
   - Adicionar `HARNESS_STACK=<id>` ao `.env`.
   - Atualizar `.harness-config.json`: `node scripts/harness-config.mjs set stack <id>`.
   - Se `--track=<x>` fornecido: `node scripts/harness-config.mjs set track <x>`.
   - Registrar ADR `docs/decisions/0001-stack-<id>.md` (template MADR).
5. Atualizar `docs/DOCS_INDEX.md`: prefixo "Stack ativo: <id>" no topo.
6. Atualizar `WORKFLOW.md` seção "Stack ativo" com referência ao STACK.md escolhido.
7. Re-rodar `npm install`.

## Saída para o usuário

```
Stack ativo: <id>
Próximo passo: /resume (ou /prd se ainda não houver PRD)
Skills priorizadas: <lista>
```

## Reversão

```
/init-stack nextjs
```

Volta ao default. ADR anterior fica como histórico (não apaga).
