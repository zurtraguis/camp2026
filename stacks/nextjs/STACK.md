# Stack: Next.js (default)

Estado: **Estável**. Material vive na raiz do repo (`src/`, `prisma/`, `next.config.ts`, etc.).
Não há nada para copiar — este stack já é o default ao inicializar uma cópia do harness.

## Comandos perigosos (bloqueados pelo safe-commands.sh quando HARNESS_STACK=nextjs)

- `db:demo:wipe` em NODE_ENV=production
- `prisma migrate reset` sem `ALLOW_DESTRUCTIVE=1`
- `git push --force` para main/master

## Skills priorizadas

- `react-state-management`
- `tailwind-design-system`
- `nodejs-backend-patterns`
- `auth-implementation-patterns`
- `playwright-best-practices`
- `web-performance-optimization` (web-excellence)

## Critérios de aceite por fase

Os mesmos do harness padrão — ver `docs/DOCS_INDEX.md`.
