# OPS04 — Deploy via Portainer (Docker Swarm)

Guia para subir o **Acampamento RAIZ 2026** como serviço Docker Swarm gerenciado
pelo Portainer, atrás do Traefik. Substitui o caminho Cloudflare Workers
(OpenNext/`wrangler.jsonc`), que permanece no repo apenas como legado.

> ⚠️ **Swarm não builda imagem.** O `docker stack deploy` ignora `build:` e só faz
> `pull`. Por isso a imagem é construída e publicada no GHCR por um workflow de CI,
> e a stack apenas consome `ghcr.io/zurtraguis/camp2026:latest`.

## Arquitetura do deploy

| Peça | Onde |
|---|---|
| Build da imagem | GitHub Actions → `.github/workflows/docker-publish.yml` |
| Registry | `ghcr.io/zurtraguis/camp2026` |
| Orquestrador | Docker Swarm (Portainer) |
| Proxy / TLS | Traefik na rede overlay externa `network_swarm_public` |
| Health | `GET /health` (200, sem tocar no banco) |
| Banco/Storage | Supabase (Postgres + bucket `comprovantes`), externos |

## Variáveis

| Tipo | Quando | Variáveis |
|---|---|---|
| **Públicas** (`NEXT_PUBLIC_*`) | **Build** (inlined, no CI) | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PIX_*`, `NEXT_PUBLIC_CONSENT_TERM_VERSION` |
| **Segredos** | **Runtime** (stack do Portainer) | `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` |

As `NEXT_PUBLIC_*` já vêm embutidas na imagem (valores públicos, definidos como
build-args no workflow). **Mudou alguma? Precisa rebuildar a imagem** (novo push em
`main` ou re-rodar o workflow), não basta restart. Referência: `.env.example`.

## Passo a passo

### 1. Publicar a imagem (uma vez / a cada release)

- Push em `main` dispara `Build & Publish Docker image` → publica
  `ghcr.io/zurtraguis/camp2026:latest`.
- Acompanhe em **Actions** no GitHub. Ao final, confira o pacote em
  `https://github.com/zurtraguis/camp2026/pkgs/container/camp2026`.

### 2. Tornar a imagem acessível ao Swarm

O pacote GHCR nasce **privado**. Escolha **uma** opção:

- **(A) Tornar público** (mais simples): GitHub → repo → **Packages** → `camp2026`
  → **Package settings** → **Change visibility** → Public. O Swarm puxa sem login.
- **(B) Manter privado** (mais seguro): no Portainer, **Registries → Add registry →
  Custom**, URL `ghcr.io`, usuário = seu login GitHub, senha = um PAT com
  `read:packages`. Selecione esse registry na stack.

### 3. Subir/atualizar a stack no Portainer

1. **Stacks → acamp** (ou Add stack) → **Repository**: `https://github.com/zurtraguis/camp2026`,
   Ref `refs/heads/main`, Compose path `docker-compose.yml`.
2. Em **Environment variables**, preencha os **segredos** (mínimo):
   - `DATABASE_URL` (pooler Supabase, porta 6543, `?pgbouncer=true`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_PIX_KEY`, `AUTH_SECRET` (`openssl rand -base64 32`)
3. **Deploy / Update the stack** (marque "Pull latest image").

### 4. Validar

```bash
docker service ls | grep acamp                 # acamp_web → 1/1
docker service ps acamp_web --no-trunc         # sem "Rejected: No such image"
docker service logs acamp_web --tail 100
curl -I https://acamp2026.futagoautomacoes.com.br   # 200/3xx, não 404 do Traefik
```

## Roteamento Traefik (Swarm)

A stack já inclui as `deploy.labels` necessárias (no Swarm o Traefik lê labels do
**serviço**, em `deploy.labels`, não do container) e conecta o serviço à rede
externa `network_swarm_public`. Ajuste se o seu Traefik usar nomes diferentes:

- `entrypoints=websecure` (entrypoint HTTPS) e `web` (HTTP→HTTPS redirect).
- `tls.certresolver=letsencryptresolver` — confirme o nome do resolver no seu Traefik.
- `traefik.http.services.acamp.loadbalancer.server.port=3000` — porta interna do app.

## Pós-deploy

- **Migrations:** `prisma migrate deploy` com `DATABASE_URL` na conexão **direta**
  (porta 5432), fora do container. O runtime usa o pooler.
- **Webhook Stripe:** apontar para
  `https://acamp2026.futagoautomacoes.com.br/api/webhooks/stripe` e conferir
  `STRIPE_WEBHOOK_SECRET`.

## CD — redeploy automático (webhook do Portainer)

Para eliminar o "Pull and redeploy" manual: o workflow `docker-publish.yml`
dispara um webhook do Portainer ao fim do build (passo *Redeploy no Portainer*).
Sem o secret configurado, o passo é pulado sem falhar (redeploy continua manual).

**Configurar (uma vez):**
1. No Portainer, abra o **serviço `acamp_web`** (ou a stack `acamp`) → seção
   **Service webhook** → **Create a service webhook** → copie a URL gerada
   (algo como `https://<portainer>/api/webhooks/<uuid>`).
2. No GitHub: repo → **Settings → Secrets and variables → Actions → New
   repository secret** → nome **`PORTAINER_WEBHOOK_URL`**, valor = a URL.

A partir daí: push em `main` → CI builda a imagem `:latest` → chama o webhook →
o Swarm faz **re-pull** da imagem e reinicia o serviço (resolve o cache do
`:latest` sem precisar fixar tag por commit). Acompanhe em **Actions**.

> Segurança: qualquer um com a URL do webhook pode disparar um redeploy. Por isso
> ela fica como **secret** (não como variável) e nunca é versionada.

## Troubleshooting

- **`No such image: ...:latest`** → o workflow não rodou ou o pacote está privado
  sem credenciais. Veja o passo 1 e 2.
- **404 do Traefik** → serviço fora da `network_swarm_public` ou labels ausentes/erradas;
  confira `entrypoints`/`certresolver` e `traefik.docker.network`.
- **Client Stripe/Supabase "indefinido"** → `NEXT_PUBLIC_*` não foi build-arg no CI →
  rebuild da imagem.
- **Container reinicia** → cheque `docker service logs acamp_web`; `DATABASE_URL`
  ausente não derruba o boot (fail-closed por serviço), mas rotas com DB falham.
