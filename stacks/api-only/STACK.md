# Stack: api-only (beta)

Backend HTTP autônomo, sem frontend acoplado. Use para serviços de API, integrações ou microserviços.

## Decisões padrão

- **Framework:** Hono (performance, primitivos minimalistas) — alternativa: Fastify.
- **DB:** Prisma + PostgreSQL (igual ao default).
- **Validação:** Zod nas bordas.
- **Tracing:** OpenTelemetry com exporter OTLP/HTTP.

## Pré-condições para `/init-stack api-only`

- `docs/00_VALIDATION.md` preenchido (não roda sobre kickoff pendente).
- Cópia inicializada (`.harness-pristine.consumed` presente).
- Sem `src/app/` (Next.js) — ou usuário aceita removê-lo.

## Arquivos copiados de `stacks/api-only/scaffold/` para a raiz

- `src/index.ts` — bootstrap Hono
- `src/routes/health.ts`
- `src/lib/logger.ts`
- `tsconfig.json` (override sem JSX)

## Comandos perigosos (bloqueados quando HARNESS_STACK=api-only)

- `prisma migrate reset` sem `ALLOW_DESTRUCTIVE=1`
- `git push --force` para main/master
- `rm -rf src/`

## Skills priorizadas

- `nodejs-backend-patterns`
- `api-design-principles`
- `openapi-spec-generation`
- `auth-implementation-patterns`
- `secrets-management`
- `prometheus-configuration`

## Diferenças do default (Next.js)

| Item | Next.js | api-only |
| --- | --- | --- |
| Frontend | sim | não |
| Server Components | sim | n/a |
| Lighthouse CI | sim | não |
| OpenAPI spec obrigatória | opcional | sim (gate) |
