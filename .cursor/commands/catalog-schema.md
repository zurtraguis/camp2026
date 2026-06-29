---
id: cmd-catalog-schema
title: Schema de catálogo (repository-catalog)
category: content
model: sonnet
skills:
  - using-superpowers
  - postgresql-table-design
  - sql-optimization-patterns
  - api-design-principles
  - doc-coauthoring
---

# `/catalog-schema` — Definir tipos e atributos do catálogo

## Skills obrigatórias
`/using-superpowers`, `/postgresql-table-design`, `/sql-optimization-patterns`, `/api-design-principles`, `/doc-coauthoring`.

## Quando usar
Quando `project_type=repository-catalog`. Pré-requisito de `/content-model` e `/spec`.

## Objetivo
Definir os `type`s de item do catálogo e seus atributos comuns/específicos, gerando:
- `docs/16_CATALOG_SCHEMA.md`
- `prisma/schema.prisma` com modelo `Item` (ver `stacks/repository-catalog/STACK.md`) + enums/índices.
- Zod schemas em `src/lib/catalog/types/<type>.ts` validando o JSON `attrs` por tipo.
- Mapping `type → JSON-LD` (consumido por `/seo`).

## Passos
1. Listar `type`s do catálogo (ex.: `empreendimento`, `casa`, `apartamento`, `terreno` para imobiliária).
2. Para cada tipo definir atributos:
   - Comuns: `title, summary, coverUrl, gallery, status`.
   - Específicos: ex. `quartos, banheiros, area_m2, vagas, bairro, lat, lng` para imóveis.
   - Filtros de busca prováveis (range, enum, geo).
3. Definir índices Postgres apropriados (B-tree em `(type, status)`, GIN em `attrs jsonb`, FTS em `title + summary`).
4. Definir mapping schema.org por tipo (`RealEstateListing`, `Service`, `Product`).
5. Especificar contratos de API: `GET /api/items?type=...&filters=...`, `GET /api/items/[slug]`.
6. Documentar política de slug e SEO por item.

## Gate de saída
- Pelo menos 2 `type`s definidos com atributos concretos.
- Migration gerada e válida.
- Mapping schema.org documentado.
- Query plans verificados em amostras realistas (EXPLAIN).
