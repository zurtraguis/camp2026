# Stack: ecommerce

Estado: **Beta**. Catálogo + checkout transacional.

## Quando usar

- Loja virtual B2C ou B2B leve.
- Venda de produtos digitais ou físicos.
- `project_type=ecommerce`.

## Stack técnico

- Next.js App Router + Prisma + Stripe Checkout (default) ou Payment Element.
- Schema mínimo: `Product`, `Variant`, `Order`, `OrderItem`, `Customer`, `Webhook`.
- Webhook handler robusto (idempotente, com `stripe-signature` verificado).
- Inventory tracking opcional (ADR).
- Search: Postgres FTS ou Meilisearch (ADR).

## Skills priorizadas

- `stripe-best-practices`
- `stripe-projects`
- `upgrade-stripe`
- `email-and-password-best-practices`
- `interaction-design`
- `playwright-best-practices`
- `postgresql-table-design`
- `frontend-design`
- `accessibility-audit`

## Gates específicos

- `/monetization-check` **obrigatório**.
- `/content-model` (schema de produtos).
- `/seo` obrigatório (product schema.org, sitemap por categoria).
- Suite Playwright cobrindo: listagem → produto → checkout → webhook → confirmação.
- LGPD/GDPR: política de dados, consentimento de cookies.

## Comandos perigosos

- `prisma migrate reset` em produção (bloqueado).
- Deploy sem `STRIPE_WEBHOOK_SECRET` setado.
