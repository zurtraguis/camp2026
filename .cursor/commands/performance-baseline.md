---
id: cmd-performance-baseline
title: Performance Baseline — fixar números e detectar regressões
category: audit
model: sonnet
skills:
  - using-superpowers
  - performance-baseline
---

# `/performance-baseline` — Coletar e comparar baseline

Gera baseline de performance e compara contra `docs/internal/perf-baseline.json`. Falha se métricas estourarem `alert_at`.

## Skills obrigatórias

- `/using-superpowers`
- `/performance-baseline`

## Pré-condições

- Build do projeto bem-sucedido (`npm run build` ou equivalente do stack).
- Stack ativo confere com baseline existente (não comparar Next.js × api-only).

## Saída

- `docs/internal/perf-baseline.json` (criado ou atualizado).
- `.audit/lhci-current.json` (Next.js) ou benchmark equivalente.
- Addendum "Performance Baseline" em `docs/13_RELEASE_READINESS.md`.

## Critério de aceite

- Baseline persistido com timestamp e commit.
- Tabela comparativa baseline × atual em `13_RELEASE_READINESS.md`.
- Zero regressão >10% sem ADR de aceite.
