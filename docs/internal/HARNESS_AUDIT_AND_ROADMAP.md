# Auditoria Consolidada — Harness VibeCoding + Web Excellence

> Sintese de 11 dossies (auditoria de subsistemas + pesquisa de best practices/reclamacoes da comunidade). Stack confirmado: Next.js 16.2.2 / React 19.2.4 / Tailwind v4 / Prisma 7.7 / Stripe 22 / Zod 4.3 / Vitest 4.1.

---

## 1. Sumario executivo

### Estado atual
O harness e um sistema maduro e ambicioso: arquitetura de tiers de modelo abstrata (provider-agnostica), ~190 skills em tres camadas, pipeline de 7 agents + agents transversais, workflow faseado com gates, hooks IDE-agnosticos, CI com lint/typecheck/test/build/e2e/journey, e documentacao de Web Excellence (CWV, a11y, SEO, SaaS) de alta qualidade. A intencao de design e excelente e a maioria dos problemas e corrigivel sem decisao de produto.

### Forcas
- **Tiering por papel** (opus=heavy, sonnet=medium, haiku=light/nano) alinhado com o padrao consolidado da comunidade ("Haiku triage, Sonnet build, Opus review") — reduz custo 30-50%.
- **Documentacao Web Excellence** correta e atualizada (CSP por nonce, HSTS, INP, PPR, DAL, prefers-reduced-motion).
- **Infra de CI/journey tests** real, com gates de docs e verificacao de skills/commands.
- **Provider-agnosticismo** com lint dedicado.

### Fraquezas principais (transversais)
1. **Gap doc-vs-codigo sistematico**: a documentacao prescreve excelencia (web-vitals, loading.tsx, cache headers, optimizePackageImports, DAL) mas o scaffold base nao implementa — todo projeto derivado herda o config subotimo.
2. **Windows-compat quebrada**: hooks dependem de `jq` e `python3` ausentes; scripts de verificacao sao Bash puro; symlinks de skills quebrados.
3. **Dual hook system incoerente**: `.cursor/hooks/*.sh` (executados) vs `.harness/hooks/*.mjs` (nunca chamados, com bugs latentes).
4. **Skills/agents fantasmas**: ~14 skills referenciadas inexistentes; 3 agents mapeados sem `.md`.
5. **Seguranca critica no scaffold**: webhook Stripe sem verificacao de assinatura, CSP off em dev, secrets `.optional()`, layout protegido sem auth, Server Actions sem auth dupla.
6. **Drift de versao factual**: docs dizem "Next.js 15", package.json tem 16.2.2; mistura Prisma adapter v6/v7.
7. **Enforcement fraco de qualidade**: `lhci ... || true` silencia falhas; coverage sem threshold; `passWithNoTests:true`.
8. **Context engineering**: 6 regras `alwaysApply:true` queimam context window; AGENTS.md vazio; 32 skills com discovery ceiling.

---

## 2. Achados por dimensao

### 2.1 Seguranca

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Critico** | Webhook Stripe aceita payloads sem verificar assinatura (bloco comentado, `req.text()` descartado) | `src/app/api/webhooks/stripe/route.ts:5,24-58` | Capturar `const body = await req.text()`, validar com `stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET)` em try/catch, retornar 400 em falha. **Usar `request.text()` — nunca `request.json()`** (quebra a verificacao 100% das vezes — github.com/vercel/next.js/issues/60002). Adicionar `export const runtime='nodejs'` e idempotencia (tabela `StripeEvent` com unique constraint) pois Stripe retenta ate 3 dias (gethook.to/blog/stripe-webhook-integration-guide). |
| **Critico** | Server Actions/rotas protegidas sem dupla verificacao auth/authz — risco IDOR + CVE-2025-29927 (bypass de middleware via header `x-middleware-subrequest`) | `src/app/(app)/layout.tsx`, `src/middleware.ts`, `src/app/api/webhooks/stripe/route.ts:16` | **Middleware NUNCA deve ser a unica camada de autorizacao** (securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass, vercel.com/blog/postmortem-on-next-js-middleware-bypass). Verificar sessao em toda Server Action + ownership check no DAL (`import 'server-only'`, nextjs.org/docs/app/guides/data-security). Garantir Next.js >= 15.2.3 (ja em 16.2.2 — OK). |
| **Alto** | CSP totalmente desativada em dev (early-return remove tambem X-Frame-Options, Referrer-Policy estaticos) | `src/middleware.ts:18-19` | Aplicar headers estaticos mesmo em dev; pular apenas o nonce/CSP dinamico. Documentar exclusao de `api/webhooks` no matcher. |
| **Alto** | Secrets criticos como `.optional()` no Zod — app inicia sem `BETTER_AUTH_SECRET`/Stripe sem erro de build; guards manuais lendo `process.env` em vez de `env` | `src/lib/env.ts:7-11`, `src/lib/stripe.service.ts:3-5`, `route.ts:16` | Separar schema: obrigatorios (DATABASE_URL, APP_URL, BETTER_AUTH_SECRET/URL) sem `.optional()`; opcionais por flag (Stripe). Substituir guards manuais por import de `@/lib/env`. |
| **Alto** | Layout `(app)` sem verificacao de sessao | `src/app/(app)/layout.tsx` | Adicionar guard `const session = await auth(); if(!session) redirect('/login')` com TODO marcado como ponto obrigatorio de Phase 2. |
| **Medio** | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` ausente do .env.example (multi-instancia self-hosted quebra closures de Server Actions) | `.env.example` | Adicionar campo + comando `openssl rand -base64 32` (nextjs.org/docs/app/guides/data-security). |
| **Medio** | CAPTCHA tradicional viola WCAG 3.3.8 (autenticacao acessivel) | templates auth | Preferir `autocomplete='current-password'`, Turnstile invisivel ou passkeys/WebAuthn (w3.org/WAI/WCAG22 SC 3.3.8). |

### 2.2 Acessibilidade (WCAG 2.2 AA — agora ISO/IEC 40500:2025)

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Critico** | Ausencia de skip link em todos os layouts (todo projeto derivado herda) | `src/app/layout.tsx:51-64`, `(marketing)/layout.tsx:8` | Adicionar `<a href="#main-content" class="sr-only focus:not-sr-only ...">` + `id="main-content"` no `<main>`. SC 2.4.1. |
| **Critico** | Navbar sem menu mobile — link Pricing `hidden sm:block` some em <640px | `src/components/marketing/Navbar.tsx:18` | Implementar Sheet (shadcn) com hamburger acessivel (`aria-expanded`/`aria-controls`/`aria-label`). |
| **Critico** | Focus ring shadcn `ring-1 ring-ring/50` = 2.4:1 (< 3:1 AA) | thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026; sarasoueidan.com/blog/focus-indicators | Sobrescrever token `--focus-ring` com contraste >=3:1; padrao two-color `outline:3px solid + box-shadow ring`. SC 1.4.11. |
| **Alto** | Sem `prefers-reduced-motion` em nenhum lugar | `src/app/globals.css:1-26`; FAQ.tsx:65 | Adicionar bloco global `@media (prefers-reduced-motion:reduce)`; `useReducedMotion()` para JS (joshwcomeau.com/react/prefers-reduced-motion). |
| **Alto** | Contraste insuficiente em `foreground/40` e `/50` (texto legal, microcopy, body) ~2.4-3.5:1 | Hero.tsx:18, Footer.tsx:49, CTA.tsx:24, Pricing.tsx:86 | Elevar para `/60`–`/70`; definir tokens absolutos por tema (evita falha em dark mode). webaim.org/articles/contrast. |
| **Alto** | Estados loading/empty/error sem live regions; sidebar sem focus-visible nem `aria-current` | `(app)/layout.tsx:12-22`; dashboard sem skeleton | `aria-live` permanente (nunca remontado — k9n.dev/en/blog/2025-11-aria-live), `aria-current="page"`, migrar `<a>` para `<Link>`. |
| **Alto** | Heading hierarchy quebrada (h1 "App" placeholder, dois h2 antes do conteudo, styleguide usa `<p>` com classes de heading) | `(app)/layout.tsx:8,28`; `styleguide/page.tsx:21-26` | Neutralizar placeholders; usar headings semanticos reais. |
| **Alto** | Forms sem `aria-describedby`/`autocomplete`/`fieldset`; auth pages sao placeholder sem form | `(auth)/login/page.tsx`; sem `<main>` no auth layout | Scaffold de form acessivel com label visivel + `aria-invalid` + erro `role="alert" aria-live`. SC 3.3.1/3.3.2/1.3.5. |
| **Alto** | Charts SVG sem alternativa textual; DataTable/Combobox shadcn sem ARIA | thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026 | Wrappers acessiveis (`<caption>`, `aria-sort`, tabela de dados para charts). SC 1.1.1. |
| **Medio** | SC 2.5.8 (target 24/44px), 2.4.11 (focus obscured por sticky), 2.5.7 (dragging sem alternativa), 3.3.7 (redundant entry) nao cobertos | w3.org/TR/WCAG22 | Min 44px em icon-buttons; `scroll-margin-top`; alternativa de ponteiro para drag; persistir multi-step forms. |
| **Medio** | `lang="pt"` com copy em ingles e `og:locale=pt_PT` | `src/app/layout.tsx:37,59` | Alinhar lang ao idioma real do produto. |

### 2.3 Performance / Core Web Vitals

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Critico** | `lhci` com `2>/dev/null \|\| true` — gate nunca bloqueia CI | `package.json:27` | Remover `\|\| true` e `2>/dev/null`. trevorlasn.com/blog/lighthouse-ci. |
| **Critico** | `fetch()` nao e mais cacheado por default (Next 15/16); `unstable_cache` deprecado | nextjs.org/docs/app/api-reference/directives/use-cache | Ativar `cacheComponents:true`, ensinar `'use cache'` + `cacheLife`/`cacheTag` nos templates; **nunca** `cookies()/headers()` dentro de `'use cache'` (build hang 50s). |
| **Alto** | `next.config.ts` sem images/compress/optimizePackageImports/cache headers — apesar de skills prescreverem | `next.config.ts:14-32`; optimize-lcp.md:273-299 | Adicionar `images.formats avif/webp`, `compress:true`, `optimizePackageImports:['lucide-react',...]`, headers immutable para `/_next/static`. nextjs.org/docs/app/guides/package-bundling. |
| **Alto** | `globals.css` sobrescreve fonte com Arial, anulando next/font (Geist baixada e nunca usada; risco CLS) | `src/app/globals.css:25`; layout.tsx:5-13 | Remover `font-family:Arial`; usar `var(--font-geist-sans)`; `display:'swap'`. |
| **Alto** | lighthouserc: `preset:desktop` + `numberOfRuns:1`, sem INP | `lighthouserc.json:4-21` | `numberOfRuns:3`, `preset:mobile` (CrUX e mobile), adicionar `interaction-to-next-paint maxNumericValue:200`. INP substituiu FID em 2024 (web.dev/articles/inp). |
| **Alto** | Zero web-vitals runtime apesar de prescrito | performance.mdc:22-33; package.json sem `web-vitals` | Adicionar `web-vitals/attribution`, reporter via `useReportWebVitals` (next/web-vitals), endpoint `/api/vitals`. INP so mede em campo. |
| **Medio** | `@next/bundle-analyzer` nao instalado; sem script `analyze`; sem size-limit budget | package.json; optimize-bundle.md:341 | Instalar analyzer, scripts `analyze`/`size`; size-limit como gate por PR. |
| **Medio** | Ausencia de `loading.tsx`/`error.tsx` em todas as rotas; Suspense ausente (PPR silenciosamente desativado por `force-dynamic` em pai); over-clientification | build-loading-strategy.md:20; logrocket RSC mistakes | Gerar skeletons por rota; layouts so estrutura; `'use client'` apenas em folhas. |
| **Medio** | onFID() obsoleto em exemplo; useEffect em vez de useReportWebVitals | optimize-lcp.md:46,68-93 | Remover onFID; usar hook nativo + attribution build. |
| **Baixo** | `content-visibility:auto` nao mencionado; Hero sem next/Image priority; middleware gera nonce em todo request | globals.css; Hero.tsx:39-49; middleware.ts:4-12 | Documentar content-visibility; placeholder `<Image priority>`; simplificar `createNonce`. |

### 2.4 Testes

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Alto** | Coverage sem threshold; `test:coverage` ausente apesar de docs instruirem | vitest.config.ts:1-10; docs/09_TESTS.md:31 | Bloco `coverage` v8 + `thresholds {lines:70,branches:60}`; script `test:coverage`; incluir no CI. |
| **Alto** | `passWithNoTests:true` — `npm test` sempre verde sem testes em src/ | vitest.config.ts:8 | Mudar para `false`; adicionar teste de sanidade do scaffold. |
| **Alto** | Symlinks `systematic-debugging`/`test-driven-development` quebrados no Windows | `.cursor/skills/systematic-debugging` (41 bytes) | Substituir por copias ou documentar `core.symlinks=true` + check no CI. |
| **Alto** | Piramide invertida (so E2E smoke + journey de scaffold; zero unit/component em src/) | glob src `*.test.tsx`=0 | Adicionar testes de referencia (util, RTL component, API route com Prisma mock). |
| **Alto** | Coverage v8 do Vitest 4 perde linhas em TSX inline (bug #9457); pacotes @vitest/* devem ter mesma major | github.com/vitest-dev/vitest/issues/9457 | Fixar `@vitest/coverage-v8` na major do vitest; `coverage.include` explicito. |
| **Alto** | CI usa DATABASE_URL Postgres sem service de banco | ci.yml:18,24-78 | Adicionar `services: postgres:16` com healthcheck, ou sqlite `file:./ci.db` em CI. |
| **Medio** | Server Components async nao testaveis com Vitest/RTL | nextjs.org/docs/app/guides/testing/vitest | Documentar: unit p/ client/sync; E2E p/ RSC async. |
| **Medio** | E2E job `needs:build` mas roda `npm run dev`; Playwright `reporter:list` (HTML report vazio em falha); smoke so checa status HTTP | playwright.config.ts:13,20; ci.yml:139,178 | `npm run start`; `[['list'],['html']]`; assertivas de conteudo. |
| **Medio** | journey tests `skipIf(!hasJq())` silenciam suites no Windows; `spawnSync('bash')` falha sem Git Bash; sem setup Prisma/Stripe; `@axe-core/playwright` documentado nao instalado | gates.test.mjs:9; _helpers.mjs:70; docs/09_TESTS.md:21 | Teste explicito exigindo jq; detectar plataforma; helper DB de teste; instalar axe + script `test:a11y`. |
| **Baixo** | Zod 4: `.optional().default()` agora aplica default mesmo com chave ausente (quebra PATCH) | github.com/colinhacks/zod/issues/4883 | Testes explicitos; rodar codemod v3→v4; revisar PATCH handlers. |

### 2.5 Debug

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Alto** | Prisma 7 + Turbopack: "Cannot find module .prisma/client/default" com provider `prisma-client` | buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix | `serverExternalPackages:['@prisma/client','pg']` no next.config.ts; manter `prisma-client-js` ate fix upstream. |
| **Medio** | debugger.md referencia docs obsoletos (08_DEBUG.md/09_UX_AUDIT.md; real e 10_DEBUG.md) | `.cursor/agents/debugger.md:33-40` | Corrigir paths. |
| **Medio** | Sourcemaps ausentes/inacurados em prod (Next #69081); instrumentation.ts deve ficar na raiz | github.com/vercel/next.js/issues/69081 | `productionBrowserSourceMaps` em staging; upload p/ Sentry; `instrumentation.ts` na raiz + `NEXT_OTEL_VERBOSE=1`. |

### 2.6 Meta-qualidade do harness (skills/agents/hooks/wiring)

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Critico** | Hooks `.sh` dependem de `jq` (9 arquivos) ausente no Git Bash Windows; `harness-init.sh` usa `python3` (3x) ausente | `.cursor/hooks/*.sh`; harness-init.sh:80,93,106 | Reescrever serializacao JSON em Node; check de deps no bootstrap. |
| **Alto** | Dual hook system: `.harness/hooks/*.mjs` nunca executados; `enforce-skills.mjs` usa regex `skill:` singular (gate inerte) | hooks.json:3-35; enforce-skills.mjs:27 | Decisao arquitetural: consolidar em um conjunto; corrigir regex/skillExists se migrar p/ .mjs. |
| **Alto** | ~14 skills fantasmas referenciadas (ux-strategy, karpathy-guidelines "SEMPRE ativar", journey-mapping, ux-research, doc-coauthoring, monetization-check) | docs/S03_SKILLS_INDEX.md:17-25,109,117; internal-stakeholder-map.md:8-9 | Criar, instalar ou remover referencia; rodar `npm run verify:commands`. |
| **Alto** | 3 agents mapeados sem `.md` (harness-reviewer, content-writer, lint-formatter) | agent-tiers.json:38,45,48 | Criar `.md` com frontmatter ou remover do mapa. |
| **Alto** | web-excellence skills (71) nao expostas via `.claude/skills/` | SKILLS_AUDIT.md:10 | Symlink com namespace ou include no CLAUDE.md. |
| **Medio** | review.md sem frontmatter YAML; review nao mapeado em tiers; skill `security-audit` vs agent `security-auditor` confunde | review.md:1; security-audit/SKILL.md vs security-auditor.md | Adicionar frontmatter; nota distinguindo skill (roteiro) vs agent (persona read-only). |
| **Medio** | Pipeline agents 01-07 sem instrucao de delegacao a subagents; sem escalada dinamica em BLOCKED; gate /release so checa 08_SECURITY (D2-D5 nao implementados apesar de WORKFLOW afirmar bloqueio) | grep 'subagent'=0; enforce-skills.sh:79-95; WORKFLOW.md:294 | Secao `## Delegation`; protocolo de escalada de tier; implementar gates ou remover afirmacao. |
| **Baixo** | 03-builder.md duplica `layout/build-grid-layout` 4-6x; AGENTS.md vazio | 03-builder.md:39; AGENTS_INDEX.md:100; AGENTS.md:1-6 | Deduplicar; popular AGENTS.md (padrao cross-tool — morphllm.com/agents-md-guide). |
| **Alto** | 6 `alwaysApply:true` queimam context window antes do trabalho | dev.to/vibestackdev (cursor rules silently ignored) | Limitar a <=2 (constitution + project); converter resto para globs. |
| **Medio** | Discovery ceiling: 32 skills, ~2007 tokens/turn, 56% nao-invocacao; token stuffing em SKILL.md | cdelgado70.github.io/2026/05/06 | Agrupar ctx-* em uma skill; descricoes discriminativas de 1-2 linhas; busca semantica. |
| **Medio** | Context rot/recency bias em sessoes longas; instrucoes negativas reduzem compliance | forum.cursor.com/t/cursor-continuously-ignores-the-rules; humanlayer.dev | Hook de lembrete a cada N msgs; reformular constitution em afirmativas; mover code-style para eslint/tsconfig. |

### 2.7 Tiers de modelo (ver secao 4 dedicada)

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Alto** | "Main agent usa SEMPRE reasoning-heavy" — anti-padrao de custo em coordenacao rotineira | agent-tiers.json:3; clouatre.ca | Restringir heavy a planning/sintese; orquestracao em sonnet. |
| **Alto** | Sem fallback/circuit-breaker por provider; sem budget cap de sessao | agent-tiers.json:60-67 | `fallbackChain` por tier; `sessionLimits` (max-turns, stop_at_usd). opendirective.net. |
| **Medio** | `haiku-4-5` ID nao publicado; OpenAI `gpt-5/mini/nano` inexistentes; nano==light p/ nao-claude | agent-tiers.json:7,14,21,27,28 | Usar alias `haiku`; IDs reais OpenAI (`gpt-4o`/`gpt-4o-mini`/`o3`); unificar nano/light fora do claude. |
| **Medio** | qa-auditor=nano subestimado p/ auditoria multidimensional (a11y+CWV+OWASP+SEO, 11 skills) | agent-tiers.json:46 | Override `reasoning-medium` p/ ecommerce/saas. |
| **Baixo** | designer=heavy excessivo p/ saas (so gera tokens); ecommerce override redundante (security ja heavy) | agent-tiers.json:36,56 | Override designer=medium p/ saas/internal-app; remover redundancia. |

### 2.8 DX

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Alto** | `harness-doctor.mjs` usa `require()` em ESM — ReferenceError ao existir notices.json | harness-doctor.mjs:119 | Trocar por `readFileSync` ja importado (linha 9). |
| **Alto** | Scripts harness:doctor/phase/briefs/agnostic ausentes do package.json | UPGRADE_NOTES.md:82-96 | Adicionar scripts npm + doctor no CI. |
| **Alto** | Verificadores sao Bash puro (rsync, mapfile, declare -A) — impossivel nativo no Windows | verify-*.sh; verify-harness-init.sh:32 | Criar equivalentes .mjs; documentar requisito bash/WSL. |
| **Medio** | HARNESS_PROVIDER ausente do .env.example (variavel mais critica dos tiers) | .env.example; resolve-model.mjs:13 | Bloco comentado `# HARNESS_PROVIDER=claude` + API keys por provider. |
| **Medio** | `verify-command-skills.mjs` aceita opus/sonnet/haiku (drift contra agnosticismo); `stat -c` GNU-only; rollout.sh usa jq nao documentado; bootstrap roda prisma generate antes de editar .env | verify-command-skills.mjs:62; harness-init.sh:36; rollout.sh:54; bootstrap.sh:33 | Aceitar tiers abstratos; `date -r` portavel; check jq; reordenar bootstrap. |
| **Baixo** | metadata `viewport`/`themeColor` deprecados no metadata export; `use()` experimental em Client; useTransition != debounce | nextjs.org/docs/app/api-reference/functions/generate-viewport | Export `viewport` separado; documentar use()/useTransition. |

### 2.9 Docs

| Sev | Achado | Evidencia | Recomendacao |
|---|---|---|---|
| **Alto** | "Next.js 15" propagado em docs vs 16.2.2 no package.json | README.md:81; init-project.md:14; perf docs | Find-replace "Next.js 15" → "Next.js 16". |
| **Alto** | CONTRIBUTING.md 4 refs erradas (03→06_SPEC, 11→13_RELEASE, 13→S01_QUICK, 12→S02_PROMPT) | CONTRIBUTING.md:41,47,70,71 | Corrigir paths. |
| **Medio** | COMMANDS_INDEX diz "15 comandos" mas ha 36; WORKFLOW salta Fase 4→13; AGENTS.md vazio; docs 09/10 em DRAFT com `[preencher]` | COMMANDS_INDEX.md:11; WORKFLOW.md; AGENTS.md:1-6 | Atualizar contagens; nota explicativa de numeracao; popular AGENTS.md; marcadores `{{...}}`. |
| **Medio** | .cursorrules "87 skills" incompleto (190 reais); web-excellence 71 nao citado no README; Prisma adapter dual-version sem ADR | .cursorrules:6; SKILLS_AUDIT.md | Esclarecer inventario; ADR de estrategia Prisma. |
| **Baixo** | WORKFLOW.md/CLAUDE.md sem progressive disclosure (tudo inline); 28 .mdc sem ownership/review; specs tratadas como spec-first nao living | humanlayer.dev; packmind.com; martinfowler.com/sdd-3-tools | Resumo executivo com ponteiros; `last_reviewed`; tasks.md living spec. |

---

## 3. Roadmap priorizado

### P0 — Critico / Agora (seguranca, gates quebrados, runtime bugs, Windows-block)

| Item | Dimensao | Esforco | Tier | Por que esse tier |
|---|---|---|---|---|
| Webhook Stripe: verificar assinatura + idempotencia | Seguranca | S | medium | Logica de seguranca com SDK; sonnet implementa corretamente |
| Auth dupla em Server Actions + guard no layout (app) + DAL `server-only` | Seguranca | M | heavy | Decisao de arquitetura de seguranca cross-cutting (CVE) |
| Remover `\|\| true` do script lhci | Performance | S | nano | Edit trivial |
| Corrigir `require()`→`readFileSync` em harness-doctor.mjs | DX | S | nano | One-liner determinista |
| Reescrever hooks `.sh` (jq) e harness-init (python3) em Node | Meta | M | medium | Refactor cross-arquivo com paridade de comportamento |
| Symlinks de skills quebrados no Windows | Testes/Meta | S | light | Substituicao + check CI |
| `prisma generate` explicito no CI + service Postgres (ou sqlite) | Testes/DX | M | light | Config CI direta |
| `serverExternalPackages` Prisma no next.config.ts | Debug | S | nano | Linha de config conhecida |
| CSP: aplicar headers estaticos em dev | Seguranca | S | light | Ajuste localizado de middleware |
| Skip link + mobile nav + focus ring AA | Acessibilidade | S/M | light | Padroes conhecidos, baixa ambiguidade |

### P1 — Alto (gap doc-vs-codigo, enforcement, fantasmas, drift)

| Item | Dimensao | Esforco | Tier | Por que |
|---|---|---|---|---|
| Cache Components + `'use cache'` nos templates | Performance | M | medium | Mudanca de paradigma com armadilhas (cookies/build hang) |
| next.config.ts: images/compress/optimizePackageImports/cache headers | Performance | S | nano | Config bem definida pelas skills |
| globals.css: remover Arial + fonte Geist | Performance | S | nano | Edit pontual |
| web-vitals runtime + attribution + endpoint | Performance | M | light | Implementacao guiada por doc existente |
| Coverage threshold + `passWithNoTests:false` + testes de referencia | Testes | M | medium | Requer desenhar piramide minima |
| lighthouserc: mobile + 3 runs + INP | Testes | S | nano | Edit de config |
| Skills fantasmas (criar/remover ~14) + 3 agents faltantes | Meta | M | medium | Decisao por skill (criar vs remover) com contexto |
| Decisao dual hook system + enforce-skills regex | Meta | L | heavy | Decisao arquitetural com impacto sistemico |
| Secrets obrigatorios no env.ts | Seguranca | M | light | Reorganizacao de schema |
| Reduzir alwaysApply para <=2 + globs | Meta | M | medium | Reescrita de rules de alto sinal |
| Drift Next.js 15→16 (find-replace docs) | Docs | S | nano | Substituicao mecanica |
| Mistura Prisma adapter v6/v7 (remover worker ou ADR) | DX/Docs | S | nano (remover) / medium (ADR) | Remocao trivial; ADR exige racional |
| Estados loading/empty/error + a11y forms scaffold | A11y/UI | M | medium | Componentes com semantica acessivel |
| Scripts npm harness:doctor/phase + doctor no CI | DX | S | nano | Aditivo |
| Fallback chain + budget cap nos tiers | Tiers | M | light | Config + doc |

### P2 — Melhoria (DX, manutenibilidade, context engineering)

| Item | Dimensao | Esforco | Tier | Por que |
|---|---|---|---|---|
| Equivalentes .mjs dos verify-*.sh | DX | L | medium | Porte multi-script |
| Frontmatter rico em skills VibeCoding (phase/tier) | Meta | M | light | Padronizacao repetitiva |
| Agrupar ctx-* + condensar SKILL.md (token stuffing) | Meta | L | light | Edicao em volume |
| AGENTS.md cross-tool + AGENTS.md por stack | Docs | S | light | Conteudo estruturado |
| Living specs (tasks.md) + drift-check | Docs | M | medium | Desenho de loop spec↔code |
| WCAG 2.2 SC novos (2.5.7/2.4.11/3.3.7) + charts/datatable a11y | A11y | L | heavy | Componentes complexos com alternativas |
| size-limit budget por PR; bundle-analyzer | Performance | M | light | Tooling de CI |
| 6 stacks sem scaffold + divergencia Expo 51/53 | Meta | L/S | medium/nano | Scaffold real exige design; versao e trivial |
| COMMANDS_INDEX/WORKFLOW numeracao/contagens; docs DRAFT | Docs | M | light | Reorganizacao de docs |

---

## 4. Alinhamento de tiers de modelo

### Avaliacao do agent-tiers.json atual
O mapeamento por papel esta **correto e validado** contra benchmarks 2026 (augmentcode.com/guides/ai-model-routing-guide: 3-tier reduz ~51% de custo; valueaddvc: Sonnet 4.6 entrega 97-99% da qualidade Opus em coding a ~40% menos custo). Problemas concretos:

1. **`reasoning-nano.claude = "haiku-4-5"`** — ID com versao nao publicado, fragil; os outros tiers usam aliases. **Trocar por `haiku`** (alinha com reasoning-light) ou pinning justificado no `_doc`.
2. **OpenAI `gpt-5`/`gpt-5-mini`/`gpt-5-nano`** — nao existem; `HARNESS_PROVIDER=openai` falha. Substituir por `o3`/`gpt-4o`, `gpt-4o-mini`.
3. **nano == light para openai/google/xai** — distincao sem efeito; unificar nano em light fora do claude.
4. **"Main agent SEMPRE heavy"** — anti-padrao de custo. Esclarecer: heavy so para planning/sintese arquitetural; coordenacao em medium.
5. **qa-auditor=nano** subestimado p/ auditoria multidimensional — override medium em ecommerce/saas.
6. **designer=heavy** excessivo p/ saas (so gera tokens) — override medium; ecommerce `security-auditor` override e redundante (ja heavy no base).
7. Ausencia de **fallbackChain** e **sessionLimits/escalationRules**.

### Proposta concreta de mapeamento

```jsonc
"tiers": {
  "reasoning-heavy":  { "claude": "opus",   "openai": "o3",          "google": "gemini-2.5-pro",        "xai": "grok-4",      "local": "llama-3.3-70b" },
  "reasoning-medium": { "claude": "sonnet", "openai": "gpt-4o",      "google": "gemini-2.5-flash",      "xai": "grok-4-mini", "local": "llama-3.3-8b" },
  "reasoning-light":  { "claude": "haiku",  "openai": "gpt-4o-mini", "google": "gemini-2.5-flash-lite", "xai": "grok-4-nano", "local": "qwen-2.5-7b" },
  "reasoning-nano":   { "claude": "haiku",  "openai": "gpt-4o-mini", "google": "gemini-2.5-flash-lite", "xai": "grok-4-nano", "local": "qwen-2.5-3b" }
},
// agents: manter base; alterar qa-auditor → reasoning-light (auditoria multi-step)
// agentsByProjectType:
//   "saas":        { "qa-auditor": "reasoning-medium", "designer": "reasoning-medium" }
//   "ecommerce":   { "builder": "reasoning-heavy", "qa-auditor": "reasoning-medium" } // remover security-auditor redundante
// + "fallbackChain": { "reasoning-heavy": ["claude/opus","openai/o3","google/gemini-2.5-pro"], ... }
// + "sessionLimits": { "max_agent_turns": 50, "warn_at_usd": 5.0, "stop_at_usd": 20.0 }
// + "escalationRules": "BLOCKED@medium → re-dispatch heavy; BLOCKED@heavy → fragmentar/humano"
```

> Nota: usar tabela de heuristica estatica de routing no `subagent-driven-development/SKILL.md` para evitar o anti-padrao "router-as-LLM" (digitalapplied.com) — classificar por escopo (1-2 arquivos=light; 3+=medium; arquitetura/debug=heavy) em vez de gastar tokens de opus classificando.

---

## 5. Plano de execucao com skills/agents (P0/P1)

Operacionaliza "main agent forte + subagents medium/small mais baratos". O **main agent (heavy/opus)** decompoe e sintetiza; delega execucao a subagents no menor tier suficiente.

### P0
| Item | Skill(s) | Agent / subagent (tier) |
|---|---|---|
| Webhook Stripe assinatura+idempotencia | `implement-backend`, `security-audit`, `stripe-best-practices` (criar) | builder (medium) executa; security-auditor (heavy) revisa diff isolado |
| Auth dupla + DAL + guard layout | `implement-backend`, `security-audit` | architect (heavy) define DAL; builder (medium) implementa; security-auditor (heavy) valida |
| Remover `\|\| true` lhci / require() doctor / serverExternalPackages | — (edits triviais) | lint-formatter (nano) |
| Reescrever hooks jq/python3 | `using-superpowers` | debugger (medium) ou harness-reviewer (medium) |
| Symlinks skills + CI Postgres | `test-driven-development` | qa-auditor (light) / deploy-manager (nano) |
| Skip link + mobile nav + focus ring | `accessibility-audit` (criar), `build-navbar` | ui-reviewer (medium) revisa; builder (light) implementa |

### P1
| Item | Skill(s) | Agent / subagent (tier) |
|---|---|---|
| Cache Components / `'use cache'` | `optimize-lcp`, `build-loading-strategy` | builder (medium); qa-auditor (medium) audita CWV |
| next.config + globals.css + web-vitals | `optimize-images`, `optimize-bundle`, `optimize-fonts` | builder (light); seo-specialist (light) |
| Coverage + piramide de testes | `test-driven-development`, `javascript-testing-patterns` | builder (medium) escreve testes; review (medium) |
| Skills fantasmas + agents faltantes | `writing-skills`, `verify-command-skills` | harness-reviewer (medium); main (heavy) decide criar/remover |
| Dual hook system | `subagent-driven-development` | architect (heavy) — decisao arquitetural |
| Secrets env.ts + alwaysApply | `security-audit`, `writing-skills` | security-auditor (heavy) p/ env; main (medium) p/ rules |
| Drift Next 15→16 / Prisma adapter / CONTRIBUTING | `doc-coauthoring` (criar) | content-writer (light) / lint-formatter (nano) |
| Estados loading/empty/error + forms a11y | `build-loading-strategy`, `accessibility-audit` | ui-reviewer (medium); builder (medium) |

---

*Fontes da comunidade citadas inline por achado. Documento gerado em 2026-06-23.*

---

## 6. Riscos principais (ao aplicar melhorias)

1. Quebrar o build/scaffold padrao ao tornar secrets obrigatorios (env.ts) ou ao ativar cacheComponents/'use cache' sem migrar simultaneamente todos os data-fetchers: o proprio harness/CI nao tem src/ tests reais e pode passar verde enquanto projetos derivados quebram. Validar com `npm run build` + smoke E2E apos cada mudanca de config.

2. Reescrever hooks .sh para Node ou consolidar o dual hook system sem testar em ambos Cursor e Claude Code pode silenciar gates que hoje (mesmo com jq) funcionam parcialmente em Linux/CI — fazer a migracao atras de feature-flag e manter o conjunto antigo ate o novo provar paridade nos journey tests.

3. Substituir IDs de modelo nos tiers (gpt-5→gpt-4o, haiku-4-5→haiku) sem revisar resolve-model.mjs e IDE_SETUP.md pode introduzir nova inconsistencia; o ambiente do assistente (cutoff jan/2026) pode desconhecer IDs reais lancados depois — verificar contra api.anthropic.com/v1/models e a doc OpenAI antes de fixar.

4. Aplicar correcoes de a11y de contraste (foreground/40→/60) globalmente pode alterar a identidade visual aprovada e falhar em dark mode se feito por opacidade em vez de tokens absolutos por tema — tratar tokens de cor como decisao de design, nao como safe-fix cego.

5. Remover @prisma/adapter-pg-worker/@prisma/pg-worker presume que nenhum stack edge/worker os usa; confirmar via grep em todos os stacks/ antes de remover, pois algum scaffold edge pode depender deles.

6. Reduzir alwaysApply e condensar a constitution pode remover guardrails que hoje previnem regressoes (ex: 'nunca any'); mover para eslint/tsconfig deve ser feito ANTES de remover da rule, garantindo que o linter ja captura a violacao.

7. Mudar lighthouserc para mobile + minScore alinhado pode tornar o CI vermelho imediatamente em paginas que hoje passam em desktop; introduzir como 'warn' e estabelecer baseline antes de promover a 'error'.

8. Tornar passWithNoTests:false e remover `|| true` do lhci sem antes adicionar ao menos um teste de sanidade e garantir Chrome no CI fara o pipeline falhar na primeira execucao — sequenciar: primeiro provisionar, depois endurecer o gate.

---

## 7. Correcoes seguras catalogadas

| ID | Titulo | Dimensao | Confianca | Arquivos |
|---|---|---|---|---|
| SF-01 | Remover supressao de falha do script lhci | Performance | high | package.json |
| SF-02 | Corrigir require() em modulo ESM no harness-doctor | DX | high | scripts/harness-doctor.mjs |
| SF-03 | Alinhar reasoning-nano.claude com alias generico | Tiers de modelo | high | .harness/agent-tiers.json |
| SF-04 | Substituir IDs OpenAI inexistentes no tier map | Tiers de modelo | medium | .harness/agent-tiers.json, docs/IDE_SETUP.md |
| SF-05 | Adicionar HARNESS_PROVIDER ao .env.example | DX | high | .env.example |
| SF-06 | Corrigir 4 referencias de documentos no CONTRIBUTING.md | Docs | high | CONTRIBUTING.md |
| SF-07 | Atualizar drift de versao Next.js 15 → 16 nos docs | Docs | high | README.md, .cursor/commands/project/init-project.md, docs/web-excellence/performance/04_LOADING_STRATEGY.md, docs/web-excellence/seo/01_SEO_TECHNICAL.md |
| SF-08 | Remover dependencias Prisma adapter v6 nao usadas | DX | medium | package.json |
| SF-09 | Corrigir lighthouserc: mais runs e INP | Testes | high | lighthouserc.json |
| SF-10 | Adicionar serverExternalPackages do Prisma no next.config.ts | Debug | high | next.config.ts |
| SF-11 | Deduplicar lista de skills do builder | Meta-qualidade | high | .cursor/agents/03-builder.md, .cursor/agents/AGENTS_INDEX.md |
| SF-12 | Adicionar frontmatter YAML ao review.md e mapear tier | Meta-qualidade | high | .cursor/agents/review.md, .harness/agent-tiers.json |
| SF-13 | Adicionar scripts harness:* ausentes ao package.json | DX | high | package.json |
| SF-14 | Corrigir paths de docs obsoletos no debugger.md | Debug | high | .cursor/agents/debugger.md |
| SF-15 | Corrigir divergencia de versao Expo no stack mobile | Meta-qualidade | high | stacks/mobile/.harness-stack-meta.json, stacks/mobile/scaffold/app.json |
| SF-16 | Mover verify-gate log para diretorio do harness | DX | high | .cursor/hooks/verify-gate.sh |
| SF-17 | Adicionar export viewport separado e remover onFID obsoleto | DX | high | .cursor/skills-web-excellence/performance/optimize-lcp.md, docs/web-excellence/performance/01_CORE_WEB_VITALS.md |


---

## 8. Log de aplicacao (2026-06-23)

Revisao executada via workflow multi-agente (16 agentes: 7 auditores Sonnet + 2 scans Haiku + 6 pesquisadores web Sonnet + 1 sintetizador Opus). O main agent (Opus 4.8) verificou cada correcao contra o arquivo real antes de aplicar.

### Aplicadas (14)
| ID | Arquivo(s) | Mudanca |
|----|-----------|---------|
| SF-01 | package.json | removido `2>/dev/null || true` do script `lhci` (gate reporta exit real) |
| SF-02 | scripts/harness-doctor.mjs | `require("node:fs")` -> `readFileSync` (corrige ReferenceError em ESM) |
| SF-03 | .harness/agent-tiers.json | `reasoning-nano.claude` `haiku-4-5` -> `haiku` (alias resiliente) |
| SF-05 | .env.example | bloco `HARNESS_PROVIDER` + chaves por provider + `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` |
| SF-06 | CONTRIBUTING.md | 5 refs de doc corrigidas (03->06, 11->13 x2, 13_QUICK->S01, 12_PROMPT->S02) |
| SF-07 | README, init-project, seo.mdc, perf/seo docs | "Next.js 15" -> "Next.js 16" (drift factual) |
| SF-09 | lighthouserc.json | `numberOfRuns` 1->3; assertion INP (warn <=200ms) |
| SF-10 | next.config.ts | `serverExternalPackages` (Prisma/Turbopack) + `poweredByHeader:false` + `images.formats` avif/webp |
| SF-11 | 03-builder.md, AGENTS_INDEX.md | deduplicada lista de skills do builder |
| SF-12 | review.md | frontmatter YAML (name/description/tier) + refs 03->06, 05->07 |
| SF-13 | package.json | scripts `harness:doctor`, `harness:phase`, `harness:install-hooks` |
| SF-14 | debugger.md | refs 03->06, 02->01, 05->07, 08->10, 09->11; "Next 15+"->"16+" |
| SF-16 | .cursor/hooks/verify-gate.sh | log `/tmp` -> `.cursor/logs/` + `mkdir -p` (portabilidade Windows) |
| SF-17 | optimize-lcp.md | removido `onFID` (API removida no web-vitals v4) |

### Rejeitada (1)
- **SF-04** (IDs OpenAI nos tiers): a proposta trocava `gpt-5/gpt-5-mini/gpt-5-nano` por `o3/gpt-4o/gpt-4o-mini`. **Rejeitado** — a familia GPT-5 foi lancada em 2025 e e mais recente/capaz; a troca seria um downgrade. O achado do pesquisador estava incorreto. IDs atuais mantidos. (Recomenda-se reconfirmar IDs vigentes na doc oficial de cada provider periodicamente.)

### Adiadas (exigem passo extra)
- **SF-08** (remover `@prisma/adapter-pg-worker` e `@prisma/pg-worker`): confirmado orfao (sem uso em `src/` nem `stacks/`), mas remover do package.json sem `npm install` dessincroniza o package-lock.json e quebra `npm ci`. Sequencia segura: editar package.json -> `npm install` -> commitar lockfile.
- **SF-15** (Expo SDK 51->53 no stack mobile): exige mover React/React Native/expo-router/expo-status-bar juntos (upgrade coordenado, nao one-liner). Tarefa P2 dedicada.

### Verificacoes pos-aplicacao
- JSON valido: agent-tiers.json, lighthouserc.json, package.json, mobile meta.
- `node --check scripts/harness-doctor.mjs` OK.
- `node scripts/resolve-model.mjs`: architect->opus, builder->sonnet, qa-auditor/lint-formatter->haiku (3 tiers operacionais).
- **node_modules ausente neste ambiente** -> typecheck/lint/build/test NAO executados. Antes de commitar: `npm install && npm run verify:all && npm run build`.

---

## 9. Passada completa de execução (2026-06-23) — P0/P1 implementados

Após o roadmap + safe-fixes, foi executada a passada completa autorizada ("finish for reuse").
Ambiente: Windows 11, Node 24, npm instalado (lockfile sincronizado).

### Segurança (scaffold)
- **Webhook Stripe**: verificação de assinatura (`constructEvent` com `req.text()` bruto) + idempotência via modelo `StripeEvent` (PK = event.id; P2002 → 200 duplicate; outro erro → 500 p/ reentrega) + `runtime = "nodejs"`. (`src/app/api/webhooks/stripe/route.ts`)
- **DAL `server-only`** (`src/lib/dal.ts`): `getCurrentUser()`/`requireUser()` com `cache()`, fail-closed; doc CVE-2025-29927 (authz não depende só do middleware). Instalado pacote `server-only`.
- **Guard de sessão** no layout `(app)` (`await requireUser()` → `/dashboard` é dinâmico, redireciona p/ /login sem sessão).
- **Stripe service lazy** (`getStripe()`) lendo `process.env` — não lança no import (build robusto sem secrets).
- `.env.example`: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

### Acessibilidade (WCAG 2.2)
- Skip-link + landmark `<main id="main-content">` em todos os layouts (root/marketing/auth/app).
- `globals.css`: `:focus-visible` com contraste, `@media (prefers-reduced-motion)`, `scroll-margin` p/ âncoras, fonte Geist real (removido Arial).
- Nav mobile (Pricing visível <640px), contraste elevado (/40→/60, /60→/70), heading hierarchy (dashboard h1, layout brand sem h1 falso), aria-labels em nav/aside.

### Performance
- `next.config.ts`: `serverExternalPackages` (Prisma/Turbopack), `images.formats` avif/webp, `poweredByHeader:false`, `turbopack.root`.
- Web Vitals runtime (`src/app/web-vitals.tsx` via `useReportWebVitals`).
- `loading.tsx` (skeleton), `error.tsx` (boundary), `not-found.tsx` (404).

### Testes / DX
- `vitest.config.ts`: coverage v8 + `setupFiles` + `passWithNoTests:false`; `vitest.setup.ts` (jest-dom); script `test:coverage`; `@vitest/coverage-v8`.
- Testes de referência: `src/lib/utils.test.ts`, `src/components/marketing/Navbar.test.tsx` (+ util `cn`).
- `tsconfig.json`: exclui `stacks` (templates com deps próprias) — typecheck do root deixou de falhar.
- Bug pré-existente no seed corrigido (`prisma/seed/phases/04.ts`: upsert por PK).

### Cross-platform / meta-harness (Windows)
- `verify-command-skills.mjs`: bug de path Windows (`/SKILL.md`) corrigido → 96 falsos negativos eliminados; 8 skills fantasmas resolvidas (2 substituídas, 4 criadas: `ux-writing`, `doc-coauthoring`, `journey-mapping`, `ux-research`).
- `harness-init.sh`: 3 blocos `python3` → `node` (corrige `UnicodeDecodeError` cp1252 no Windows e remove dependência de python3).
- `verify-harness-init.sh`: `rsync` → `tar` (portável) + leitura de `package.json`/config via `cd`+`require('./...')` (path POSIX→node Windows).
- `middleware.ts` → `proxy.ts` (convenção Next 16).
- SF-08 aplicado: removidos `@prisma/adapter-pg-worker`/`@prisma/pg-worker` (órfãos) + lockfile ressincronizado.

### Resultado dos gates (Windows, local)
- typecheck ✓ · lint ✓ (0 erros) · test (unit) ✓ · `next build` ✓ (limpo, sem warnings)
- `verify` (docs+framework+integrity+commands) ✓ · `verify:harness-init` ✓ · `test:journey` ✓ (24 pass, 13 skip por ausência de `jq`)

### Pendências conscientes (não bloqueiam uso)
- `.claude/skills` são symlinks quebrados (viram arquivos no checkout Windows) — skills funcionam via `.cursor/skills`. Consolidação de skills (3 diretórios) permanece decisão de arquitetura.
- Auth real (Better Auth) é ponto de integração do projeto derivado (DAL pronto, fail-closed).
- Hooks `.cursor/hooks/*.sh` ainda usam `jq` (13 skips nos journey tests quando `jq` ausente).
