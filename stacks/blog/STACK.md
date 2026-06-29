# Stack: blog

Estado: **Beta**. Conteúdo editorial com MDX local ou CMS headless.

## Quando usar

- Blog técnico, newsletter, base de conhecimento.
- Marketing de conteúdo, SEO long-tail.
- `project_type=blog`.

## Stack técnico

- Next.js App Router + MDX (`@next/mdx` ou Contentlayer).
- Frontmatter: `title, slug, date, author, tags, excerpt, cover`.
- RSS feed (`/rss.xml`) e sitemap automáticos.
- OG images dinâmicas via `next/og`.
- **ADR obrigatório** se optar por CMS headless (Sanity, Payload, Contentful, Strapi).

## Skills priorizadas

- `frontend-design`
- `ux-writing`
- `doc-coauthoring`
- `web-asset-generator`
- `accessibility-audit`
- `tailwind-design-system`
- `responsive-design`

## Gates específicos

- `/content-model` obrigatório (define frontmatter schema).
- `/seo` obrigatório (sitemap, robots, schema.org Article).
- Lighthouse SEO = 100.
- Cada post tem `og:image` único.

## Gates skippados

- `/monetization-check` (a menos que use ads — então vira `optional`).

## Comandos perigosos

- Adicionar dezenas de plugins MDX sem ADR (degrada build).
