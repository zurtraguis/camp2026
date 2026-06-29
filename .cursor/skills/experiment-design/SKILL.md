---
name: experiment-design
description: Estruturar A/B tests com hipótese, métrica primária, sample size, duração e análise estatística. Evita decisões com base em micro-amostras ou métricas vaidosas.
---

# experiment-design

## Quando usar

- Fase 02 (Monetization) — testar pricing/copy/CTA.
- Fase 11 (UX Audit) — validar mudanças de UX.
- Sempre que mudança tem impacto em conversão/retenção.

## Template de experimento

```yaml
nome: home-cta-color-2026-05
hipotese: Mudar CTA hero de azul→laranja aumenta CVR primário de signup em 10%+
metrica_primaria: signup_conversion (visitor → signup)
metricas_guardrail:
  - bounce_rate (max +5%)
  - avg_session_duration (min -10%)
sample_size_min: 12000  # MDE 5%, alpha 0.05, power 0.8
duracao_min_dias: 7
duracao_max_dias: 21
hash_split: deterministic by user_id
analise: two-tailed z-test ao fim
decisao:
  - winner: ship + monitor 14d
  - inconclusivo: ship neutro (controle), arquivar
  - perdedor: rollback + post-mortem
```

## Cuidados

- **Sample size mínimo**: usar calculadora (MDE, alpha 0.05, power 0.8). Não pare cedo.
- **Peeking inflate-α**: não olhar resultados antes do mínimo, ou use sequential testing.
- **Métricas guardrail**: sempre tenha 2-3 que podem regredir.
- **Segmentação**: rode mesmo experimento em segmentos críticos (mobile vs desktop, novo vs retornante).
- **Holdout permanente**: 5% dos usuários nunca vê experimento — para detectar decay.

## Anti-padrões

- Testar 10 variantes ao mesmo tempo (multiple comparison)
- Métrica vaidosa (pageviews, time-on-site sem contexto)
- Decisão por significância prática sem teste estatístico
- Não documentar a hipótese inicial
