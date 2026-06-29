---
id: cmd-monetization-check
title: Verificar gate de monetização
category: project
model: sonnet
skills:
  - using-superpowers
  - brainstorming
  - writing-plans
---

# `/monetization-check` — Verificar gate de monetização

## Skills obrigatórias
Carregar antes: `/using-superpowers`, `/brainstorming`, `/writing-plans`.

## Objetivo
Verificar se o modelo de monetizacao foi definido antes de avancar para Market/Design.

## Gate condicional por project_type
Antes de qualquer verificacao, rode `node scripts/phase-state.mjs gate-policy monetization-check`:
- `skip` (project_type ∈ {internal-app, landing, single-page, blog}): registrar pula automatico via `node scripts/phase-state.mjs set --skip-gate=monetization-check:project_type` e retornar `SKIPPED`.
- `optional` (project_type=repository-catalog): perguntar uma vez se ha lead-gen pago; se nao, marcar `SKIPPED`.
- `required` (saas, ecommerce): seguir passos abaixo.

## Passos obrigatorios
1. Verificar existencia de `docs/02_MONETIZATION.md`
2. Se existe, verificar:
   - [ ] Modelo escolhido esta preenchido (nao placeholder)
   - [ ] Justificativa documentada
   - [ ] Integracao tecnica definida (Stripe/Paddle/outro)
   - [ ] Tiers/planos definidos (se aplicavel)
3. Se nao existe ou incompleto:
   - BLOQUEAR avanco para Fase 1c (Market) ou Fase 1D (Design)
   - Orientar para preencher usando template `docs/templates/02_MONETIZATION.md`
4. Retornar:
   - Status: APROVADO ou BLOQUEADO
   - Itens faltantes (se BLOQUEADO)
