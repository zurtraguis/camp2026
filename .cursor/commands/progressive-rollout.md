---
id: cmd-progressive-rollout
title: Progressive Rollout — feature flags + canary
category: audit
model: sonnet
skills:
  - using-superpowers
  - progressive-rollout
  - architecture-decision-records
---

# `/progressive-rollout` — Configurar release gradual

Configura mecanismo de release progressivo (flag, canary, blue/green) e define critérios de promoção/rollback.

## Skills obrigatórias

- `/using-superpowers`
- `/progressive-rollout`
- `/architecture-decision-records` (registrar mecanismo escolhido como ADR)

## Pré-condições

- `/observability-setup` concluído (precisa de baseline numérico para gates).
- `/security-audit` concluído.

## Saída

- Addendum "Progressive Rollout" em `docs/13_RELEASE_READINESS.md`.
- ADR `docs/decisions/00NN-rollout-<feature>.md`.
- Script `scripts/rollout.sh` operacional (ou link para CI/CD que cumpre os mesmos comandos).
- Mapeamento alerta → ação (rollback/hold) em `OPS02_RUNBOOK.md`.

## Critério de aceite

- Mecanismo decidido e documentado.
- Estágios definidos (mín. 4: 10/30/50/100 ou flag por cohort).
- Critérios numéricos de promoção e rollback por estágio.
- Owner de decisão por estágio identificado.
