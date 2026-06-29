# Stacks — camada plug-in

O harness é otimizado para **Next.js + Prisma + Stripe + Tailwind** (caminho rápido, raiz do repo).
Para soluções não-web, use os plug-ins desta pasta via `/init-stack`.

| ID | Status | Quando usar |
| --- | --- | --- |
| `nextjs` | Estável (default na raiz) | SaaS web, landing + app, dashboards Server Components. |
| `api-only` | Beta | Backend autônomo (Express/Fastify/Hono), sem frontend acoplado. |
| `mobile` | Beta | App nativo (React Native + Expo). |
| `cli` | Beta | Ferramentas de linha de comando (Node.js + Commander/Yargs). |
| `landing` | Beta | Página única + CTA + form. `project_type=landing`. |
| `single-page` | Beta | Site institucional / portfólio sem lead-gen. `project_type=single-page`. |
| `blog` | Beta | Conteúdo MDX/CMS, RSS, sitemap. `project_type=blog`. |
| `ecommerce` | Beta | Catálogo + Stripe Checkout. `project_type=ecommerce`. |
| `internal-app` | Beta | App interno sem monetização, `noindex` por default. `project_type=internal-app`. |
| `repository-catalog` | Beta | Catálogo de itens (imobiliária, serviços, portfólio). `project_type=repository-catalog`. |

## Como trocar de stack

```
/init-stack <id>
```

O comando lê `stacks/<id>/STACK.md`, valida pré-condições, copia os arquivos do stack para a raiz e atualiza `package.json` e `WORKFLOW.md`.

## Variável de ambiente

Os hooks que dependem de stack lêem `HARNESS_STACK` (default: `nextjs`).
Adicione em `.env`:

```
HARNESS_STACK=mobile
```

## Estrutura de cada stack

```
stacks/<id>/
├── STACK.md                # Manifesto (pré-condições, arquivos, comandos perigosos)
├── package.json.template   # Deps mínimas
├── README.md               # Onboarding curto
└── scaffold/               # Arquivos copiados para a raiz pelo /init-stack
```
