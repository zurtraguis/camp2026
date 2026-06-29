---
id: cmd-prd
title: PRD — requisitos de produto (Fase 1)
category: product
model: opus
skills:
  - using-superpowers
  - prd
  - context-driven-development
---

# `/prd` — Product Requirements Document (Fase 1)

## Skills obrigatórias
Carregar antes: `/using-superpowers` → `/prd` → `/context-driven-development`
(ver `docs/S03_SKILLS_INDEX.md` — Fase 1).

## Gate de entrada
- `docs/00_VALIDATION.md` aprovado (nota ≥ 7). O hook `enforce-skills` bloqueia
  `/prd` enquanto `docs/00_VALIDATION.md` não existir.

## Objetivo
Transformar a validação em requisitos de produto testáveis e claros para
engenharia e design.

## Passos obrigatórios
1. Ler `docs/00_VALIDATION.md` e extrair problema, público e proposta de valor.
2. Preencher `docs/01_PRD.md` com:
   - Escopo (in/out) e contexto.
   - Requisitos funcionais e não-funcionais (testáveis).
   - Prioridades (ex.: MoSCoW) e métricas de sucesso.
   - Riscos e premissas.
   - `docs/03_RESEARCH.md` quando houver integrações relevantes.
3. Validar que cada requisito é verificável.

## Gate de saída
Requisitos claros e testáveis → seguir para Fase 1b (`/monetization-check`).
