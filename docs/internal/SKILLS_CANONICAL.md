# Skills Canonical Map

Define a fonte de verdade para cada skill no harness e a regra de resolução.

## Locais

| Local | Papel | Quem mantém |
| --- | --- | --- |
| `.cursor/skills/` | Skills VibeCoding-específicas (identidade do harness) e symlinks para skills externas duplicadas. Lido pela Cursor IDE e pelo hook `enforce-skills.sh`. | Mantenedor do harness. |
| `.cursor/skills-web-excellence/` | 71 skills do framework Web Excellence em formato flat-md (categorias). Mantida fora da consolidação. | `npm run manifest`. |
| `.agents/skills/` | Skills externas instaladas via `npx skills add` (claude-mem, superpowers, context7, context-mode). Fonte canônica para tudo que vem de fora. | Atualizada por `skills-lock.json` + `npx skills add --yes`. |
| `.claude/skills/` | Symlinks expondo todas as skills relevantes ao Claude Code (agrega `.cursor/skills/` + `.agents/skills/`). | Recriado por `node scripts/consolidate-skills.mjs`. |

## Regras de canonicidade

1. **Skill externa (npx skills add)** ⇒ canonical = `.agents/skills/<name>/`. O harness não edita esse diretório à mão.
2. **Skill VibeCoding** (ex: `validate`, `prd`, `spec`, `release`, `pr`, `market`, `setup`, `debugger`, `test-writer`, `implement-backend`, `implement-frontend`, padrões técnicos como `auth-implementation-patterns`, etc.) ⇒ canonical = `.cursor/skills/<name>/`.
3. **Skill duplicada** entre os dois ⇒ canonical = `.agents/skills/<name>/`. A entrada em `.cursor/skills/<name>/` deve ser symlink relativo `../../.agents/skills/<name>`.
4. **`.claude/skills/<name>`** sempre é symlink, nunca diretório real.

## Skills consolidadas (13 dupes resolvidas)

Após `node scripts/consolidate-skills.mjs`, estas skills passam a viver em `.agents/skills/` e `.cursor/skills/<name>` é symlink:

- `brainstorming`
- `executing-plans`
- `finishing-a-development-branch`
- `receiving-code-review`
- `requesting-code-review`
- `subagent-driven-development`
- `systematic-debugging`
- `test-driven-development`
- `using-git-worktrees`
- `using-superpowers`
- `verification-before-completion`
- `writing-plans`
- `writing-skills`

## Como adicionar nova skill

| Tipo | Onde | Como |
| --- | --- | --- |
| VibeCoding-específica (mexe em docs do harness, comandos de fase) | `.cursor/skills/<name>/SKILL.md` | Criar manualmente. Rodar `node scripts/consolidate-skills.mjs` para expor em `.claude/skills/`. |
| Externa (de skills.sh / superpowers) | `.agents/skills/<name>/` | `npx skills add --yes <repo>` então `node scripts/consolidate-skills.mjs`. |
| Web Excellence | `.cursor/skills-web-excellence/<categoria>/<name>.md` | Editar e rodar `npm run manifest` para regenerar grafo. |

## Verificação

```bash
node scripts/audit-skills.mjs       # zero duplicações reais
node scripts/verify-command-skills.mjs  # todas as skills referenciadas existem
```
