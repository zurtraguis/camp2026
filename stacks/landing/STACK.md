# Stack: landing

Estado: **Beta**. Página única com CTA principal, formulário de captura e analytics. Sem Prisma, sem auth, sem billing.

## Quando usar

- Pré-lançamento de produto (waitlist).
- Página institucional simples com 1–3 CTAs.
- `project_type=landing` ou `single-page`.

## Stack técnico

- Next.js App Router (estático sempre que possível: `export const dynamic = "force-static"`).
- Tailwind CSS v4 + design tokens do harness (`/design`).
- Form handler: Resend, Web3Forms ou Formspree (escolher em ADR).
- Analytics: Vercel Analytics ou Plausible.
- Sem Prisma, sem `auth.ts`, sem Stripe.

## Skills priorizadas

- `frontend-design`
- `tailwind-design-system`
- `responsive-design`
- `ux-writing`
- `web-asset-generator` (OG image + favicon)
- `accessibility-audit`
- `theme-factory`

## Gates específicos

- Lighthouse Performance + SEO ≥ 95 (gate antes de `/release`).
- LCP ≤ 2.5s em 4G simulado.
- Acessibilidade WCAG 2.2 AA (axe-core zero violações críticas).

## Gates skippados automaticamente

- `/monetization-check` — não há receita.
- `/spec` em modo "leve" — não há contratos de API.

## Comandos perigosos bloqueados

- Adicionar Prisma sem ADR.
- Importar Stripe SDK.
