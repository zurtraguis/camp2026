# HARNESS_ARCHITECTURE.md — Wiring (commands → hooks → skills → docs)

> Mapa interno para mantenedores do harness. Para usuários do framework, ver
> `README.md` + `docs/S01_QUICK_START.md`.

---

## 1. Modelo geral

```
Usuário                                         Claude Code
   │                                                  │
   │ /comando                                         │
   ▼                                                  │
.cursor/commands/<comando>.md                         │
   ├─ frontmatter: skills obrigatórias                │
   └─ corpo: roteiro                                  │
                                                      │
.cursor/hooks/*.sh  ◀── beforeSubmitPrompt / sessionStart / etc.
   ├─ session-bootstrap.sh        (cópia nova → harness-init.sh)
   ├─ enforce-skills.sh           (gate: kickoff/release)
   ├─ phase-doc-sync.sh           (mantém DOCS_INDEX coerente)
   └─ safe-commands.sh            (bloqueio stack-aware)
                                                      │
.cursor/skills/<skill>/SKILL.md   (VibeCoding-specific)
.agents/skills/<skill>/SKILL.md   (externas via npx skills add)
.cursor/skills-web-excellence/    (71 skills com grafo)
.claude/skills/<symlinks>         (resolvidos pelo Claude Code)
                                                      │
                                                      ▼
docs/00_VALIDATION.md ... 13_RELEASE_READINESS.md
docs/runbooks/, docs/decisions/, docs/web-excellence/
```

---

## 2. Quando usar cada localização de skill

| Cenário | Localização |
|---|---|
| Skill nova, identidade do harness (validate/prd/spec/release/etc.) | `.cursor/skills/<name>/SKILL.md` |
| Skill genérica e reutilizável fora do harness (planning, debugging) | `.agents/skills/<name>/` (instalar via `npx skills add`) |
| Skill de página/SEO/UI com grafo `requires:` | `.cursor/skills-web-excellence/<area>/<name>.md` |
| Tornar skill visível ao Claude Code | `.claude/skills/<name>` → symlink (gerar via `scripts/consolidate-skills.mjs`) |

**Regra de duplicação:** se uma skill é canônica em `.agents/skills/`, a versão em
`.cursor/skills/<name>/` deve ser **symlink** para `../../.agents/skills/<name>` (não
duplicar o conteúdo).

Auditoria: `node scripts/audit-skills.mjs` (zero duplicações reais).

---

## 3. Como adicionar um novo comando

1. Criar `.cursor/commands/<nome>.md` com frontmatter:
   ```yaml
   ---
   id: cmd-<nome>
   title: <Título>
   category: <project|build|generate|audit|deploy|hotfix>
   skills:
     - using-superpowers
     - <skill1>
     - <skill2>
   ---
   ```
2. Listar skills no corpo (`## Skills obrigatórias`).
3. Documentar saída esperada (`## Saída`) e critério de aceite.
4. Rodar `npm run verify:commands` — falha se referenciar skill inexistente.
5. Atualizar `docs/S03_SKILLS_INDEX.md` + `docs/S02_PROMPT_PACKS.md`.

---

## 4. Como adicionar uma nova skill VibeCoding-específica

1. Criar `.cursor/skills/<nome>/SKILL.md` com frontmatter:
   ```yaml
   ---
   name: <nome>
   description: >-
     <quando usar, em 2-3 frases imperativas>
   version: 1.0.0
   ---
   ```
2. Estruturar com seções: Quando usar / Patterns reusados / Roteiro / Saída / Hard stops / Próximo passo.
3. Rodar `node scripts/consolidate-skills.mjs` para regerar symlinks em `.claude/skills/`.
4. Atualizar `docs/S03_SKILLS_INDEX.md`.

---

## 5. Hooks — o que cada um faz

| Hook | Trigger | Função |
|---|---|---|
| `session-bootstrap.sh` | sessionStart | Detecta `.harness-pristine`, roda `harness-init.sh`, banner inicial |
| `enforce-skills.sh` | beforeSubmitPrompt | Bloqueia `/kickoff` se já consumido; bloqueia `/release` sem `08_SECURITY.md` |
| `phase-doc-sync.sh` | afterFileEdit | Mantém `DOCS_INDEX.md` coerente quando docs de fase mudam |
| `safe-commands.sh` | beforeShellExecution | Bloqueia comandos perigosos por stack (`HARNESS_STACK`) |
| `skill-discovery.sh` | onUserRequest | Sugere skills relevantes |
| `commit-validation.sh` | beforeShellExecution(git commit) | Valida formato e gate de pre-commit |
| `pr-readiness.sh` | beforeShellExecution(gh pr) | Exige `13_RELEASE_READINESS.md` |
| `secret-scan.sh` | beforeFileEdit / afterFileEdit | Bloqueia commits com secrets |
| `claude-mem` | sessionStart/sessionEnd | Cache + memória persistente |

Configuração: `.cursor/hooks.json` + `.claude/settings.json`.

---

## 6. Stacks (camada plug-in)

```
stacks/
├── nextjs/STACK.md       (default — SaaS web, dashboards, landing+app)
├── api-only/STACK.md     (Hono/Fastify backend)
├── mobile/STACK.md       (React Native + Expo)
└── cli/STACK.md          (Node + tsup)
```

Trocar de stack:
```
/init-stack <id>     # copia scaffold para raiz, atualiza package.json, registra ADR
```

Variável de ambiente: `HARNESS_STACK` em `.env` (default `nextjs`).

Hook `safe-commands.sh` lê `HARNESS_STACK` e aplica bloqueios apropriados:
- `nextjs`: bloqueia `db:demo:wipe@prod`, `prisma migrate reset` em prod
- `mobile`: bloqueia `eas build --auto-submit` sem RR GO, `rm -rf ios/android`
- `cli`: bloqueia `npm publish` sem RR GO
- `api-only`: bloqueia `rm -rf src/`

Rules específicas por stack: `.cursor/rules/stack/<stack>.mdc`.

---

## 7. Ciclo de release (operational gate chain)

```
/security-audit      → docs/08_SECURITY.md (GATE OK)
       ↓
/observability-setup → SLOs + dashboards + alertas (addendum em 13)
       ↓
/performance-baseline → docs/internal/perf-baseline.json
       ↓
/progressive-rollout → flags + canary + rollback (addendum em 13)
       ↓
/incident-response   → OPS02_RUNBOOK.md + docs/runbooks/<alerta>.md
       ↓
/release             → 13_RELEASE_READINESS.md → GO / GO-WITH-RISK / NO-GO
       ↓
/pr                  → PR aberto referenciando os 5 gates
```

`enforce-skills.sh` bloqueia `/release` se `docs/08_SECURITY.md` não existir.

---

## 8. Verificação

```bash
npm run verify              # docs + framework + integrity
npm run verify:commands     # comandos referenciam apenas skills canônicas
node scripts/audit-skills.mjs
# (futuro WS-F)
npm run verify:all          # roda tudo + verify-harness-init
```

---

## 9. Arquivos-chave

| Arquivo | Função |
|---|---|
| `scripts/harness-init.sh` | Reseta nome + DOCS_INDEX em cópia nova |
| `scripts/harness-config.mjs` | Getter/setter de `.harness-config.json` |
| `scripts/harness-status.mjs` | Snapshot da fase atual + próximo passo |
| `scripts/harness-event.mjs` | Logger append-only de telemetria |
| `scripts/harness-events.mjs` | Agregador/sumarizador de telemetria |
| `scripts/audit-skills.mjs` | Inventário de skills (4 localizações) |
| `scripts/consolidate-skills.mjs` | Regerar symlinks `.claude/skills/` |
| `scripts/verify-command-skills.mjs` | Validar referências de comando→skill |
| `scripts/rollout.sh` | Promote/hold/rollback/status (D4) |
| `.harness-pristine` | Marker de cópia nova (consumido em primeira sessão) |
| `.harness-config.json` | Single source of truth (versão/stack/trilha/telemetria) |
| `.harness/events.jsonl` | Telemetria local (append-only, gitignored) |
| `.cursor/hooks.json` | Wiring dos hooks |
| `WORKFLOW.md` | Visão de produto (fluxo de fases) |
| `docs/DOCS_INDEX.md` | Status atual + skills + gates |

---

## 10. Telemetria (privacy-first)

Cada hook emite 1 linha em `.harness/events.jsonl` ao executar (formato JSONL).
Falha do logger nunca quebra o hook (`>/dev/null 2>&1 || true`).

**Schema do evento:**
```json
{"ts":"2026-04-27T18:20:25.065Z","event":"hook|command|gate|phase|snapshot|error",
 "name":"<hook ou comando>","blocked":false,"reason":null,"meta":{}}
```

**Comandos:**
```bash
node scripts/harness-events.mjs              # sumário humano
node scripts/harness-events.mjs --json       # JSON estruturado
node scripts/harness-events.mjs --tail 20    # últimos N eventos crus
node scripts/harness-events.mjs --since 2026-04-01
```

**Privacidade:**
- `.harness/events.jsonl` está em `.gitignore` por default — nenhum dado sai do disco local.
- Rotação automática: arquivos > 10MB viram `.harness/events-<ts>.jsonl.gz`.
- Toggle global em `.harness-config.json`: `telemetry.enabled = false` desativa todos os emits.

**Opt-in remoto (futuro):**
- Setando `HARNESS_TELEMETRY_URL=https://...` no ambiente, eventos serão batched e enviados via POST.
- Requer opt-in explícito; nenhuma URL default é embutida.
- Payload contém apenas `ts/event/name/blocked/reason/meta` — nada de paths absolutos, conteúdo de docs ou PII.

**Hooks instrumentados (9):**
`session-bootstrap`, `enforce-skills` (×2), `safe-commands`, `phase-doc-sync` (×2), `verify-gate` (×2), `failure-journal`, `mcp-guard` (×2), `subagent-brief`, `tdd-loop` (×2).
