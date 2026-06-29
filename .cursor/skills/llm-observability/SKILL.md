---
name: llm-observability
description: Observabilidade de produtos LLM-powered — tracing, eval harness, drift detection, cost tracking. Essencial em apps que usam OpenAI/Anthropic/Google APIs em produção.
---

# llm-observability

## Quando usar

- Fase 07 (Implementation) ao adicionar chamada para LLM.
- Fase 08 (Security) — auditar prompts e dados que vão à API.
- Fase 13 (Release Readiness) — gates de qualidade antes do release.

## Pilares

### 1. Tracing
- Logar **prompt completo** (sanitizado de PII) + resposta + latência + cost.
- Correlation ID por request → tracear cadeia agent→subagent→tool.
- Stack sugerida: OpenTelemetry + Langfuse/Helicone/Phoenix.

### 2. Eval harness
- Conjunto de **gold cases** (input → output esperado).
- Rodar em CI sob mudança de prompt/model/tooling.
- Métricas: exact-match, semantic similarity (embedding), LLM-as-judge.

### 3. Drift detection
- Comparar distribuição de respostas (latência, tokens, score de qualidade) por janela.
- Alertar em desvios > 2σ.

### 4. Cost tracking
- Por feature, por usuário, por modelo.
- Budget hard-limit por dia/mês.

## Schema mínimo de log

```ts
{
  trace_id: "uuid",
  user_id: "hash",
  feature: "summarize-doc",
  model: "<resolved-via-resolve-model.mjs>",
  prompt_tokens: 1234,
  completion_tokens: 456,
  latency_ms: 800,
  cost_usd: 0.012,
  pii_redacted: true,
  result_score: 0.87,    // do eval harness
  ts: "ISO8601"
}
```

## Anti-padrões

- Logar prompt sem redacting PII
- Trocar de modelo sem rodar eval harness
- Não ter alerta de cost spike
- Eval com <20 casos
