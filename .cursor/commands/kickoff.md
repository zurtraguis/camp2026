---
id: cmd-kickoff
title: Kickoff — iniciar nova solução
category: project
model: opus
skills:
  - using-superpowers
  - brainstorming
  - validate
  - market
  - context-driven-development
  - mem-search
---

# `/kickoff` — Iniciar nova solução

Conduz Q&A estruturado para gerar `docs/00_VALIDATION.md` preenchido e apontar a próxima fase.

## Pré-condições (gates)

- `.harness-pristine.consumed` deve existir (cópia do harness foi inicializada). Se não existir, o hook `sessionStart` cuida disso na primeira sessão; em fallback manual rode `bash scripts/harness-init.sh --force`.
- `docs/00_VALIDATION.md` ainda em estado template (campos `[preencher]`). Se já preenchido, recusar e sugerir `/resume`.

## Skills obrigatórias

Carregar antes de continuar (Read em `.cursor/skills/<nome>/SKILL.md` ou `.agents/skills/<nome>/SKILL.md`):

- `/using-superpowers` (sempre primeiro)
- `/brainstorming`
- `/validate`
- `/market`
- `/context-driven-development`
- `/mem-search`

## Roteiro de Q&A (8 perguntas em sequência)

Usar a skill `brainstorming` para variar formulação. Aguardar resposta do usuário entre cada pergunta. Não inferir respostas.

0. **Trilha (track)** — `lite` (side-project, 9 fases), `standard` (SaaS comercial, 14 fases) ou `enterprise` (regulado, 16 fases incluindo compliance/DPA)? Persistir em `.harness-config.json` via `node scripts/harness-config.mjs set track <valor>`. Tabela em `docs/internal/TRACKS.md`.
0b. **Tipo de projeto (`project_type`)** — pergunta única, define gates e stack:
   - `saas` — produto SaaS com monetização (default).
   - `internal-app` — app interno, sem monetização, sem SEO público.
   - `landing` — landing page com CTA/form.
   - `single-page` — site institucional/portfólio sem lead-gen.
   - `blog` — conteúdo MDX/CMS, RSS.
   - `ecommerce` — catálogo + checkout (Stripe).
   - `repository-catalog` — catálogo de itens (imobiliária, serviços, portfólio).
   Persistir via `node scripts/phase-state.mjs set --project-type=<valor>`. Os gates (`/monetization-check`, `/market`, `/seo`, `/content-model`) seguem a `GATE_MATRIX` em `scripts/phase-state.mjs`. Após definir, sugerir `/init-stack <id>` correspondente quando aplicável.
1. **Ideia em uma frase** — qual problema resolve, para quem, em uma frase?
2. **Problema** — descreva a dor concreta. Qual o gatilho? Frequência?
3. **Público (ICP)** — perfil do usuário-alvo. Atributos verificáveis.
4. **Hipótese de solução** — como a solução resolve o problema. Mecanismo principal.
5. **Diferencial defendível** — por que não conseguem copiar em 1 mês?
6. **Métrica de sucesso (3 meses)** — o que prova que vale construir? Numérico, datado.
7. **Restrições** — orçamento, prazo, compliance, stack obrigatório, integrações.

## Após o Q&A

1. Rodar `/market` (skill) para coletar 3 evidências de demanda + 3 concorrentes.
2. Rodar `/validate` (skill) para pontuar 6 dimensões e propor veredito GO/HOLD/NO-GO.
3. Preencher `docs/00_VALIDATION.md` com:
   - Veredito (1 de 3 checkboxes)
   - Tabela de score (notas 0–10 com confiança e evidência)
   - Problema, ICP, proposta, diferencial, restrições, hipóteses
   - Tabela de concorrentes
   - Build vs Buy
   - Tabela de riscos (Segurança/UX/Compliance/Técnico/Mercado)
   - Top 3 incertezas
   - Impacto em segurança e UX
4. Atualizar `docs/DOCS_INDEX.md`: linha "Validação" → status "Concluído" + data atual.
5. Persistir contexto no claude-mem (skill `mem-search` → registrar `kickoff:<projeto>`).

## Gates de saída

- Nota total >= 7 com confiança Alto/Médio em ≥ 4 dimensões → próximo: `/prd`.
- Nota 5–7 ou veredito HOLD → listar top 3 incertezas e propor experimentos para destravar.
- Nota < 5 ou NO-GO → registrar motivo em `docs/00_VALIDATION.md` e parar.

## Saída para o usuário

```
Validação concluída.
- Nota total: X / 10  (confiança: ...)
- Veredito: GO | HOLD | NO-GO
- Próximo comando: /prd  (ou /kickoff revisão se HOLD)
```
