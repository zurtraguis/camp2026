---
id: cmd-resume
title: Resume — retomar trabalho na fase atual
category: project
model: haiku
skills:
  - using-superpowers
  - mem-search
  - find-skills
  - context-mode
---

# `/resume` — Retomar trabalho

Identifica a fase atual no DOCS_INDEX, cruza com claude-mem e aponta o próximo passo concreto. Use no início de toda sessão que NÃO seja kickoff.

## Skills obrigatórias

- `/using-superpowers` (sempre primeiro)
- `/mem-search` — recuperar contexto persistido entre sessões
- `/find-skills` — descobrir skills relevantes para a fase detectada
- `/context-mode` — modo de leitura otimizado para retomar trabalho

## Passos

1. Ler `docs/DOCS_INDEX.md` e detectar a fase com status "Em andamento" (fallback: último doc com >200 bytes).
2. Ler o documento da fase (ex: `docs/06_SPECIFICATION.md`).
3. Buscar memórias do projeto via `mem-search` (último resumo, decisões pendentes, blockers).
4. Listar próximas ações:
   - Próximo gate ainda não satisfeito (coluna "Gate para avançar" no DOCS_INDEX).
   - Sub-tarefas pendentes no doc da fase.
   - Decisões em aberto (ADRs em `docs/decisions/` com status "Proposed").
5. Sugerir o comando da fase (mapa em `docs/S03_SKILLS_INDEX.md`):
   - 00 → `/kickoff`
   - 01 → `/prd`
   - 02 → `/monetization-check`
   - 04 → `/market`
   - 05 → `/design`
   - 06 → `/spec`
   - 07 → `/implement-backend` ou `/implement-frontend`
   - 08-12 → ver fase 4 (qualidade)
   - 13 → `/release` (após `/security-audit`, `/observability-setup`, `/performance-baseline`)

## Saída para o usuário

```
Estado atual:
- Fase: <NN_NOME>
- Status: <Pendente|Em andamento|Bloqueado|Concluído>
- Última atualização: <data>
- Blockers: <lista ou “nenhum”>

Próximo passo recomendado:
  /<comando>

Skills a carregar antes:
  /using-superpowers, /<skill1>, /<skill2>...
```

## Quando NÃO usar

- Em cópia recém-criada do harness com `.harness-pristine.consumed` recente e `docs/00_VALIDATION.md` ainda em template → use `/kickoff`.
- Em diagnóstico de bug → use `/debugger`.
- Para revisar plano de release → use `/release`.
