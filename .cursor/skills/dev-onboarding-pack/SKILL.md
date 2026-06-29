---
name: dev-onboarding-pack
description: Pacote de onboarding para devs novos — runbook, tour de codebase, primeiro PR, contatos, decisões-chave. Reduz time-to-first-PR < 1 dia.
---

# dev-onboarding-pack

## Quando usar

- Fase 13 (Release Readiness) — antes de escalar time.
- Sempre que um dev novo entrar no projeto.
- Auditoria semestral (rotação real ≠ doc).

## Conteúdo mínimo (S01_QUICK_START)

1. **Setup local** (15 min):
   - Pré-requisitos versionados
   - `git clone` + `npm i` + `npm run dev`
   - Variáveis `.env.example` com instruções
2. **Tour de codebase** (30 min):
   - Mapa de pastas top-level
   - Pontos de entrada (rotas, jobs, scripts)
   - Decisões arquiteturais críticas (link para ADRs)
3. **Primeiro PR** (2-4h):
   - Tarefa "good-first-issue" predefinida
   - Reviewer designado
   - Critérios de aceite explícitos
4. **Operação dia-a-dia**:
   - Como rodar testes (`npm test`)
   - Como abrir feature branch (`git flow`)
   - Como pedir review
   - Onde falar (canal Slack/Discord)
5. **Decisões-chave** (link para ADRs):
   - Stack escolhida e por quê
   - Convenções de código + linting
   - Política de testes

## Métricas de sucesso

- Time-to-first-PR < 1 dia útil
- 0 perguntas sobre setup no canal
- Buddy review nas 2 primeiras semanas

## Materiais

- `docs/S01_QUICK_START.md` — entry point
- `docs/decisions/` — ADRs
- `docs/folder-structure.md` — mapa
