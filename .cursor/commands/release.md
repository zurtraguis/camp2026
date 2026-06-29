---
id: cmd-release
title: Release Readiness — gate GO/NO-GO
category: ops
model: opus
skills:
  - using-superpowers
  - release
  - verification-before-completion
  - changelog-automation
---

# `/release` — Consolidação de Release Readiness

## Skills obrigatórias
Carregar antes: `/using-superpowers` → `/verification-before-completion` →
`/changelog-automation` → `/release`
(ver `docs/S03_SKILLS_INDEX.md` — Fase Final).

## Gate de entrada
O hook `enforce-skills` bloqueia `/release` se faltar:
- `docs/07_IMPLEMENTATION.md` (implementação concluída), ou
- `docs/08_SECURITY.md` (rode `/security-audit` antes), ou
- na trilha enterprise, `docs/14_COMPLIANCE.md` e `docs/15_DPA.md`.

## Objetivo
Consolidar os addendums de pré-produção numa decisão de release.

## Passos obrigatórios
1. Conferir os gates de pré-produção (ordem recomendada):
   - `/security-audit` → `docs/08_SECURITY.md`
   - `/observability-setup` → addendum (SLOs, alertas)
   - `/performance-baseline` → `docs/internal/perf-baseline.json` + addendum
   - `/progressive-rollout` → addendum + `scripts/rollout.sh`
   - `/incident-response` → `docs/OPS02_RUNBOOK.md` + `docs/runbooks/`
2. Consolidar tudo em `docs/13_RELEASE_READINESS.md` com a decisão
   **GO / GO WITH RISK / NO-GO** e justificativa.
3. Validar (`/verification-before-completion`): typecheck/lint/test verdes,
   `bash scripts/verify-docs.sh` exit 0, CHANGELOG atualizado.

## Gate de saída
Decisão GO ou GO WITH RISK registrada → seguir para `/pr`.
