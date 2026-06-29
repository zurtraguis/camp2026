---
name: performance-baseline
description: >-
  Estabelece e compara baseline de performance (Lighthouse CI, Web Vitals,
  bundle size). Persiste métricas em docs/internal/perf-baseline.json para uso
  como gate em PRs subsequentes. Use antes de /release ou ao introduzir
  mudança suspeita de regressão de performance.
version: 1.0.0
---

# Performance Baseline

Skill de orquestração para fixar números de performance e detectar regressões.

## Quando usar

- Antes de `/release` (gate complementar a security e observability).
- Após mudança em rota crítica (TTFB, LCP, JS bundle).
- Antes de promover canary do estágio 10% para 30%.

## Patterns reusados

- `web-performance-optimization` (web-excellence) — checklist de otimização.
- `audit-lighthouse.sh` (já existe em `scripts/`) — runner Lighthouse local.

## Roteiro

### 1. Coletar baseline atual

#### Web (HARNESS_STACK=nextjs)

```bash
npm run build
bash scripts/audit-lighthouse.sh > .audit/lhci-current.json
```

Capturar:
- LCP, FID/INP, CLS (Web Vitals).
- TTFB.
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO).
- Bundle size por chunk (`.next/analyze` ou `next-bundle-analyzer`).

#### API (HARNESS_STACK=api-only)

- p50/p95/p99 latência por rota (via Prometheus snapshot ou benchmark com `k6`/`autocannon`).
- Throughput máximo sem degradação (RPS para erro <0.1%).

#### Mobile / CLI

- App: tempo de cold start, frame drop %, JS thread blocked time.
- CLI: tempo de execução de comando representativo (ex: `--help`, `do something`).

### 2. Persistir

```json
// docs/internal/perf-baseline.json
{
  "version": "1.0",
  "stack": "nextjs",
  "captured_at": "2026-04-27T12:00:00Z",
  "commit": "abc123",
  "thresholds": {
    "lcp_ms": { "value": 1800, "alert_at": 2200 },
    "inp_ms": { "value": 150, "alert_at": 200 },
    "cls":    { "value": 0.05, "alert_at": 0.10 },
    "perf_score": { "value": 95, "alert_at": 90 }
  }
}
```

### 3. Gate em PRs

`scripts/verify-perf.sh` (a criar quando aplicável) compara `lhci-current.json` com `perf-baseline.json`. Falha se qualquer métrica estourar o `alert_at`.

### 4. Saída

Adicionar a `docs/13_RELEASE_READINESS.md` (seção "Performance Baseline"):
- Tabela de métricas: baseline vs atual vs threshold.
- Lista de regressões > 5% com plano (corrigir / aceitar / monitorar).
- Link para relatório Lighthouse mais recente.

## Hard stops

- Não promover canary se regressão >10% em métrica crítica sem justificativa.
- Não fechar gate se baseline ausente (precisamos de número para comparar no futuro).

## Próximo passo

- `/progressive-rollout` (canary com critério numérico).
- `/release`.
