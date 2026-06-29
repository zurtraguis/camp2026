# S03_SKILLS_INDEX.md — Índice de Skills por Fase

> **Propósito:** Mapear cada skill instalada ao momento exato de uso no framework VibeCoding,
> indicando fase, responsável e como ativar no Cursor / Claude Code.
>
> **Regra de uso:** Antes de iniciar qualquer fase, consulte a seção correspondente aqui
> e ative as skills listadas no chat com `/nome-da-skill`.
>
> **Atualizado em:** Maio de 2026

---

## Skills por `project_type`

Além das skills por fase listadas abaixo, cada `project_type` injeta skills extras nos comandos:

| project_type | Skills extras |
|---|---|
| `landing` / `single-page` | `frontend-design`, `tailwind-design-system`, `responsive-design`, `ux-writing`, `web-asset-generator`, `accessibility-audit`, `theme-factory` |
| `blog` | `frontend-design`, `ux-writing`, `doc-coauthoring`, `web-asset-generator`, `accessibility-audit`, `responsive-design` |
| `ecommerce` | `stripe-best-practices`, `stripe-projects`, `upgrade-stripe`, `email-and-password-best-practices`, `interaction-design`, `playwright-best-practices`, `postgresql-table-design` |
| `internal-app` | `auth-implementation-patterns`, `two-factor-authentication-best-practices`, `better-auth-best-practices`, `accessibility-compliance`, `secrets-management`, `nodejs-backend-patterns` |
| `repository-catalog` | `postgresql-table-design`, `sql-optimization-patterns`, `api-design-principles`, `frontend-design`, `web-asset-generator`, `accessibility-audit`, `responsive-design` |
| todos | `ux-designer`, `design-critique`, `verification-before-completion` |

Comandos novos e suas skills obrigatórias:

| Comando | Skills |
|---|---|
| `/seo` | `using-superpowers`, `frontend-design`, `web-asset-generator`, `accessibility-audit`, `ux-writing` |
| `/content-model` | `using-superpowers`, `postgresql-table-design`, `doc-coauthoring`, `ux-writing`, `api-design-principles` |
| `/internal-stakeholder-map` | `using-superpowers`, `journey-mapping`, `ux-research`, `secrets-management`, `architecture-decision-records` |
| `/catalog-schema` | `using-superpowers`, `postgresql-table-design`, `sql-optimization-patterns`, `api-design-principles`, `doc-coauthoring` |

---

## Inventário canônico (pós-consolidação WS-A)

Existem **4 localizações** de skills, com regra de resolução clara:

| Localização | Conteúdo | Fonte de verdade |
|---|---|---|
| `.cursor/skills/` | Skills VibeCoding-específicas (~74) — `validate`, `prd`, `spec`, `release`, etc. | Original deste harness |
| `.agents/skills/` | Skills externas via `npx skills add` (~32) — `executing-plans`, `writing-plans`, `using-superpowers`, etc. | Comunidade obra/superpowers |
| `.cursor/skills-web-excellence/` | 71 skills Web Excellence com grafo `requires:` | Manifest em `framework-manifest.json` |
| `.claude/skills/` | Symlinks unificados (~107) → expostos ao Claude Code | Gerado por `scripts/consolidate-skills.mjs` |

**Como saber a origem:**

```bash
node scripts/audit-skills.mjs    # gera docs/internal/SKILLS_AUDIT.md (zero duplicações)
```

**Skills com badge `EXT`** = vêm de `.agents/skills/` (atualizadas via `npx skills add`).
**Skills com badge `WE`** = vêm de `.cursor/skills-web-excellence/` (grafo).

---

## Como usar este documento

1. Identifique a fase atual no `DOCS_INDEX.md`
2. Localize a seção dessa fase aqui
3. Ative as skills listadas no chat do Cursor antes de executar qualquer prompt
4. Use os prompt packs de `12_PROMPT_PACKS.md` com as skills já ativas

**Ativar uma skill no Cursor:**
```
/nome-da-skill
```
Ou referenciar diretamente:
```
@.cursor/skills/nome-da-skill/SKILL.md
```

---

## Skills Web Excellence (71) — páginas e UI

Skills com frontmatter `id: skill-*` e grafo `requires:` / `rule:` em:

- **Pasta:** `.cursor/skills-web-excellence/` (ver `SKILLS_INDEX.md` dentro dessa pasta)
- **Manifest:** `docs/web-excellence/framework-manifest.json` — regenerar com `npm run manifest`
- **Verificação:** `npm run verify:framework`

Invocar por ficheiro, por exemplo:
```
@.cursor/skills-web-excellence/foundations/build-design-tokens.md
```

Commands associados: `.cursor/commands/COMMANDS_INDEX.md` (`/init-tokens`, `/new-page`, `/audit-full`, …).

---

## Observação sobre `13_QUICK_START.md`

O documento `13_QUICK_START.md` inclui uma tabela resumida de skills por fase.
Este documento (`22_SKILLS_INDEX.md`) é a **referência completa** — use aqui para:
- Saber exatamente o que cada skill faz
- Encontrar skills de uso transversal (todas as fases)
- Onboarding de novos membros

---

## Mapa Rápido — Skills por Fase

| Fase | Nome | Skills obrigatórias | Responsável |
|---|---|---|---|
| -1 | Kickoff (cópia nova) | `kickoff`, `brainstorming` `EXT`, `validate` | Tech Lead |
| 0 | Validação | `validate`, `brainstorming` `EXT`, `writing-plans` `EXT`, `ux-strategy`, `ux-research` | Tech Lead |
| 1a | Pesquisa Técnica | `market`, `api-design-principles`, `architecture-patterns`, `deep-research` | Tech Lead |
| 1b | PRD | `prd`, `context-driven-development`, `writing-plans` `EXT`, `ux-strategy`, `journey-mapping` | Tech Lead |
| 1c | Pesquisa de Mercado | `market`, `brainstorming` `EXT`, `deep-research`, `ux-research` | Tech Lead |
| 1d | Design System | `design`, `frontend-design`, `design-system-patterns`, `interaction-design`, `journey-mapping`, `ux-designer`, `design-critique` | Designer |
| 2 | Especificação Técnica | `spec`, `api-design-principles`, `architecture-decision-records` | Tech Lead |
| 3B | Implementação Backend | `implement-backend`, `nodejs-backend-patterns`, `auth-implementation-patterns`, `test-driven-development` `EXT` | Tech Lead |
| 3F | Implementação Frontend | `implement-frontend`, `react-state-management`, `tailwind-design-system`, `test-driven-development` `EXT` | Designer |
| 4a | Segurança | `security-audit`, `secrets-management`, `auth-implementation-patterns` | Tech Lead |
| 4b | Testes | `test-writer`, `test-driven-development` `EXT`, `playwright-best-practices`, `e2e-testing-patterns`, `accessibility-audit` | QA Jr. |
| 4c | Debug | `debugger`, `systematic-debugging` `EXT` | QA Jr. |
| 4d | Auditoria UX | `accessibility-compliance`, `accessibility-audit`, `interaction-design`, `responsive-design`, `ux-designer`, `design-critique` | Designer |
| 4e | Threat Model | `secrets-management`, `auth-implementation-patterns` | Tech Lead |
| Final D1 | Security Audit | `security-audit` (ver Fase 4a) | Tech Lead |
| Final D2 | Observability Setup | `observability-setup` | Tech Lead |
| Final D3 | Performance Baseline | `performance-baseline` | Tech Lead |
| Final D4 | Progressive Rollout | `progressive-rollout` | Tech Lead |
| Final D5 | Incident Response | `incident-response` | Tech Lead + QA Jr. |
| Final | Release / PR | `pr`, `release`, `verification-before-completion` `EXT`, `finishing-a-development-branch` `EXT` | Tech Lead + QA Jr. |
| Produção | Incidentes | `incident-response`, `incident-runbook-templates`, `postmortem-writing`, `systematic-debugging` `EXT` | QA Jr. |

---

## Skills operacionais (D1–D5) — Fase Final / Release Readiness

| Skill | Comando | Responsável | Saída obrigatória |
|---|---|---|---|
| `security-audit` | `/security-audit` | Tech Lead | `docs/08_SECURITY.md` com decisão GATE OK / GATE COM RESSALVAS |
| `observability-setup` | `/observability-setup` | Tech Lead | SLOs + dashboards + alertas + addendum em `docs/13_RELEASE_READINESS.md` |
| `performance-baseline` | `/performance-baseline` | Tech Lead | `docs/internal/perf-baseline.json` versionado + comparativo |
| `progressive-rollout` | `/progressive-rollout` | Tech Lead | Plano de canary + kill switch + rollback (addendum em 13) |
| `incident-response` | `/incident-response` | Tech Lead + QA | `OPS02_RUNBOOK.md` + `docs/runbooks/<alerta>.md` por alerta crítico |

**Gate:** `/release` falha se qualquer um dos cinco não tiver saído com decisão positiva.

---

## FASE 0 — Validação

**Documento:** `00_VALIDATION.md` · **Gate:** Nota >= 7 + GO/HOLD/NO-GO · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `using-superpowers` | Garante que o agente busca skills automaticamente | `/using-superpowers` |
| `validate` | Estrutura o processo de validação GO/NO-GO | `/validate` |
| `brainstorming` | Expande hipóteses e alternativas antes de decidir | `/brainstorming` |
| `writing-plans` | Estrutura o plano de execução da validação | `/writing-plans` |
| `market` | Pesquisa de mercado para embasar o veredito | `/market` |
| `ux-strategy` | Conecta decisões de design a outcomes de negócio antes do GO/NO-GO | `/ux-strategy` |
| `ux-research` | Pesquisa de usuário para embasar o veredito com dados reais | `/ux-research` |

**Sequência:** `/using-superpowers` → `/brainstorming` → `/ux-research` → `/ux-strategy` → `/validate`

---

## FASE 1a — Pesquisa Técnica

**Documento:** `01_RESEARCH.md` · **Gate:** Riscos técnicos mapeados · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `api-design-principles` | Avalia opções de integração e contratos de API | `/api-design-principles` |
| `architecture-patterns` | Mapeia padrões arquiteturais e trade-offs | `/architecture-patterns` |
| `microservices-patterns` | Avalia se microsserviços fazem sentido para o escopo | `/microservices-patterns` |
| `supabase-postgres-best-practices` | Limitações e boas práticas do banco | `/supabase-postgres-best-practices` |
| `nodejs-backend-patterns` | Padrões de backend para mapear riscos técnicos | `/nodejs-backend-patterns` |
| `deep-research` | Pesquisa técnica multi-step com Gemini — mais potente que busca manual | `/deep-research` |

---

## FASE 1b — PRD

**Documento:** `02_PRD.md` · **Gate:** Requisitos priorizados + critérios de aceitação · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `prd` | Guia a criação do PRD com estrutura completa | `/prd` |
| `context-driven-development` | Mantém contexto consistente ao longo do documento | `/context-driven-development` |
| `writing-plans` | Estrutura o plano antes de redigir o PRD | `/writing-plans` |
| `executing-plans` | Executa o plano etapa a etapa com o agente | `/executing-plans` |
| `organization-best-practices` | Organização e priorização dos requisitos | `/organization-best-practices` |
| `ux-strategy` | Mapeia decisões de produto a outcomes mensuráveis antes de fechar requisitos | `/ux-strategy` |
| `journey-mapping` | Cria customer journeys e blueprints que alimentam os requisitos do PRD | `/journey-mapping` |

---

## FASE 1c — Pesquisa de Mercado e Referências

**Documento:** `01_MARKET_AND_REFERENCES.md` · **Gate:** 4 frentes concluídas · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `market` | Conduz as 4 frentes de pesquisa | `/market` |
| `brainstorming` | Expande o mapa de concorrentes e alternativas | `/brainstorming` |
| `architecture-decision-records` | Registra decisões de ferramentas aprovadas/descartadas | `/architecture-decision-records` |
| `deep-research` | Pesquisa competitiva e de mercado multi-step com Gemini | `/deep-research` |
| `ux-research` | Pesquisa qualitativa/quantitativa de usuário para validar hipóteses de mercado | `/ux-research` |

---

## FASE 1D — Design System

**Documento:** `04_DESIGN.md` · **Gate:** Preview aprovado (componentes + páginas) · **Responsável:** Designer

| Skill | O que faz | Como ativar |
|---|---|---|
| `design` | Skill principal — guia criação do sistema visual | `/design` |
| `frontend-design` | Eleva a qualidade visual gerada pela IA | `/frontend-design` |
| `design-system-patterns` | Padrões de tokens, componentes e consistência | `/design-system-patterns` |
| `interaction-design` | Microinterações, estados e fluxos de UX | `/interaction-design` |
| `visual-design-foundations` | Tipografia, cor, espaçamento e hierarquia | `/visual-design-foundations` |
| `tailwind-design-system` | Mantém o design system Tailwind consistente | `/tailwind-design-system` |
| `responsive-design` | Garante responsividade em todos os breakpoints | `/responsive-design` |
| `web-component-design` | Criação de componentes reutilizáveis | `/web-component-design` |
| `accessibility-compliance` | WCAG AA desde o design | `/accessibility-compliance` |
| `mobile-ios-design` | Padrões iOS (se for mobile) | `/mobile-ios-design` |
| `mobile-android-design` | Padrões Android (se for mobile) | `/mobile-android-design` |
| `react-native-design` | Design para React Native (se for mobile) | `/react-native-design` |
| `asset-generator` | Gera assets visuais para empty states e mockups | `/asset-generator` |
| `journey-mapping` | Cria customer journeys e service blueprints que guiam os fluxos de UI | `/journey-mapping` |
| `ux-designer` | Aplica best practices de UI/UX na revisão do sistema visual | `/ux-designer` |
| `design-critique` | Avalia o design gerado contra heurísticas e UX laws antes de aprovar | `/design-critique` |

**Sequência:** `/design` → `/journey-mapping` → `/frontend-design` → `/tailwind-design-system` → `/ux-designer` → `/design-critique` → `/accessibility-compliance` → `/responsive-design`

---

## FASE 2 — Especificação Técnica

**Documento:** `03_SPECIFICATION.md` · **Gate:** Plano implementável sem ambiguidades · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `spec` | Guia a criação da especificação técnica completa | `/spec` |
| `api-design-principles` | Contratos de API sem ambiguidade | `/api-design-principles` |
| `architecture-decision-records` | Registra decisões técnicas e trade-offs | `/architecture-decision-records` |
| `architecture-patterns` | Padrões arquiteturais aplicados | `/architecture-patterns` |
| `openapi-spec-generation` | Gera spec OpenAPI dos contratos de API | `/openapi-spec-generation` |
| `postgresql-table-design` | Design de schema do banco de dados | `/postgresql-table-design` |
| `sql-optimization-patterns` | Queries e índices otimizados desde a spec | `/sql-optimization-patterns` |
| `error-handling-patterns` | Contratos de erro por fluxo | `/error-handling-patterns` |
| `typescript-advanced-types` | Tipos e interfaces sem ambiguidade | `/typescript-advanced-types` |

---

## FASE 3B — Implementação Backend

**Documento:** `05_IMPLEMENTATION.md` (Backend) · **Gate:** typecheck/lint/testes verdes · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `implement-backend` | Skill principal de implementação backend | `/implement-backend` |
| `nodejs-backend-patterns` | Padrões Node.js para APIs robustas | `/nodejs-backend-patterns` |
| `auth-implementation-patterns` | Autenticação e autorização seguras | `/auth-implementation-patterns` |
| `better-auth-best-practices` | Melhores práticas da lib better-auth | `/better-auth-best-practices` |
| `email-and-password-best-practices` | Segurança em fluxos de auth | `/email-and-password-best-practices` |
| `two-factor-authentication-best-practices` | Implementação segura de 2FA | `/two-factor-authentication-best-practices` |
| `supabase-postgres-best-practices` | Operações Supabase corretas e seguras | `/supabase-postgres-best-practices` |
| `postgresql-table-design` | Schema e migrations | `/postgresql-table-design` |
| `sql-optimization-patterns` | Queries eficientes | `/sql-optimization-patterns` |
| `error-handling-patterns` | Tratamento de erros consistente | `/error-handling-patterns` |
| `secrets-management` | Nunca vazar secrets no código | `/secrets-management` |
| `test-driven-development` | Ciclo RED→GREEN→REFACTOR | `/test-driven-development` |
| `using-git-worktrees` | Trabalhar em múltiplas features em paralelo | `/using-git-worktrees` |

**Sequência:** `/implement-backend` → `/test-driven-development` → `/auth-implementation-patterns` (se auth) → `/secrets-management` (antes do commit)

---

## FASE 3F — Implementação Frontend

**Documento:** `05_IMPLEMENTATION.md` (Frontend) · **Gate:** typecheck/lint + todos os estados · **Responsável:** Designer

| Skill | O que faz | Como ativar |
|---|---|---|
| `implement-frontend` | Skill principal de implementação frontend | `/implement-frontend` |
| `react-state-management` | Gerenciamento de estado correto e previsível | `/react-state-management` |
| `react-native-architecture` | Arquitetura React Native (se mobile) | `/react-native-architecture` |
| `tailwind-design-system` | Consistência com o design system | `/tailwind-design-system` |
| `web-component-design` | Componentes reutilizáveis e bem estruturados | `/web-component-design` |
| `modern-javascript-patterns` | Padrões JS/TS modernos no frontend | `/modern-javascript-patterns` |
| `typescript-advanced-types` | Tipagem forte nos componentes | `/typescript-advanced-types` |
| `accessibility-compliance` | WCAG AA na implementação | `/accessibility-compliance` |
| `responsive-design` | Responsividade real no código | `/responsive-design` |
| `error-handling-patterns` | Estados de erro, loading, empty e success | `/error-handling-patterns` |
| `test-driven-development` | Testes de componente antes de implementar | `/test-driven-development` |

---

## FASE 4a — Segurança

**Documento:** `06_SECURITY.md` · **Gate:** Zero crítico; risco residual aceito · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `secrets-management` | Auditoria de secrets e variáveis de ambiente | `/secrets-management` |
| `two-factor-authentication-best-practices` | Validação da implementação de 2FA | `/two-factor-authentication-best-practices` |
| `email-and-password-best-practices` | Auditoria dos fluxos de auth | `/email-and-password-best-practices` |
| `k8s-security-policies` | Políticas de segurança da infra | `/k8s-security-policies` |
| `auth-implementation-patterns` | Revisão dos controles de acesso | `/auth-implementation-patterns` |

---

## FASE 4b — Testes

**Documento:** `07_TESTS.md` · **Gate:** Suite verde + cobertura alvo · **Responsável:** QA Jr.

| Skill | O que faz | Como ativar |
|---|---|---|
| `test-writer` | Gera a suite de testes completa | `/test-writer` |
| `test-driven-development` | Aplica ciclo RED→GREEN→REFACTOR | `/test-driven-development` |
| `playwright-best-practices` | Testes E2E com Playwright | `/playwright-best-practices` |
| `e2e-testing-patterns` | Padrões de testes end-to-end | `/e2e-testing-patterns` |
| `javascript-testing-patterns` | Testes unitários e de integração JS/TS | `/javascript-testing-patterns` |
| `webapp-testing` | Testes completos de aplicação web | `/webapp-testing` |
| `accessibility-compliance` | Testes de acessibilidade automatizados (axe-core) | `/accessibility-compliance` |
| `verification-before-completion` | Verifica tudo antes de marcar como concluído | `/verification-before-completion` |
| `bats-testing-patterns` | Testes de scripts bash do pipeline | `/bats-testing-patterns` |
| `accessibility-audit` | Auditoria WCAG 2.2 com ferramentas (axe-core) — complementa `accessibility-compliance` | `/accessibility-audit` |

**Sequência:** `/test-writer` → `/playwright-best-practices` → `/accessibility-compliance` → `/accessibility-audit` → `/verification-before-completion`

---

## FASE 4c — Debug

**Documento:** `08_DEBUG.md` · **Gate:** Zero bug crítico em aberto · **Responsável:** QA Jr.

| Skill | O que faz | Como ativar |
|---|---|---|
| `debugger` | Skill principal de debug estruturado | `/debugger` |
| `debugging-strategies` | Estratégias sistemáticas de depuração | `/debugging-strategies` |
| `systematic-debugging` | Processo passo a passo para isolar bugs | `/systematic-debugging` |
| `error-handling-patterns` | Identifica padrões de erro recorrentes | `/error-handling-patterns` |

---

## FASE 4d — Auditoria UX

**Documento:** `09_UX_AUDIT.md` · **Gate:** Achados priorizados com plano de melhoria · **Responsável:** Designer

| Skill | O que faz | Como ativar |
|---|---|---|
| `accessibility-compliance` | Auditoria completa WCAG AA | `/accessibility-compliance` |
| `accessibility-audit` | Auditoria WCAG 2.2 com ferramentas — gera relatório detalhado de conformidade | `/accessibility-audit` |
| `interaction-design` | Avalia fluxos, fricção e microinterações | `/interaction-design` |
| `responsive-design` | Verifica responsividade e mobile | `/responsive-design` |
| `visual-design-foundations` | Avalia consistência visual | `/visual-design-foundations` |
| `ux-designer` | Revisão completa de UI/UX contra best practices modernas | `/ux-designer` |
| `design-critique` | Avalia o produto contra heurísticas de Nielsen e UX laws | `/design-critique` |

---

## FASE 4e — Threat Model

**Documento:** `10_THREAT_MODEL.md` · **Gate:** Controles STRIDE + risco residual · **Responsável:** Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `k8s-security-policies` | Ameaças da camada de infra | `/k8s-security-policies` |
| `secrets-management` | Ameaças de exposição de secrets | `/secrets-management` |
| `auth-implementation-patterns` | Ameaças nos fluxos de autenticação | `/auth-implementation-patterns` |
| `two-factor-authentication-best-practices` | Ameaças em 2FA | `/two-factor-authentication-best-practices` |

---

## FASE FINAL — Release e PR

**Documentos:** `11_RELEASE_READINESS.md` · **Gate:** GO / GO WITH RISK / NO-GO · **Responsável:** Tech Lead + QA Jr.

| Skill | O que faz | Como ativar |
|---|---|---|
| `release` | Guia o processo completo de release | `/release` |
| `pr` | Cria o PR com body estruturado e checklist | `/pr` |
| `verification-before-completion` | Checklist final antes de abrir o PR | `/verification-before-completion` |
| `finishing-a-development-branch` | Finaliza a branch com todos os gates | `/finishing-a-development-branch` |
| `requesting-code-review` | Prepara e solicita code review ao Tech Lead | `/requesting-code-review` |
| `receiving-code-review` | Processa o feedback do code review | `/receiving-code-review` |
| `changelog-automation` | Gera o CHANGELOG automaticamente | `/changelog-automation` |
| `git-advanced-workflows` | Merge, rebase e resolução de conflitos | `/git-advanced-workflows` |

**Sequência:** `/verification-before-completion` → `/finishing-a-development-branch` → `/changelog-automation` → `/release` → `/pr`

---

## PRODUÇÃO — Incidentes e Operações

**Documentos:** `16_RUNBOOK.md`, `18_POST_MORTEM.md`, `20_DEPLOYMENT.md` · **Responsável:** QA Jr. + Tech Lead

| Skill | O que faz | Como ativar |
|---|---|---|
| `incident-runbook-templates` | Template estruturado de resposta a incidente | `/incident-runbook-templates` |
| `postmortem-writing` | Post-mortem blameless (Google SRE) | `/postmortem-writing` |
| `on-call-handoff-patterns` | Passagem de plantão estruturada | `/on-call-handoff-patterns` |
| `systematic-debugging` | Diagnóstico de incidentes em produção | `/systematic-debugging` |
| `distributed-tracing` | Rastreamento de erros em produção | `/distributed-tracing` |
| `prometheus-configuration` | Alertas e métricas de produção | `/prometheus-configuration` |
| `grafana-dashboards` | Dashboards de monitoramento | `/grafana-dashboards` |
| `gitops-workflow` | Deploy via GitOps com rastreabilidade | `/gitops-workflow` |
| `deployment-pipeline-design` | Revisão e correção do pipeline de deploy | `/deployment-pipeline-design` |
| `github-actions-templates` | Ajuste dos workflows de CI/CD | `/github-actions-templates` |

---

## Skills Transversais (todas as fases)

| Skill | Quando usar | Como ativar |
|---|---|---|
| `using-superpowers` | **Sempre — ativar primeiro** | `/using-superpowers` |
| `karpathy-guidelines` | **Sempre — reduz erros clássicos de LLM em código** | `/karpathy-guidelines` |
| `find-skills` | Quando não sabe qual skill usar | `/find-skills` |
| `writing-plans` | Antes de qualquer tarefa complexa | `/writing-plans` |
| `executing-plans` | Para executar planos passo a passo | `/executing-plans` |
| `brainstorming` | Explorar alternativas e soluções | `/brainstorming` |
| `context-driven-development` | Manter contexto em sessões longas | `/context-driven-development` |
| `subagent-driven-development` | Delegar subtarefas a agentes especializados | `/subagent-driven-development` |
| `task-coordination-strategies` | Coordenar tarefas paralelas no time | `/task-coordination-strategies` |
| `workflow-patterns` | Estruturar fluxos de trabalho complexos | `/workflow-patterns` |
| `code-review-excellence` | Revisão de código em qualquer PR | `/code-review-excellence` |
| `requesting-code-review` | Antes de submeter qualquer PR | `/requesting-code-review` |
| `receiving-code-review` | Ao processar feedback de revisão | `/receiving-code-review` |
| `git-advanced-workflows` | Qualquer operação Git não trivial | `/git-advanced-workflows` |
| `using-git-worktrees` | Trabalho paralelo em múltiplas branches | `/using-git-worktrees` |
| `writing-skills` | Criar novas skills customizadas | `/writing-skills` |
| `monorepo-management` | Gestão de monorepo (se aplicável) | `/monorepo-management` |

---

## Regra de Atualização

- Ao instalar uma nova skill: adicionar aqui com fase, descrição e responsável
- Ao criar skill customizada com `writing-skills`: documentar com prefixo `custom/`
- Ao iniciar novo projeto: revisar e remover skills não relevantes para a stack

---

*Documento interno — parte do Framework VibeCoding.*
