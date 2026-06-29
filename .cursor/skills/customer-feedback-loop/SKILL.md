---
name: customer-feedback-loop
description: Coleta → triagem → priorização de feedback de usuários. Estrutura de canais, taxonomia, SLA de resposta, integração com roadmap.
---

# customer-feedback-loop

## Quando usar

- Fase 02 (Monetization) — validar pricing/objections com usuários reais.
- Fase 11 (UX Audit) — capturar pain points pré-release.
- Loop contínuo pós-release.

## Canais (priorizar 2-3 no início)

| Canal              | Latência   | Volume     | Qualidade   |
|--------------------|------------|------------|-------------|
| Suporte (ticket)   | horas      | médio      | alta        |
| In-app (NPS/CSAT)  | dias       | alto       | média       |
| Reviews (app store)| semanas    | médio      | alta        |
| Entrevistas 1:1    | semanas    | baixo      | excelente   |
| Comunidade (Discord/Slack)| min | alto       | mista       |

## Taxonomia (etiquetas)

- **Tipo**: bug | feature-request | question | praise | churn-signal
- **Área**: auth | dashboard | billing | onboarding | mobile | docs
- **Severidade**: blocker | high | medium | low
- **Frequência**: 1× | <10 | 10-100 | >100 (ranking de demanda)

## Workflow

1. **Captura** → todo feedback no mesmo backlog (single source).
2. **Triagem** (semanal): tag + severidade + área.
3. **Padrões** (mensal): identificar trends (>10 menções similares).
4. **Decisão**:
   - Bug: ticket no engineering board.
   - Feature: entrar em validação (Fase 00) antes do roadmap.
   - Churn-signal: outreach proativo + entrevista.
5. **Loop fechado**: notificar usuário quando issue dele é resolvida.

## SLA sugerido

- Resposta inicial < 24h em canal de suporte
- Bug confirmação < 48h
- Feature request: status update mensal

## Anti-padrões

- Backlog em local separado (perde contexto)
- Não fechar loop com usuário (queima trust)
- Priorizar por volume sem severidade
- Ignorar reviews 1-2 estrelas
