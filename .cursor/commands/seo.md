---
id: cmd-seo
title: SEO técnico e schema.org
category: web
model: sonnet
skills:
  - using-superpowers
  - frontend-design
  - asset-generator
  - accessibility-compliance
  - ux-writing
---

# `/seo` — SEO técnico, sitemap, OG e schema.org

## Skills obrigatórias
`/using-superpowers`, `/frontend-design`, `/asset-generator`, `/accessibility-compliance`, `/ux-writing`.

## Gate condicional
`node scripts/phase-state.mjs gate-policy seo` deve retornar `required` ou `optional`. Se `skip` (internal-app), encerrar.

## Objetivo
Gerar `docs/14_SEO.md` com:
- Title/Description templates por rota.
- Open Graph e Twitter Cards (incluir geração via `next/og`).
- Sitemap dinâmico (`app/sitemap.ts`) e `robots.ts`.
- JSON-LD schema.org adequado ao `project_type`:
  - blog → `Article`, `BreadcrumbList`.
  - ecommerce → `Product`, `Offer`, `BreadcrumbList`.
  - repository-catalog → `Product` / `RealEstateListing` / `Service` por `type` de item.
  - landing/single-page → `Organization`, `WebSite`.
- Canonical URLs e hreflang (se i18n).

## Passos
1. Ler `phase-state.project_type`.
2. Mapear rotas críticas em `src/app/**`.
3. Para cada rota, gerar/atualizar `metadata` (Next.js App Router) e OG image dinâmica.
4. Adicionar `sitemap.ts` e `robots.ts`.
5. Para cada `type` (repo-catalog) ou template (blog), incluir JSON-LD apropriado.
6. Validar com `lighthouse` (gate SEO ≥ 95) e Rich Results Test.

## Gate de saída
- Lighthouse SEO ≥ 95.
- Zero erros em Rich Results Test para amostras de cada template.
- `docs/14_SEO.md` revisado.
