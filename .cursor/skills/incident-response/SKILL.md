---
name: incident-response
description: >-
  Define runbooks por componente, escalation tree, severidades (SEV-1/2/3),
  template de post-mortem blameless e ritual de on-call. Use ao preparar
  release, ao introduzir serviço crítico novo ou após incidente que mostrou
  ausência de runbook.
version: 1.0.0
---

# Incident Response

Skill de orquestração para preparar a equipe a responder incidentes com método. Atualiza `docs/OPS02_RUNBOOK.md` e referencia `docs/OPS03_POST_MORTEM.md`.

## Quando usar

- Antes de `/release`.
- Após incidente onde a resposta foi caótica (sem runbook, sem severidade clara).
- Ao adicionar componente crítico (DB primary, queue, gateway de pagamentos).

## Patterns reusados

- `incident-runbook-templates` — templates por componente.
- `on-call-handoff-patterns` — ritual de troca de plantão.
- `postmortem-writing` — template de PM blameless (Google SRE).

## Roteiro

### 1. Definir severidades

| Sev | Critério | Tempo de resposta | Quem é paginado |
|---|---|---|---|
| SEV-1 | usuário não consegue usar produto core; >50% afetado; perda de dados | 15min | on-call primário + secundário |
| SEV-2 | degradação funcional; <50% afetado; sem perda de dados | 1h | on-call primário |
| SEV-3 | bug ou degradação parcial; workaround conhecido | próximo dia útil | ticket |

### 2. Runbooks (mínimo)

Para cada alerta listado em `/observability-setup`, criar runbook em `docs/runbooks/<alerta>.md` com:

- **Sintoma** (o que o alerta significa).
- **Verificação rápida** (comandos para confirmar).
- **Mitigação imediata** (rollback, kill switch, scale up).
- **Diagnóstico aprofundado** (logs, traces, métricas).
- **Pós-mitigação** (notificar usuários, abrir PM).

### 3. Escalation tree

```
SEV-1 → on-call primário (page) → +15min sem ack → on-call secundário → +30min → engenharia gerência
SEV-2 → on-call primário (Slack) → +1h sem progresso → engenharia sênior
SEV-3 → ticket
```

Documentar em `docs/OPS02_RUNBOOK.md` quem é o primário/secundário por semana (rotation).

### 4. Ritual de handoff

Toda troca de plantão (semanal ou diária) consume:
- Lista de incidentes ativos.
- Releases em curso (canary stages).
- Alertas com freq > 1/dia (candidato a runbook).
- Itens deferred do plantão anterior.

Template em `on-call-handoff-patterns`.

### 5. Post-mortem blameless

Para todo SEV-1 e SEV-2 maior:
- PM em até 5 dias úteis usando `docs/OPS03_POST_MORTEM.md`.
- Ações com owner + prazo.
- Revisão pública na cerimônia semanal.

### 6. Saída

- `docs/OPS02_RUNBOOK.md` atualizado com severidades, escalation, lista de runbooks.
- Pasta `docs/runbooks/` com 1 runbook por alerta crítico.
- Confirmação em `docs/13_RELEASE_READINESS.md` (seção "Incident Response") de que rotação ativa, runbooks cobrem alertas e teste de fogo recente.

## Hard stops

- Sem rotação de on-call ativa → não fechar release readiness.
- Alerta crítico sem runbook → não promover canary além de 30%.

## Próximo passo

- `/release` (após Security + Observability + Performance + Rollout + Incident Response).
