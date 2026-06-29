---
id: cmd-incident-response
title: Incident Response — runbooks + escalation + PM
category: audit
model: opus
skills:
  - using-superpowers
  - incident-response
  - incident-runbook-templates
  - on-call-handoff-patterns
  - postmortem-writing
---

# `/incident-response` — Preparar resposta a incidentes

Atualiza `OPS02_RUNBOOK.md`, gera runbooks por alerta e configura o ritual de on-call.

## Skills obrigatórias

- `/using-superpowers`
- `/incident-response`
- `/incident-runbook-templates`
- `/on-call-handoff-patterns`
- `/postmortem-writing`

## Pré-condições

- `/observability-setup` concluído (alertas existentes).
- Rotação de plantão acordada com a equipe (não criamos rotação por escrita aqui — só documentamos).

## Saída

- `docs/OPS02_RUNBOOK.md` com severidades, escalation tree, lista de runbooks.
- `docs/runbooks/<alerta>.md` para cada alerta crítico.
- Addendum "Incident Response" em `docs/13_RELEASE_READINESS.md`.

## Critério de aceite

- Toda alerta listada em `/observability-setup` tem runbook em `docs/runbooks/`.
- Severidades, tempo de resposta e escalation tree documentados.
- Template de PM em `OPS03_POST_MORTEM.md` referenciado.
