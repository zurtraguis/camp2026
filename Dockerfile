# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# Acampamento RAIZ 2026 — imagem de produção (Next.js standalone) para Portainer.
#
# Estratégia: multi-stage (deps → builder → runner). O runner roda o servidor
# Node auto-suficiente gerado por `output: "standalone"` — sem `next start`,
# sem node_modules completo. Prisma 7 usa driver adapter (PrismaPg), então NÃO
# há engine binário nativo: alpine funciona sem libs de OpenSSL do engine clássico.
#
# IMPORTANTE: variáveis NEXT_PUBLIC_* são "inlined" em build-time. Elas entram
# como ARG (com defaults de produção) e são promovidas a ENV antes do `build`.
# Os SEGREDOS (DATABASE_URL, STRIPE_SECRET_KEY, ...) são injetados em RUNTIME
# pelo Portainer — nunca no build.
# ──────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine

# ── 1) deps: instala dependências com cache estável ──────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# libc6-compat: compat de glibc para eventuais binários; inofensivo se não usado.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ── 2) builder: gera Prisma Client + build standalone ────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis públicas (inlined no bundle). Defaults = produção (wrangler.jsonc).
# Sobrescreva no build do Portainer se necessário (Build args / .env do stack).
ARG NEXT_PUBLIC_APP_URL="https://acamp2026.futagoautomacoes.com.br"
ARG NEXT_PUBLIC_APP_NAME="Acampamento RAIZ 2026"
ARG NEXT_PUBLIC_SUPABASE_URL="https://orhciovdecwaqqsxxdfb.supabase.co"
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51Sdwf3LVGuIIljwHjq2WC8lA5Ukxmu8zRXH3XsWKL45PEyrSzgNZlv1bJZB1QLcmz0NFpr3UZVtuGsinz9Vmtl1C00qqVHdf2t"
ARG NEXT_PUBLIC_PIX_KEY="pixlagoinhamanaus@gmail.com"
ARG NEXT_PUBLIC_PIX_RECEIVER_NAME="ACAMPAMENTO RAIZ"
ARG NEXT_PUBLIC_PIX_RECEIVER_CITY="Manaus"
ARG NEXT_PUBLIC_CONSENT_TERM_VERSION="v1-2026-06"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_PIX_KEY=$NEXT_PUBLIC_PIX_KEY \
    NEXT_PUBLIC_PIX_RECEIVER_NAME=$NEXT_PUBLIC_PIX_RECEIVER_NAME \
    NEXT_PUBLIC_PIX_RECEIVER_CITY=$NEXT_PUBLIC_PIX_RECEIVER_CITY \
    NEXT_PUBLIC_CONSENT_TERM_VERSION=$NEXT_PUBLIC_CONSENT_TERM_VERSION

# Prisma Client (gera src/generated/prisma — não precisa de conexão ao banco).
RUN npx prisma generate
# Build Next standalone (script "build" usa --webpack).
RUN npm run build

# ── 3) runner: imagem final mínima ───────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuário não-root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Assets públicos + saída standalone (server.js + node_modules mínimo) + estáticos.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Healthcheck bate na rota /health (não toca no banco).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
