---
id: cmd-internal-stakeholder-map
title: Mapa de stakeholders (app interno)
category: project
model: sonnet
skills:
  - using-superpowers
  - journey-mapping
  - ux-research
  - secrets-management
  - architecture-decision-records
---

# `/internal-stakeholder-map` — Mapa de stakeholders (substitui /market para internal-app)

## Skills obrigatórias
`/using-superpowers`, `/journey-mapping`, `/ux-research`, `/secrets-management`, `/architecture-decision-records`.

## Quando usar
Substitui `/market` quando `project_type=internal-app`. Não há mercado externo, mas há stakeholders e sistemas integrados que pautam decisões.

## Objetivo
Gerar `docs/04_MARKET_AND_REFERENCES.md` (mesmo arquivo do market, conteúdo diferente) com:
- **Stakeholders**: sponsor, owner técnico, usuários-tipo, time de operação, segurança/compliance.
- **Sistemas integrados**: SSO, ERP, CRM, data warehouse, ticketing, e-mail corporativo (cada um com owner e SLA).
- **Dados sensíveis manipulados**: classificação (público, interno, restrito, secreto), base legal LGPD, retenção.
- **Restrições corporativas**: padrões de auth, política de cookies, log retention, ambientes (dev/staging/prod), VPN.
- **Ferramentas internas equivalentes** (build vs reuse): já existe planilha/no-code resolvendo? Por que substituir?
- **Riscos operacionais**: dependência de um sistema, lock-in, succession plan.

## Passos
1. Listar stakeholders e papéis (RACI leve).
2. Mapear sistemas externos com owner + método de integração (SSO, webhook, batch, etc.).
3. Classificar PII / dados sensíveis e definir base legal LGPD.
4. Listar 3+ ferramentas internas concorrentes (Notion, Sheets, etc.) e justificar build.
5. Registrar 2–3 ADRs principais.

## Gate de saída
- Sponsor e owner técnico identificados.
- Cada sistema integrado tem owner.
- Classificação de dados feita.
- ADRs principais registrados.
