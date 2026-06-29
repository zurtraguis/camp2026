# Stack: repository-catalog

Estado: **Beta**. Catálogo navegável de itens (imóveis, serviços, portfólio, empreendimentos, profissionais).

## Quando usar

- Imobiliária listando empreendimentos.
- Empresa de serviços listando ofertas/cases.
- Portfólio de profissionais ou produtos de showcase.
- Diretório/marketplace sem checkout (lead-gen via formulário).
- `project_type=repository-catalog`.

## Stack técnico

- Next.js App Router + Prisma.
- **Schema base** (extensível por `type`):
  ```prisma
  model Item {
    id          String   @id @default(cuid())
    slug        String   @unique
    type        String   // "empreendimento" | "servico" | "produto" | ...
    title       String
    summary     String?
    description String?  // markdown
    coverUrl    String?
    gallery     Json?    // [{ url, alt }]
    attrs       Json     // atributos específicos por type
    status      String   @default("draft") // draft|published|archived
    publishedAt DateTime?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    @@index([type, status])
  }
  model Lead {
    id        String   @id @default(cuid())
    itemId    String?
    name      String
    email     String
    phone     String?
    message   String?
    source    String?
    createdAt DateTime @default(now())
  }
  ```
- Busca/filtros: Postgres FTS + filtros por atributo (range, enum, geo).
- Sitemap automático por `type` e por item.
- OG image dinâmica por item.
- Form de contato/lead por item.

## Skills priorizadas

- `postgresql-table-design`
- `sql-optimization-patterns`
- `api-design-principles`
- `frontend-design`
- `web-asset-generator`
- `accessibility-audit`
- `responsive-design`
- `ux-writing`

## Gates específicos

- `/catalog-schema` **obrigatório** (define `type`s e atributos por tipo).
- `/content-model` obrigatório.
- `/seo` obrigatório (schema.org `Product`, `RealEstateListing`, `Service` conforme tipo).
- `/monetization-check` opcional (destaque pago, planos para anunciantes).
- Lighthouse SEO = 100; CWV verde.

## Exemplos de uso

- **Imobiliária**: `type ∈ {empreendimento, casa, apartamento, terreno}` — `attrs: { quartos, banheiros, area_m2, vagas, bairro, lat, lng }`.
- **Consultoria**: `type ∈ {servico, case}` — `attrs: { duracao, entregaveis, faixa_preco }`.
- **Portfólio**: `type ∈ {projeto, peca}` — `attrs: { cliente, ano, categorias[] }`.
