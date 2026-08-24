# Acampamento RAIZ 2026 — Site de Inscrições

Site de inscrição de adolescentes (12–19 anos) para o Acampamento RAIZ 2026,
com atribuição automática e balanceada das 3 tribos, pagamento por cartão
(Stripe) ou Pix (com comprovante), consentimento parental conforme a LGPD e
painel administrativo.

> "Todo fruto revela uma raiz." — Gálatas 5

---

## 1. Stack

- **Next.js 16** (App Router, React 19, Server Components/Actions) · TypeScript strict
- **Tailwind CSS v4** — design tokens da identidade RAIZ em `src/app/globals.css`
- **Prisma 7** + **Supabase Postgres** (adapter `@prisma/adapter-pg`)
- **Stripe** (cartão, Checkout Session) + **Pix manual** (BR Code + upload de comprovante)
- **Supabase Storage** (bucket privado de comprovantes)
- Deploy alvo: **Cloudflare** (OpenNext Workers) — ver §8.

## 2. Arquitetura de pastas

```
src/
├─ app/
│  ├─ (marketing)/        landing RAIZ (header/footer próprios)
│  ├─ inscricao/          formulário multi-etapa + actions
│  │  └─ [code]/          status da inscrição + painel Pix
│  ├─ admin/
│  │  ├─ login/           login (fora do gate de auth)
│  │  └─ (panel)/         dashboard, pagamentos, tribos, detalhe, export CSV
│  └─ api/webhooks/stripe route handler do webhook
├─ components/
│  ├─ ui/                 primitivos acessíveis (Button, Field, Input, …)
│  └─ raiz/               seções da landing
└─ lib/
   ├─ tribos.ts           algoritmo de balanceamento (PURO, testado)
   ├─ lotes.ts            preço por lote (PURO, testado)
   ├─ pix.ts              BR Code "copia e cola" + CRC16 (PURO, testado)
   ├─ format.ts           BRL, idade, código público (PURO, testado)
   ├─ validation.ts       schemas Zod (compartilhados client/server)
   ├─ registration.service.ts  criação transacional + atribuição de tribo
   ├─ lote.service.ts / payment.service.ts / storage.ts
   ├─ auth.ts / password.ts     sessão admin + hash PBKDF2 (Web Crypto)
   └─ db.ts / env.ts / stripe.service.ts
```

**Regra:** componentes não acessam o Prisma direto — delegam a serviços em `src/lib`.
Dados de saúde/triagem ficam em tabela separada (`HealthProfile`) e nunca saem em
exports gerais.

## 3. Setup local

```bash
cp .env.example .env            # preencha as variáveis (ver §3.1)
npm install
npx prisma generate
npx prisma migrate dev --name init   # requer DATABASE_URL apontando ao Postgres
npm run db:seed                 # 3 lotes + admin demo + inscrições demo
npm run dev                     # http://localhost:3000
```

Sem banco configurado, a landing e `/inscricao` ainda renderizam (modo dev exibe
um lote de exemplo). O envio do formulário exige o Supabase conectado.

**Admin demo:** `admin@raiz.local`, criado pelo seed **apenas em banco local** com a
senha que você passar em `DEMO_ADMIN_PASSWORD`:

```bash
DEMO_ADMIN_PASSWORD='<senha-forte>' npm run db:seed
```

O seed aborta se `DATABASE_URL` não for local (use `ALLOW_DEMO_SEED=1` para forçar
em staging descartável). Nunca rode contra produção: cria um ADMIN.

### 3.1 Variáveis de ambiente (`.env.example`)

| Grupo | Variáveis |
|---|---|
| App | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` |
| Banco | `DATABASE_URL` (pooler/runtime), `DIRECT_URL` (migrations, porta 5432) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Storage | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_COMPROVANTES_BUCKET` |
| Pix | `NEXT_PUBLIC_PIX_KEY`, `NEXT_PUBLIC_PIX_RECEIVER_NAME`, `NEXT_PUBLIC_PIX_RECEIVER_CITY` |
| LGPD | `NEXT_PUBLIC_CONSENT_TERM_VERSION` |
| Admin | `AUTH_SECRET` |

No Supabase, crie um bucket **privado** chamado `comprovantes`.

## 4. Lotes e preço

Os lotes vendem em ordem; ao preencher a capacidade de um lote, o próximo (mais
caro) passa a vigorar. Padrão do seed: 1º R$300 (80 vagas), 2º R$400 (80), 3º
R$450 (80). A lógica pura é `resolveActiveLote(lotes, vendidos)` em
`src/lib/lotes.ts`. Ajuste preços/capacidades pelo seed ou direto no banco.

## 5. Balanceamento das tribos

Tribos: **Ágape, Eirene, Chara** (Gálatas 5.22-23).

- **Online (a cada inscrição):** *stratified greedy least-loaded* — estrato =
  gênero × faixa etária; o novo campista vai para a tribo com menos membros do
  mesmo estrato (empate → menor total → ordem fixa). Garante paridade de gênero
  e baixa variância de idade. Roda dentro de uma transação **Serializable** para
  evitar corridas (`registration.service.ts`).
- **Offline (admin → "Re-balancear"):** *snake draft* por gênero, ordenado por
  idade. Reatribui todos. `rebalance()` em `tribos.ts`.
- **Relatório de qualidade:** `balanceReport()` expõe `genderSpread` (ideal ≤1) e
  `ageSpread` (ideal ≤0.5), exibidos em `/admin/tribos`.

## 6. Pagamentos

- **Cartão:** Stripe Checkout Session (`mode=payment`, BRL). O webhook
  (`/api/webhooks/stripe`) usa `constructEventAsync` + Web Crypto (compatível com
  Cloudflare Workers), idempotência via tabela `StripeEvent`, e confirma a
  inscrição em `checkout.session.completed`.
- **Pix manual:** geramos o "copia e cola" (BR Code EMV + CRC16, `pix.ts`) e o QR;
  o responsável paga e envia o comprovante (validação por *magic bytes*, upload
  server-side ao bucket privado). O admin confirma/rejeita em `/admin/pagamentos`
  (URL assinada de curta duração para visualizar o comprovante).

> Pix nativo do Stripe não foi usado por ser *invite-only* para contas BR; o
> fluxo manual é o caminho confiável. Pode ser adicionado depois.

## 7. LGPD, menores e segurança

- **Consentimento específico e separado** (não um único checkbox): tratamento de
  dados, dados sensíveis de saúde (art. 11), participação em atividades, e uso de
  imagem (opcional). Registrado em `ConsentRecord` com **versão do termo, IP,
  user-agent e timestamp** (rastreabilidade do art. 14).
- **Dados sensíveis** (saúde/triagem) isolados em `HealthProfile`, com aviso de
  confidencialidade na UI e **excluídos do export CSV** (minimização de dados).
- **Autorização parental** obrigatória (responsável legal: nome, CPF, telefone,
  parentesco).
- **Segurança técnica:** webhook com verificação de assinatura + idempotência;
  bucket privado + URLs assinadas curtas; validação de upload por magic bytes
  (não confia em `file.type`); hash de senha PBKDF2; cookies de sessão httpOnly;
  autorização verificada no servidor (DAL `requireAdmin`, não só middleware).

## 8. Deploy no Cloudflare (OpenNext)

1. `npm i -D @opennextjs/cloudflare` e configure `wrangler.toml` com
   `compatibility_flags = ["nodejs_compat"]`.
2. Banco: use **Hyperdrive** apontando ao Supabase (conexão direta 5432) ou o
   pooler do Supabase (6543, `?pgbouncer=true`). Em runtime use `DATABASE_URL`;
   migrations usam `DIRECT_URL`.
3. O webhook já é Workers-safe (verificação assíncrona). Em produção, instancie o
   Prisma **por requisição** (ver nota em `db.ts`) para evitar o reuso de conexão
   entre requests no Workers.

## 9. Debug & operação

- **Logs:** o webhook loga falhas de assinatura/processamento; em erro de
  processamento ele remove o registro de idempotência para permitir reentrega.
- **Pagamento "preso":** confira `Payment.status` e o evento em `StripeEvent`;
  para Pix, veja `pixReceiptPath` e o status `AWAITING_REVIEW`.
- **Tribos desbalanceadas:** rode o re-balanceamento offline em `/admin/tribos`.
- **Banco indisponível em dev:** páginas degradam (landing/inscrição) com aviso.
- **Reproduzir cálculos sem banco:** os módulos `tribos`, `lotes`, `pix`, `format`
  são puros e cobertos por testes (`npm test`).

## 10. Testes & verificação

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (31 testes: balanceamento, lotes, pix/CRC, validação)
npm run test:e2e    # Playwright smoke (e2e/raiz-smoke.spec.ts)
npm run build       # build de produção
```

## 11. Limitações conhecidas / próximos passos

- Notificação por e-mail/WhatsApp na confirmação do pagamento (sugestão:
  Cloudflare Email ou Resend) — ainda não implementada.
- Páginas do admin usam alguns casts amplos do Prisma (`db as any`) herdados da
  geração inicial; podem ser tipados agora que o client foi regenerado.
- Sem menu mobile para as âncoras da landing (links de seção via rolagem).
- Pix nativo do Stripe (quando a conta for habilitada) pode complementar o fluxo
  manual.
