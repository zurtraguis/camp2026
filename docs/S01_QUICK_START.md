# S01_QUICK_START.md — Execução Rápida (1 Página)

> Use este guia para executar o framework sem perder qualidade.
> **Primeiro comando de toda sessão — sem exceção:** `/using-superpowers`

---

## Início em 60 segundos (cópia nova)

```bash
cp -r BASE-CURSOR-PRO-XX minha-solucao
cd minha-solucao
# abrir Claude Code aqui — sessionStart roda harness-init.sh:
#   - renomeia projeto
#   - reseta DOCS_INDEX para "Pendente"
#   - copia templates para docs/00..13
#   - consome .harness-pristine
```

Em seguida:

| Situação | Comando |
|---|---|
| Cópia nova / primeira sessão | `/kickoff` (Q&A 7 perguntas → `00_VALIDATION.md`) |
| Sessão subsequente | `/resume` (detecta fase atual e sugere próximo passo) |
| Não sabe qual skill usar | `/find-skills` |
| Quer ver as 87 skills | `docs/S03_SKILLS_INDEX.md` |

---

## Cursor / Claude Code — Requisitos

- **Versão mínima:** Cursor 2.0.40+
- **Extensões recomendadas:** ESLint, Prettier, Tailwind CSS IntelliSense
- **Stack default:** `nextjs` (definido em `.env` via `HARNESS_STACK`). Trocar com `/init-stack <id>`.

---

## Ordem de Consulta no Início de Cada Projeto

```
1. docs/DOCS_INDEX.md         → status atual + fase
2. docs/S03_SKILLS_INDEX.md   → skills da fase atual
3. docs/S02_PROMPT_PACKS.md   → prompt pronto para copiar
4. Documento da fase atual    → executar
```

Documentos de suporte: `S05_DESIGN_REFERENCES.md` (Fase 1D) · `S04_IMAGE_GENERATION.md` (geração de assets).

---

## Fluxo Mínimo por Fase

| Fase | Comando | Entrega | Skills obrigatórias |
|---|---|---|---|
| -1 — Kickoff | `/kickoff` | `00_VALIDATION.md` (template preenchido) | `/kickoff` `/brainstorming` |
| 0 — Validação | `/validate` | `00_VALIDATION.md` — GO/HOLD/NO-GO | `/validate` `/brainstorming` |
| 1a — PRD | `/prd` | `01_PRD.md` — requisitos priorizados | `/prd` `/context-driven-development` |
| 1b — Monetização | `/monetization-check` | `02_MONETIZATION.md` — modelo + tiers | `/monetization-check` `/brainstorming` |
| 1c — Mercado | `/market` | `04_MARKET_AND_REFERENCES.md` — 4 frentes | `/market` |
| 1D — Design | `/design` | `05_DESIGN.md` + styleguide — preview aprovado | `/design` `/frontend-design` `/tailwind-design-system` `/accessibility-compliance` |
| 2 — Spec | `/spec` | `06_SPECIFICATION.md` — sem TODOs abertos | `/spec` `/openapi-spec-generation` `/postgresql-table-design` |
| 3B — Backend | `/implement-backend` | `07_IMPLEMENTATION.md` — backend | `/implement-backend` `/test-driven-development` `/secrets-management` |
| 3F — Frontend | `/implement-frontend` | `07_IMPLEMENTATION.md` — frontend | `/implement-frontend` `/react-state-management` `/accessibility-compliance` |
| 4a — Segurança | `/security-audit` | `08_SECURITY.md` — GATE OK | `/security-audit` `/secrets-management` |
| 4b — Testes | `/test-writer` | `09_TESTS.md` — suite verde | `/test-writer` `/playwright-best-practices` |
| 4c — Debug | `/debugger` | `10_DEBUG.md` — zero crítico aberto | `/debugger` `/systematic-debugging` |
| 4d — UX Audit | (agente) | `11_UX_AUDIT.md` — achados priorizados | `/accessibility-compliance` `/interaction-design` |
| 4e — Threat Model | (agente) | `12_THREAT_MODEL.md` — STRIDE + LGPD | `/secrets-management` |
| Final — Release | ver ciclo abaixo | `13_RELEASE_READINESS.md` — GO/GO-WITH-RISK/NO-GO | `/release` `/pr` |

> **TDD na Fase 3:** ciclo **RED → GREEN → REFACTOR** por milestone da `06_SPECIFICATION.md`.

---

## Ciclo Operacional Fechado (Fase Final)

`/release` exige os 5 gates D1–D5 anteriores:

```
/security-audit         → 08_SECURITY.md (OWASP Top 10 + secrets + CVEs)
/observability-setup    → SLOs, dashboards, alertas (addendum em 13)
/performance-baseline   → docs/internal/perf-baseline.json (Lighthouse + Web Vitals)
/progressive-rollout    → flags + canary + kill switch (addendum em 13)
/incident-response      → OPS02_RUNBOOK.md + docs/runbooks/<alerta>.md
↓
/release                → 13_RELEASE_READINESS.md → GO / GO-WITH-RISK / NO-GO
/pr                     → abrir PR com referência aos gates
```

Hooks bloqueiam `/release` se `08_SECURITY.md` não existir.

---

## Quick Start por Papel

### Tech Lead
```
1. /using-superpowers
2. Em cópia nova: /kickoff   |  Em projeto existente: /resume
3. Conduzir Fases 0, 1a, 1b, 1c, 2 e ciclo D1–D5 antes de /release
4. Revisar PRs com /receiving-code-review
5. Assinar 13_RELEASE_READINESS.md
```

### Designer
```
1. /using-superpowers
2. Aguardar Tech Lead concluir Fases 0, 1a, 1b, 1c
3. Fase 1D → /design /frontend-design /tailwind-design-system /accessibility-compliance
4. Fase 3F → /implement-frontend /react-state-management
5. Fase 4d → /accessibility-compliance /interaction-design
```

### QA Jr.
```
1. /using-superpowers
2. Fase 4b → /test-writer /playwright-best-practices /e2e-testing-patterns
3. Fase 4c → /debugger /systematic-debugging
4. Preencher 09_TESTS.md, 10_DEBUG.md com veredito
5. Validar perf-baseline em /performance-baseline antes do PR
```

---

## Regras que Não Podem Quebrar

1. ⛔ Não iniciar `/spec` ou implementação sem aprovação do preview de design
2. ⛔ Não implementar sem `06_SPECIFICATION.md` concluído e sem TODOs
3. ⛔ Refatoração com mudança de contratos públicos → ADR em `docs/decisions/`
4. ⛔ Sem typecheck/lint/test verde, não fecha fase
5. ⛔ Sem `08_SECURITY.md` GATE OK, `/release` é bloqueado
6. ⛔ Nenhum PR sem `13_RELEASE_READINESS.md` preenchido
7. ⛔ Risco residual sempre com owner e prazo de revisão
8. ⛔ `/secrets-management` antes de todo commit na Fase 3
9. ⛔ `harness-init.sh` só roda se `.harness-pristine` existir — nunca em projeto já iniciado

---

## Checklist Antes de Avançar de Fase

- [ ] Documento da fase atualizado com status e data
- [ ] Gates técnicos atendidos (typecheck/lint/test)
- [ ] Gates de segurança atendidos
- [ ] Gates UX/a11y atendidos
- [ ] Pendências com owner e prazo definidos
- [ ] Linha correspondente no `DOCS_INDEX.md` atualizada

---

## Comandos Base

```bash
# Verificação de docs e harness
npm run verify                    # verify-docs + verify-framework + verify-docs-integrity
npm run verify:commands           # comandos referenciam apenas skills canônicas
node scripts/audit-skills.mjs     # inventário de skills (sem duplicações)
bash scripts/verify-docs.sh

# Gates técnicos (requer package.json)
npm run typecheck
npm run lint
npm run test
npm run test:e2e

# Audit de segurança
npm audit
```

---

## Decisão de Release

```
docs/13_RELEASE_READINESS.md → preencher ANTES de abrir qualquer PR

✅ GO             → todos os gates aprovados (D1–D5 + qualidade)
🟡 GO WITH RISK   → risco aceito, documentado com owner e prazo
❌ NO-GO          → bloqueios listados com IDs
```
