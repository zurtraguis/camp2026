# Harness Upgrade Notes — sessão 2026-05-07

Refinamento implementado conforme `/home/usuario/.claude/plans/purrfect-squishing-dusk.md`.

## Novos artefatos (não-destrutivos)

### Estado de fase (fonte única — WS-1)
- `.harness/phase-state.json`
- `scripts/phase-state.mjs`
  - API: `getPhaseState`, `setPhaseState`, `detectActivePhase`, `isPhaseActive`, `validate`
  - CLI: `node scripts/phase-state.mjs <get|set|detect|validate>`

### Roteamento LLM-agnostic (WS-3)
- `.harness/agent-tiers.json` — mapping tier → modelo por provider (claude/openai/google/xai/local)
- `scripts/resolve-model.mjs` — resolve agent → model via env `HARNESS_PROVIDER`
- `scripts/lint-agnosticism.mjs` — falha CI se algum arquivo canônico cita model names
- `docs/IDE_SETUP.md` — matriz de IDEs suportadas

### Briefs slim (WS-2)
- `docs/briefs/{00..15}_BRIEF.md` (16) + `INT01-03_BRIEF.md` (3) + `OPS01-03_BRIEF.md` (3) + `S01-S05_BRIEF.md` (5) = 27
- `scripts/brief-generator.mjs` — `verify | hash | list`

### Hooks IDE-agnostic (WS-4)
- `.harness/hooks/manifest.json`
- `.harness/hooks/{enforce-skills,phase-doc-sync,tdd-loop,subagent-brief}.mjs` (Node, cross-platform)
- `scripts/install-hooks.mjs --ide=<cursor|claude-code|cline|continue|aider|vscode|cli>`

### Skills audit (WS-5)
- `scripts/skills-audit.mjs` — disco vs `S03_SKILLS_INDEX.md` (`--strict | --json`)

### Demo data evolutivo (WS-6)
- `prisma/seed/index.ts` — orquestra por `activePhase`
- `prisma/seed/registry.ts` — lista ordenada de seeders
- `prisma/seed/phases/{00,03,04,06,07,14}.ts` — seeders idempotentes (isDemo=true)

### Skills custom P0 (WS-7)
- `.cursor/skills/lgpd-data-mapping/SKILL.md`
- `.cursor/skills/dpa-template-pt-br/SKILL.md`
- `.cursor/skills/data-subject-rights-flow/SKILL.md`
- `.cursor/skills/experiment-design/SKILL.md`
- `.cursor/skills/llm-observability/SKILL.md`
- `.cursor/skills/dev-onboarding-pack/SKILL.md`
- `.cursor/skills/customer-feedback-loop/SKILL.md`

### Tom dialógico (WS-8)
- `scripts/notice.mjs` — emissor único com 4 níveis (`tip | nudge | warn | block`), rate-limit, env `HARNESS_QUIET=1`

### Enterprise LGPD (WS-9)
- `docs/templates/14_COMPLIANCE_FIXTURES/ROPA_TEMPLATE.md`
- Seeder de fase 14 popula audit log + DSR fixture

### Doctor (smoke test)
- `scripts/harness-doctor.mjs` — 8 sub-validações

---

## Como usar (smoke completo)

```bash
# 1. Definir fase ativa
node scripts/phase-state.mjs set --active=03

# 2. Verificar tudo
node scripts/harness-doctor.mjs

# 3. Gerar hooks para sua IDE
node scripts/install-hooks.mjs --ide=cursor

# 4. Resolver modelo abstrato → concreto
HARNESS_PROVIDER=openai node scripts/resolve-model.mjs architect
HARNESS_PROVIDER=claude node scripts/resolve-model.mjs qa-auditor

# 5. Audit de skills
node scripts/skills-audit.mjs

# 6. Seed de demo evolutivo
npm run db:seed   # (após adicionar script ao package.json — ver abaixo)
```

## Wiring pendente (manual, baixo risco)

Para ativar tudo, adicione ao `package.json` `scripts`:

```json
{
  "harness:doctor":            "node scripts/harness-doctor.mjs",
  "harness:phase":             "node scripts/phase-state.mjs",
  "harness:briefs:verify":     "node scripts/brief-generator.mjs verify",
  "harness:agnostic:lint":     "node scripts/lint-agnosticism.mjs",
  "harness:skills:audit":      "node scripts/skills-audit.mjs",
  "harness:install-hooks":     "node scripts/install-hooks.mjs",
  "db:seed":                   "tsx prisma/seed/index.ts",
  "db:seed:legacy":            "tsx prisma/seed.ts"
}
```

E adicione brief hashes (após estabilizar fases canônicas):

```bash
for f in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  node scripts/brief-generator.mjs hash "docs/templates/${f}_*.md" 2>/dev/null
done
```

(Atualizar `Hash:` em cada `docs/briefs/*_BRIEF.md` com o valor retornado.)

## Migração de hooks (opcional)

Os hooks shell em `.cursor/hooks/*.sh` continuam funcionando. Para migrar:

```bash
node scripts/install-hooks.mjs --ide=cursor   # gera shims para os .mjs
```

Os `.sh` antigos podem ser preservados ou substituídos pelos shims gerados.

## Princípios preservados

- **Idempotência**: todos os seeders e scripts podem ser re-executados.
- **Não-destrutivo**: nenhuma mudança altera arquivos pré-existentes; tudo é aditivo.
- **isDemo=true**: todos os dados semeados continuam marcados; `wipe-demo.ts` continua funcional.
- **track resolver**: WS-6 e WS-9 respeitam o track ativo (lite/standard/enterprise).
- **LLM/IDE-agnóstico**: zero acoplamento a Claude/Opus/Sonnet/Haiku em arquivos canônicos. Lint protege regressão.
