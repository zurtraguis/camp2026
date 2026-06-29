# OPS04 — Deploy via Portainer (Docker)

Guia para subir o **Acampamento RAIZ 2026** como container Docker gerenciado pelo
Portainer. Substitui o caminho Cloudflare Workers (OpenNext/`wrangler.jsonc`), que
permanece no repo apenas como legado.

## Visão geral

- **Imagem:** `Dockerfile` multi-stage → Next.js `output: "standalone"` (Node server).
- **Stack:** `docker-compose.yml` (compatível com Portainer "Add stack").
- **Health:** rota `GET /health` (200, sem tocar no banco) — usada pelo `HEALTHCHECK`.
- **Banco/Storage:** Supabase (Postgres + bucket `comprovantes`) — externos, via env.

## Variáveis

| Tipo | Quando | Variáveis |
|---|---|---|
| **Públicas** (`NEXT_PUBLIC_*`) | **Build** (inlined) + runtime | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PIX_*`, `NEXT_PUBLIC_CONSENT_TERM_VERSION` |
| **Segredos** | **Runtime apenas** | `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` |

> ⚠️ As `NEXT_PUBLIC_*` são embutidas no bundle em **build-time**. Se mudar qualquer
> uma, é preciso **rebuildar** a imagem — alterar só o runtime não tem efeito no client.

Referência completa de cada variável: `.env.example`.

## Deploy no Portainer (build a partir do Git)

1. **Stacks → Add stack → Repository.**
2. Repository URL: `https://github.com/zurtraguis/camp2026`
   Reference: `refs/heads/main` · Compose path: `docker-compose.yml`.
3. Em **Environment variables**, preencha (mínimo):
   - `DATABASE_URL` (pooler Supabase, porta 6543, `?pgbouncer=true`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_PIX_KEY`, `AUTH_SECRET` (`openssl rand -base64 32`)
4. **Deploy the stack.** O Portainer builda o `Dockerfile` e sobe o serviço `web`.
5. Verifique: `curl -sf http://<host>:3000/health` → `{"status":"ok",...}`.

## Acesso público (Traefik)

O host usa Traefik. Descomente o bloco `labels:` + `networks:` no `docker-compose.yml`,
ajuste `entrypoints`/`certresolver` ao seu Traefik e remova o bloco `ports:`.
Domínio alvo: `acamp2026.futagoautomacoes.com.br`.

## Pós-deploy

- **Migrations:** rodar `prisma migrate deploy` apontando `DATABASE_URL` para a conexão
  **direta** (porta 5432), fora do container ou via job pontual. O runtime usa o pooler.
- **Webhook Stripe:** apontar para `https://acamp2026.futagoautomacoes.com.br/api/webhooks/stripe`
  e conferir `STRIPE_WEBHOOK_SECRET`.
- **Logs:** `docker logs acamp2026 --tail 100` ou pela UI do Portainer.

## Rebuild / atualização

Push em `main` → no Portainer, **Pull and redeploy** (ou "Update the stack" com
"re-pull image / re-build"). Como as `NEXT_PUBLIC_*` são de build, toda mudança nelas
exige rebuild — não apenas restart.

## Troubleshooting

- **Container reinicia / health falha:** `DATABASE_URL` ausente não derruba o boot
  (env é fail-closed por serviço), mas rotas que usam o banco retornam erro. Cheque
  `docker logs` e confirme as envs no stack.
- **Client Stripe/Supabase "indefinido" no browser:** `NEXT_PUBLIC_*` não passada como
  **build arg** → rebuild com as variáveis corretas.
