# Design System — RAIZ 2026

> "Todo fruto revela uma raiz."

Sistema de design do site de inscrição do Acampamento RAIZ 2026 (adolescentes 12–19,
3 tribos de Gálatas 5.22-23). Tema **dark/terroso**, alto contraste, WCAG 2.1 AA.

Fonte da verdade do código: [`src/app/globals.css`](../src/app/globals.css) e
[`src/components/ui/index.tsx`](../src/components/ui/index.tsx). Este documento descreve o
sistema; o HTML navegável está em [`design-system.html`](../design-system.html) (raiz do projeto).

---

## 1. Conceito & voz

RAIZ é onde a fé deixa de ser herança e vira escolha. Em três dias de terra, silêncio e
comunidade, algo planta raiz dentro de você — e todo fruto revela uma raiz.

**Princípios:** terroso e real · sagrado sem ser chato · jovem sem ser infantil ·
energia com raiz · ação concreta.

**Voz — faça:** imperativo afirmativo ("Escolha sua tribo"); ancore na metáfora da raiz;
nomeie pela ação, não pelo status; números reais ("R$ 300 — 1º lote").

**Voz — evite:** "Oops!"/anglicismos em erros; excesso de exclamação; voz passiva em CTA;
vocabulário eclesiástico genérico fora de contexto.

---

## 2. Cores (com contraste WCAG sobre `#0b0b0a`)

| Token | Hex | Papel | Contraste |
|---|---|---|---|
| `preto-raiz` | `#0b0b0a` | background | — |
| `preto-2` | `#15140f` | superfície base | — |
| `surface` | `#1a1813` | cards | creme 15.2:1 |
| `surface-2` | `#221f18` | inputs | — |
| `border` | `#38332a` | bordas | — |
| `creme` | `#f1ede2` | texto principal | 16.8:1 ✅ |
| `muted` | `#b7b0a0` | texto secundário | 9.1:1 ✅ |
| `verde-limao` | `#c8ff50` | **hero** · foco · success · botão · Ágape | 16.8:1 ✅ |
| `verde-folha` | `#a8b92b` | Eirene | 9.0:1 ✅ |
| `amarelo-sol` | `#ffd533` | warning | 13.9:1 ✅ |
| `marrom-raiz` | `#4b3a2a` | Chara (badge usa `#9c6b2e`) | ⚠️ ver §6 |
| `danger` | `#ff6b5e` | erro | 7.0:1 ✅ |
| `info` *(novo)* | `#7fb2ff` | AWAITING_REVIEW | — |

Verde-limão é a **cor-herói**: faz quatro trabalhos (foco, sucesso, botão primário e tribo
Ágape) com uma só cor — o usuário aprende o sistema na primeira tela.

---

## 3. Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Anton** | títulos, caixa-alta, `letter-spacing .01em` — proclama |
| Label / botão | **Oswald** | botões e labels, condensada, uppercase — orienta |
| Corpo | **Inter** | texto longo, formulários — informa |

Carregadas via `next/font` em [`src/app/layout.tsx`](../src/app/layout.tsx)
(`--font-anton`, `--font-oswald`, `--font-inter`).

---

## 4. Tokens

- **Espaçamento** (base 4px): 4 · 8 · 12 · 16 · 24 · 32 · 48
- **Raio**: `sm` 6 · `md` 8 · `lg` 12 · `2xl` 16 · `full`
- **Movimento** *(novo)*: `--dur-fast 120ms` · `--dur 180ms` · `--dur-slow 280ms` · `--ease cubic-bezier(.2,.7,.2,1)` — sempre sob `prefers-reduced-motion`
- **Foco**: `outline 2px var(--verde-limao); outline-offset 2px` (a11y = identidade)

---

## 5. Componentes

Primitivos em [`src/components/ui/index.tsx`](../src/components/ui/index.tsx).

| Componente | Variantes | Estados |
|---|---|---|
| **Button** | primary · secondary · ghost · danger × sm/md/lg | default · hover · active(scale .97) · focus · disabled(.4) · loading(spinner, `aria-busy`) |
| **Input/Select/Textarea** | — | default · focus(ring lima) · error(borda danger + ícone) · disabled |
| **Checkbox** | `accent verde-limao` | unchecked · checked · focus · disabled · indeterminate(`aria-checked=mixed`) |
| **Field** | label + hint + error + required `*` | erro associado via `aria-describedby` |
| **Callout** | info · success · warning · danger | `role=alert` (danger/warning) · `role=status` (success/info) |
| **Badge** | neutro · status | — |
| **Card** | base · interativo | hover(borda lima) · focus se `<a>/<button>` |

---

## 6. Padrões de domínio

- **Badge de tribo**: Ágape=`verde-limao` · Eirene=`verde-folha` · Chara=`#9c6b2e`+texto claro. ⚠️ Chara dá 3.8:1 — usar **Oswald uppercase bold (≥14px)** ou clarear o fundo p/ `#b07d3a`.
- **Card de lote**: preço por lote (1º R$300, 2º e 3º R$400). Estados: aberto (borda lima) · esgotado (opacity + CTA disabled, `aria-disabled`) · em breve.
- **Seletor de pagamento**: radio group (`fieldset`+`legend`) — Cartão (Stripe) / Pix manual.
- **Painel Pix**: QR com `alt`, "Copiar código" (feedback `aria-live`), upload de comprovante (label visível + hint de formato).
- **Progresso multi-step**: Dados → Tribo → Pagamento (passo atual em verde-limão).
- **Status**: PENDING_PAYMENT · AWAITING_REVIEW · CONFIRMED · CANCELLED — sempre cor **+** ícone **+** texto.

---

## 7. UX Copy (microcopy pronta)

| Tipo | Contexto | Texto |
|---|---|---|
| Erro | Campo obrigatório | Preencha este campo para continuar. |
| Erro | CPF inválido | CPF inválido. Confere os números e tenta de novo. |
| Erro | Comprovante formato errado | Formato não aceito. Envie uma imagem JPG, PNG ou PDF do comprovante. |
| Erro | Cartão recusado | Pagamento não aprovado. Seu banco recusou o cartão — tente outro cartão ou fale com seu banco. |
| Vazio | Admin sem inscrições | Nenhuma inscrição ainda. Quando os adolescentes começarem a garantir vaga, tudo aparece aqui. |
| Vazio | Tribo não escolhida | Escolha sua tribo. Cada uma carrega um fruto de Gálatas 5 — qual é o seu? |
| CTA | Lote 3 (último) | Garantir minha vaga — último lote |
| CTA | Avançar etapa | Avançar para o pagamento |

---

## 8. Acessibilidade — WCAG 2.1 AA

**Sempre:** elementos nativos (`button`/`input`/`label`/`fieldset`); foco verde-limão 2px;
erro+dica via `aria-describedby`; cor **+** ícone **+** texto; `prefers-reduced-motion`.

**Nunca:** `outline:none` sem substituto; significado só por cor; componente custom sem ARIA
completo; placeholder no lugar de label; alvo de toque < 40px (44 recomendado).

---

## 9. Follow-up de código (dívida sinalizada)

O painel admin [`src/app/admin/(panel)/inscricao/[id]/page.tsx`](../src/app/admin/(panel)/inscricao/[id]/page.tsx)
usa `blue-400`/`blue-300` (defaults do Tailwind) para o status **AWAITING_REVIEW**.
Trocar pelo novo token `--color-info` (`#7fb2ff`) para manter a paleta 100% RAIZ.

---

## Board visual

Claude Design (Miro): **Design System — RAIZ 2026 (v2)** —
acesse logando na conta Miro conectada ao conector (Settings → Connectors → Miro).
