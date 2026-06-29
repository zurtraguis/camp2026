---
name: observability-setup
description: >-
  Define SLOs, instrumentação OpenTelemetry, painéis Grafana e alertas
  Prometheus para a aplicação. Use ao preparar release, ao adicionar serviço
  novo ou ao identificar gap de visibilidade em incidente.
version: 1.0.0
---

# Observability Setup

Skill de orquestração para fechar o ciclo logs + métricas + traces antes do release. Atualiza addendum em `docs/13_RELEASE_READINESS.md`.

## Quando usar

- Antes de `/release` (gate complementar a `/security-audit`).
- Após introduzir novo serviço externo (DB, queue, cache, terceiros).
- Após incidente onde a causa raiz tomou >30min para diagnosticar.

## Patterns reusados

- `prometheus-configuration` — configuração de scraping e alertas.
- `grafana-dashboards` — dashboards padrão.
- `distributed-tracing` — propagação trace-id em chamadas inter-serviço.
- `slo-implementation` — definição e medição de SLOs.

## Roteiro

### 1. Definir SLOs (SLO worksheet)

Para cada user journey crítico (login, checkout, busca, etc.):

| Journey | SLI | SLO | Janela | Error budget |
|---|---|---|---|---|
| Login | p95 latência | < 500ms | 30 dias | 0.1% |
| Checkout | success rate | > 99.5% | 30 dias | 0.5% |
| ... | | | | |

### 2. Instrumentação

- HTTP server: middleware que registra `http_requests_total{method,route,status}` e `http_request_duration_seconds{...}`.
- Trace context propagado via `traceparent` (W3C).
- Logs estruturados JSON com `trace_id`, `span_id`, `correlation_id`.
- Tags obrigatórias: `service.name`, `service.version`, `deployment.environment`.

### 3. Painéis Grafana

Mínimo:
- **Service Overview**: RED (rate, errors, duration) + saturação.
- **SLO Burn Rate**: alerta quando burn rate >2x.
- **Top routes**: percentis e taxa de erro por rota.
- **Dependencies**: latência e erro por DB/cache/externo.

### 4. Alertas

| Alerta | Condição | Severidade | Runbook |
|---|---|---|---|
| `HighErrorRate` | `error_rate > 1%` por 5min | Page | `OPS02_RUNBOOK.md#high-error-rate` |
| `SLOBurnFast` | burn rate p95 > 14.4 (1h) | Page | `OPS02_RUNBOOK.md#slo-burn` |
| `DependencyDown` | health check terceiro falha 3x consecutivos | Page | runbook do componente |
| `LowMemory` | container > 85% mem | Ticket | `OPS02_RUNBOOK.md#capacity` |

### 5. Saída

Adicionar a `docs/13_RELEASE_READINESS.md` (seção "Observability"):
- Lista de SLOs ativos.
- Link para painel Grafana (path/URL).
- Alertas configurados (com receiver: PagerDuty/Slack/email).
- Confirmação de testes de fogo (alarme manual disparou ✅).

## Hard stops

- Não fechar gate de observability se **um** journey crítico estiver sem SLO.
- Não confiar em alerta nunca testado — exigir teste de fogo recente (<7 dias).

## Próximo passo

- `/performance-baseline` (estabelecer baseline numérica)
- `/progressive-rollout` (canary com base nos painéis)
