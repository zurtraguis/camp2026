---
id: cmd-init-project
title: Inicializar Projeto Web
version: 2.0
last_updated: 2026-04-07
category: project
agent: 01-architect
skills:
  - build-design-tokens
---

# `/init-project [tipo] [nicho]`

Inicializa um projeto Next.js 16 (App Router) completo com TypeScript strict, Tailwind CSS v4, e toda a estrutura de pastas otimizada para o tipo e nicho do projeto.

---

## Repositório já existe (brownfield) — OBRIGATÓRIO LER

**Este repositório (VibeCoding + Web Excellence unificado) já contém** `package.json`, `src/app/`, Prisma e rotas. **NÃO executar** `create-next-app` na raiz nem sobrescrever ficheiros existentes.

Neste caso:

1. **Saltar** a secção “Core (todos os tipos)” com `create-next-app`.
2. Comparar dependências sugeridas abaixo com `package.json`; instalar **só** o que a `docs/06_SPECIFICATION.md` aprovar (ex.: `framer-motion` apenas se motion estiver no scope).
3. Usar `/init-tokens`, `/init-seo`, `/new-page` para evoluir UI em cima de `src/app/(marketing)`, `(auth)`, `(app)`.
4. Respeitar `docs/01_PRD.md` / `docs/06_SPECIFICATION.md` como fonte de verdade.

---

## Parâmetros

| Parâmetro | Obrigatório | Valores Aceitos | Descrição |
|-----------|-------------|-----------------|-----------|
| `tipo` | ✅ Sim | `landing` · `saas` · `ecommerce` · `portfolio` · `blog` | Tipo de projeto que define a estrutura de pastas, dependências e estratégia de rendering |
| `nicho` | ✅ Sim | `cafe` · `fintech` · `health` · `education` · `fashion` · `tech` · `food` · `creative` | Nicho de mercado que influencia conteúdo placeholder, paleta sugerida e assets |

---

## Dependências a Instalar

### Core (todos os tipos)
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

### Produção (todos os tipos)
```bash
pnpm add tailwindcss@next framer-motion @t3-oss/env-nextjs zod prisma @prisma/client sharp schema-dts clsx tailwind-merge
```

### Desenvolvimento (todos os tipos)
```bash
pnpm add -D @types/node @types/react @types/react-dom eslint-config-next prettier prettier-plugin-tailwindcss @tailwindcss/postcss
```

### Dependências por Tipo

| Tipo | Dependências Adicionais |
|------|------------------------|
| `landing` | `react-intersection-observer` |
| `saas` | `@clerk/nextjs` · `stripe` · `@tanstack/react-query` · `zustand` |
| `ecommerce` | `stripe` · `@tanstack/react-query` · `zustand` · `react-hook-form` · `@hookform/resolvers` |
| `portfolio` | `react-intersection-observer` · `@mdx-js/react` · `@next/mdx` |
| `blog` | `@mdx-js/react` · `@next/mdx` · `contentlayer2` · `rehype-pretty-code` · `shiki` |

### Dependências por Nicho (complementares)

| Nicho | Sugestões Adicionais |
|-------|---------------------|
| `cafe` | Fontes serifadas, galeria de produtos, mapa de localização |
| `fintech` | Charts (`recharts`), tabelas de dados, formulários complexos |
| `health` | Formulário de agendamento, cards de serviços, depoimentos |
| `education` | Plataforma de cursos, progress bars, vídeo embeds |
| `fashion` | Galeria full-bleed, lookbook, filtros de produto |
| `tech` | Code snippets (`shiki`), changelogs, docs integrados |
| `food` | Cardápio digital, galeria de pratos, reservas, delivery |
| `creative` | Portfolio grid masonry, transições cinematográficas, case studies |

---

## Estrutura de Pastas por Tipo

### `landing`
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── not-found.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   └── opengraph-image.tsx
├── components/
│   ├── ui/           # Button, Badge, Input, Card
│   ├── layout/       # Header, Footer, Container, Section
│   └── sections/     # Hero, Features, Pricing, FAQ, CTA, SocialProof, Logos
├── lib/
│   ├── utils.ts      # cn(), formatadores
│   ├── fonts.ts      # Configuração next/font
│   └── metadata.ts   # Helpers de metadata
├── config/
│   └── site.ts       # Nome, descrição, URLs, redes sociais
└── types/
    └── index.ts      # Tipos globais
```

### `saas`
```
src/
├── app/
│   ├── (marketing)/       # Landing pages públicas
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pricing/page.tsx
│   │   └── about/page.tsx
│   ├── (auth)/            # Login, signup, esqueci senha
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (dashboard)/       # Área autenticada
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── globals.css
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── sections/
│   ├── dashboard/
│   └── forms/
├── lib/
│   ├── utils.ts
│   ├── fonts.ts
│   ├── metadata.ts
│   ├── prisma.ts      # Singleton do Prisma Client
│   └── stripe.ts      # Config do Stripe
├── config/
│   ├── site.ts
│   ├── plans.ts       # Planos e preços
│   └── navigation.ts
├── hooks/
│   ├── use-auth.ts
│   └── use-subscription.ts
└── types/
    └── index.ts
```

### `ecommerce`
```
src/
├── app/
│   ├── (storefront)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── categories/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   └── checkout/page.tsx
│   ├── (account)/
│   │   ├── orders/page.tsx
│   │   └── profile/page.tsx
│   ├── api/
│   │   └── webhooks/stripe/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── sections/
│   ├── product/       # ProductCard, ProductGallery, ProductInfo
│   ├── cart/          # CartSheet, CartItem, CartSummary
│   └── checkout/      # CheckoutForm, PaymentForm, OrderSummary
├── lib/
│   ├── utils.ts
│   ├── fonts.ts
│   ├── prisma.ts
│   ├── stripe.ts
│   └── cart.ts
├── hooks/
│   ├── use-cart.ts
│   └── use-products.ts
└── types/
    ├── index.ts
    └── product.ts
```

### `portfolio`
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── contact/page.tsx
│   ├── globals.css
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── sections/
│   └── portfolio/     # ProjectCard, ProjectGallery, SkillBadge
├── content/
│   ├── projects/      # MDX de projetos
│   └── blog/          # MDX de posts
├── lib/
│   ├── utils.ts
│   ├── fonts.ts
│   └── mdx.ts
└── types/
    └── index.ts
```

### `blog`
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   ├── [slug]/page.tsx
│   │   └── category/[slug]/page.tsx
│   ├── about/page.tsx
│   ├── globals.css
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/
│   ├── layout/
│   ├── sections/
│   └── blog/          # PostCard, PostHeader, PostBody, TableOfContents
├── content/
│   └── posts/         # Arquivos MDX
├── lib/
│   ├── utils.ts
│   ├── fonts.ts
│   ├── mdx.ts
│   └── content.ts
└── types/
    └── index.ts
```

---

## Passo a Passo de Execução

### Passo 1 — Criar projeto Next.js
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

### Passo 2 — Configurar TypeScript strict
Atualizar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Passo 3 — Instalar dependências
Instalar dependências core + específicas do `[tipo]` conforme tabelas acima.

### Passo 4 — Configurar variáveis de ambiente
Criar `src/env.ts` com `@t3-oss/env-nextjs` e `zod`:
```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

### Passo 5 — Configurar `next.config.ts` com security headers
```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

### Passo 6 — Criar estrutura de pastas
Gerar toda a árvore de diretórios conforme o `[tipo]` selecionado. Criar arquivos base com conteúdo mínimo funcional.

### Passo 7 — Criar arquivos iniciais

**`src/app/layout.tsx`**:
```tsx
import type { Metadata, Viewport } from "next";
import { fontSans, fontHeading } from "@/lib/fonts";
import "@/app/globals.css";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontHeading.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**`src/app/page.tsx`** (skeleton):
```tsx
export default function HomePage() {
  return (
    <main id="main" className="flex min-h-screen flex-col">
      {/* Sections serão adicionadas com /new-section */}
    </main>
  );
}
```

**`src/app/globals.css`** (skeleton para /init-tokens preencher):
```css
@import "tailwindcss";

@theme {
  /* Tokens serão gerados pelo comando /init-tokens */
}
```

**`src/config/site.ts`**:
```typescript
export const siteConfig = {
  name: "Nome do Projeto",
  description: "Descrição do projeto",
  url: "https://exemplo.com.br",
  ogImage: "https://exemplo.com.br/og.jpg",
  links: { twitter: "", github: "" },
} as const;
```

**`src/lib/utils.ts`**:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Passo 8 — Criar ADR inicial
Criar `docs/adr/001-stack-inicial.md` documentando:
- Tipo de projeto escolhido e por quê
- Nicho e suas influências na stack
- Dependências adicionadas e justificativas
- Estratégia de rendering por rota
- Data layer selecionado

### Passo 9 — Inicializar Prisma (se tipo ≠ landing)
```bash
npx prisma init --datasource-provider postgresql
```

### Passo 10 — Verificar instalação
```bash
pnpm dev
```
Confirmar que o projeto compila sem erros.

---

## Mapeamento Nicho → Conteúdo Sugerido

| Nicho | Fontes Sugeridas | Paleta Sugerida | Conteúdo Placeholder |
|-------|-----------------|-----------------|---------------------|
| `cafe` | Playfair Display + DM Sans | `warm` + `luxury` | Menu de bebidas, ambiente, baristas |
| `fintech` | Space Grotesk + Inter | `cool` + `tech` | Dashboard financeiro, gráficos, taxas |
| `health` | Plus Jakarta Sans + Inter | `ocean` + `minimal` | Especialidades, agendamento, depoimentos |
| `education` | Source Serif 4 + Inter | `cool` + `corporate` | Cursos, professores, certificados |
| `fashion` | Cormorant Garamond + DM Sans | `neutral` + `elegant` | Lookbook, coleções, editoriais |
| `tech` | JetBrains Mono + Inter | `cool` + `bold` | Features técnicas, integrações, código |
| `food` | Merriweather + Lato | `earth` + `playful` | Cardápio, pratos, chef, reservas |
| `creative` | Space Grotesk + General Sans | `vibrant` + `bold` | Portfolio, cases, processo criativo |

---

## Saída Esperada

```
✅ Projeto [tipo] para nicho [nicho] inicializado
├── Next.js 16 com App Router
├── TypeScript strict mode ativado
├── Tailwind CSS v4 configurado
├── [N] dependências instaladas
├── Estrutura de pastas criada para [tipo]
├── Security headers configurados em next.config.ts
├── Variáveis de ambiente tipadas com Zod
├── ADR-001 documentado em docs/adr/
├── Prisma inicializado (se aplicável)
└── Pronto para /init-tokens [paleta] [mood]
```

---

## Exemplo de Uso

```
/init-project landing cafe
/init-project saas fintech
/init-project ecommerce fashion
/init-project portfolio creative
/init-project blog education
```
