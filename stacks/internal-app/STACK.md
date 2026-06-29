# Stack: internal-app

Estado: **Beta**. App interno (intranet, ferramenta de equipe) sem monetização, sem SEO público.

## Quando usar

- Ferramentas internas, dashboards de operação, painéis admin.
- Apps que nunca serão expostos a clientes finais.
- `project_type=internal-app`.

## Stack técnico

- Next.js App Router + Prisma + Auth.js (provider único: SSO corporativo OU magic link).
- Sem Stripe, sem páginas de marketing, sem CMS.
- **`robots: noindex, nofollow`** como default global.
- Headers de privacidade reforçados: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
- Audit log de ações sensíveis obrigatório.

## Skills priorizadas

- `auth-implementation-patterns`
- `two-factor-authentication-best-practices`
- `better-auth-best-practices`
- `accessibility-compliance`
- `secrets-management`
- `nodejs-backend-patterns`
- `postgresql-table-design`

## Gates específicos

- `/market` é **substituído** por `/internal-stakeholder-map` (mapeia sponsors, sistemas integrados, dados sensíveis).
- `/monetization-check` **skippado**.
- `/seo` **skippado**.
- Auth obrigatório em todas as rotas exceto `/login`.
- LGPD interno: classificar PII manipulada.

## Comandos perigosos

- Remover `noindex` global (bloqueado).
- Expor rotas sem middleware de auth.
