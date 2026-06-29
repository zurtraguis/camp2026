---
id: cmd-observability-setup
title: Observability Setup — SLOs, painéis, alertas
category: audit
model: opus
skills:
  - using-superpowers
  - observability-setup
  - prometheus-configuration
  - grafana-dashboards
  - distributed-tracing
---

# `/observability-setup` — Configurar observabilidade

Define SLOs, instrumenta OpenTelemetry, gera painéis Grafana e alertas Prometheus. Atualiza addendum de Observability em `docs/13_RELEASE_READINESS.md`.

## Skills obrigatórias

- `/using-superpowers`
- `/observability-setup`
- `/prometheus-configuration`
- `/grafana-dashboards`
- `/distributed-tracing`

## Pré-condições

- `docs/06_SPECIFICATION.md` definindo journeys críticos (para gerar SLOs).
- `docs/07_IMPLEMENTATION.md` com handlers principais já implementados.

## Saída

- Painel Grafana versionado em `infra/grafana/<service>.json` (ou link permanente).
- Regras Prometheus em `infra/prometheus/<service>-rules.yml`.
- Addendum de Observability em `docs/13_RELEASE_READINESS.md`.
- Atualização em `OPS02_RUNBOOK.md` referenciando os runbooks por alerta.

## Critério de aceite

- Todos os journeys críticos com SLO definido.
- ≥4 alertas (HighErrorRate, SLOBurnFast, DependencyDown, capacity).
- Teste de fogo recente (<7 dias) registrado em `docs/13_RELEASE_READINESS.md`.
