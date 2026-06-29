# IDE_SETUP — Harness em qualquer IDE/LLM

> O harness é **LLM-agnostic** e **IDE-agnostic**. Esta página descreve como instalar/configurar para cada combinação.

## Princípios

1. **Tiers, não models**: agentes consomem tiers abstratos (`reasoning-heavy`, `reasoning-medium`, `reasoning-light`). O modelo concreto vem de `.harness/agent-tiers.json`.
2. **Hooks neutros**: lógica em `.harness/hooks/<name>.mjs` (Node, cross-platform). IDE-specific shims em `.cursor/hooks/`, `.claude/`, etc.
3. **Provider via env**: `HARNESS_PROVIDER=claude|openai|google|xai|local|auto` resolve qual modelo concreto usar.
4. **Sem dependência de runtime do agente**: tudo que falha em CI/CLI também falha localmente.

## Instalação rápida

```bash
node scripts/install-hooks.mjs --ide=<sua-ide>
```

IDEs suportadas:

| IDE          | Flag                  | Hook config gerado                       |
|--------------|-----------------------|-------------------------------------------|
| Cursor       | `--ide=cursor`        | `.cursor/hooks.json` + shims em `.cursor/hooks/*.sh` |
| Claude Code  | `--ide=claude-code`   | `.claude/settings.json` (hooks block)     |
| Cline        | `--ide=cline`         | `.cline/hooks.json`                       |
| Continue     | `--ide=continue`      | `.continue/config.json` (hook section)    |
| Aider        | `--ide=aider`         | `.aider.conf.yml` + pre/post commit refs  |
| VS Code      | `--ide=vscode`        | `.vscode/tasks.json` (manual triggers)    |
| Genérico/CLI | `--ide=cli`           | apenas `.harness/hooks/*.mjs` (rode manualmente) |

## Provider/Model matrix

Tier → modelo é definido em [`.harness/agent-tiers.json`](../.harness/agent-tiers.json).

Para trocar de provider:

```bash
export HARNESS_PROVIDER=openai
node scripts/resolve-model.mjs architect      # → gpt-5
node scripts/resolve-model.mjs qa-auditor     # → gpt-5-nano
```

`HARNESS_PROVIDER=auto` escolhe o primeiro provider com env-key configurada.

## Agentes vs tiers

| Agente             | Tier             |
|--------------------|------------------|
| architect          | reasoning-heavy  |
| designer           | reasoning-heavy  |
| builder            | reasoning-heavy  |
| security-auditor   | reasoning-heavy  |
| harness-reviewer   | reasoning-heavy  |
| seo-specialist     | reasoning-medium |
| asset-creator      | reasoning-medium |
| debugger           | reasoning-medium |
| review             | reasoning-medium |
| ui-reviewer        | reasoning-medium |
| qa-auditor         | reasoning-light  |
| deploy-manager     | reasoning-light  |

## Customizando o mapeamento

Edite `.harness/agent-tiers.json` para adicionar provider novo ou trocar model. **Nunca** referencie model names em `AGENTS.md`, `WORKFLOW.md` ou em `.cursor/agents/*.md` — o lint `harness:agnostic:lint` falha CI.

## Verificação

```bash
node scripts/lint-agnosticism.mjs    # zero model names em arquivos canônicos
node scripts/resolve-model.mjs --list
```
