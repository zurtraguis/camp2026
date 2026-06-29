---
id: cmd-content-model
title: Modelo de conteúdo (MDX/CMS/Catálogo)
category: content
model: sonnet
skills:
  - using-superpowers
  - postgresql-table-design
  - doc-coauthoring
  - ux-writing
  - api-design-principles
---

# `/content-model` — Definir modelo de conteúdo

## Skills obrigatórias
`/using-superpowers`, `/postgresql-table-design`, `/doc-coauthoring`, `/ux-writing`, `/api-design-principles`.

## Gate condicional
`gate-policy content-model` deve ser `required` (blog, ecommerce, repository-catalog) ou `optional`.

## Objetivo
Documentar e codificar o schema de conteúdo do projeto. Saída:
- `docs/15_CONTENT_MODEL.md`
- Para MDX (blog): frontmatter Zod schema em `src/lib/content/schema.ts`.
- Para Prisma (ecommerce, repo-catalog): modelo no `prisma/schema.prisma`.

## Passos
1. Ler `project_type` e o STACK.md correspondente.
2. Listar entidades de conteúdo (post, produto, item, serviço, FAQ, página).
3. Para cada entidade definir: campos obrigatórios, opcionais, validações, índices, slug, status (draft/published/archived).
4. Gerar Zod e/ou Prisma schema com migration draft.
5. Documentar query patterns (list, detail, filter, search).
6. Definir política de versionamento / preview / draft mode.

## Gate de saída
- Schema implementável sem ambiguidade.
- Migrations geram sem warnings.
- `npm run typecheck` ok.
