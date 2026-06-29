---
name: progressive-rollout
description: >-
  Configura feature flags, estratégia canary, kill switch e A/B framework para
  releases graduais. Define critérios de promoção e rollback. Use ao planejar
  release de mudanças de risco médio/alto, mudanças com efeito em produção
  difícil de reverter, ou experimentos.
version: 1.0.0
---

# Progressive Rollout

Skill de orquestração para reduzir blast radius de releases. Atualiza addendum em `docs/13_RELEASE_READINESS.md` e gera `scripts/rollout.sh` com helpers.

## Quando usar

- Mudança em fluxo crítico (login, checkout, cobrança).
- Migração de schema com cutover.
- Release com bug histórico no mesmo path (ver journal de falhas).
- Experimento A/B.

## Roteiro

### 1. Decidir mecanismo

| Mecanismo | Quando usar | Custo |
|---|---|---|
| Feature flag (LaunchDarkly/Unleash/custom) | mudanças no produto que ligam/desligam por usuário ou cohort | médio |
| Canary (10/30/50/100) | mudanças em runtime ou infra | médio |
| Blue/green | cutover atômico de versão | alto |
| Kill switch | recurso novo com rollback instantâneo | baixo |

### 2. Critérios de promoção (gates)

Para cada estágio (10%, 30%, 50%, 100%) definir:

| Métrica | Limite | Janela | Ação se violar |
|---|---|---|---|
| Error rate p95 | ≤ baseline + 0.2pp | 15min | hold |
| Latência p95 | ≤ baseline × 1.10 | 15min | hold |
| Custo por 1k req | ≤ baseline × 1.20 | 30min | rollback |
| Reclamação suporte | 0 | toda janela | rollback |

### 3. Plano de rollback

- Tempo alvo de rollback: <5min.
- Mecanismo: revert do flag (instantâneo) ou revert do deploy (script `scripts/rollout.sh rollback <release>`).
- Smoke test pós-rollback: lista mínima de fluxos a validar.

### 4. Helper script

`scripts/rollout.sh` expõe:
- `promote <stage>` — avança ao próximo estágio (10→30→50→100).
- `hold` — pausa promoção mantendo distribuição atual.
- `rollback <release>` — desliga o flag ou faz revert do deploy.
- `status` — lê painel Grafana (via API) e mostra métricas atuais vs baseline.

### 5. Saída

Adicionar a `docs/13_RELEASE_READINESS.md` (seção "Progressive Rollout"):
- Mecanismo escolhido e justificativa.
- Tabela de critérios por estágio.
- Tempo alvo de rollback e plano.
- Quem aciona cada decisão (on-call, SEV-2 escalation, etc.).

## Hard stops

- Sem feature flag/canary para mudança em fluxo de cobrança ou auth.
- Sem critério numérico de promoção — não promova "porque parece OK".

## Próximo passo

- `/release` com plano de rollout em mãos.
