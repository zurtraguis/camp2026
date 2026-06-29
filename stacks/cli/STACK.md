# Stack: cli (beta)

Ferramenta de linha de comando em Node.js + TypeScript. Distribuída via npm/bunx.

## Decisões padrão

- **Runtime:** Node 20+ (publica como `engines: { node: ">=20" }`).
- **Linguagem:** TypeScript com `tsup` para bundling.
- **CLI parsing:** `commander` ou `yargs`.
- **Distribuição:** `bin` field em package.json, publicação via npm.

## Pré-condições para `/init-stack cli`

- `docs/00_VALIDATION.md` preenchido.
- Cópia inicializada.
- Decisão sobre nome no npm (escopo + nome único).

## Arquivos copiados de `stacks/cli/scaffold/` para a raiz

- `src/cli.ts` (entrypoint)
- `src/commands/` (estrutura por subcomando)
- `tsup.config.ts`
- `tsconfig.json` (override CLI)

## Comandos perigosos (bloqueados quando HARNESS_STACK=cli)

- `npm publish --access public` sem `docs/13_RELEASE_READINESS.md` com GO/GO WITH RISK.
- `git push --force` para main/master.
- `rm -rf dist/` enquanto há processo de publicação em andamento.

## Skills priorizadas

- `nodejs-backend-patterns`
- `bash-defensive-patterns`
- `bats-testing-patterns`
- `error-handling-patterns`
- `changelog-automation`

## Diferenças do default

| Item | Next.js | cli |
| --- | --- | --- |
| Frontend | sim | não |
| Lighthouse CI | sim | não |
| Empacotamento | next build | tsup |
| Publicação | Docker/Vercel | npm publish |
| Smoke test | Playwright | execução `--help` + cenários BATS |
