import { notFound } from "next/navigation";
import { getRegistrationByCode } from "@/lib/registration.service";
import { getPixDisplay, getCarneDisplay } from "@/lib/payment.service";
import { env } from "@/lib/env";
import { formatBRL } from "@/lib/format";
import { TRIBO_META, type TriboId } from "@/lib/tribos";
import { Callout, Badge, Card, Button } from "@/components/ui";
import { startCheckoutAction } from "@/app/inscricao/actions";
import { PixPanel } from "./PixPanel";
import { CarnePanel } from "./CarnePanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sua Inscrição",
  // Esta página mostra nome do campista, valor e dados de pagamento a quem tem
  // o código. Fora do índice de buscadores (o robots.txt reforça).
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ stripe_erro?: string; pago?: string; cancelado?: string }>;
}

export default async function RegistrationStatusPage({
  params,
  searchParams,
}: PageProps) {
  const { code } = await params;
  const sp = await searchParams;

  const reg = await getRegistrationByCode(code);
  if (!reg) notFound();

  // A tribo é revelada NA HORA, assim que a inscrição é feita (set/2026). Antes
  // ficava escondida até perto do acampamento, e a página só prometia. É nula
  // apenas quando a inscrição está desativada — aí não há time para mostrar.
  const tribo = reg.tribo ? TRIBO_META[reg.tribo as TriboId] : null;
  const payment = reg.payment;
  const isConfirmed = reg.status === "CONFIRMED";
  const isAwaitingReview = reg.status === "AWAITING_REVIEW";
  const isCancelled = reg.status === "CANCELLED";
  const isInactive = reg.status === "INACTIVE";
  const isPix = payment?.method === "PIX";
  const isCarne = isPix && (payment?.installmentsTotal ?? 0) >= 2;
  const isPixAvista = isPix && !isCarne;
  const isCard = payment?.method === "CARD";
  const cardOnline = env.NEXT_PUBLIC_CARD_ONLINE_ENABLED;
  const paymentConfirmed = payment?.status === "CONFIRMED";

  /* Fetch Pix display data server-side (server-only function) */
  let pixDisplay = null;
  if (isPixAvista && !isConfirmed && !isAwaitingReview && !isCancelled && !isInactive) {
    try {
      pixDisplay = await getPixDisplay(code);
    } catch (err) {
      console.error(`[inscricao/${code}] erro ao montar Pix display:`, err);
    }
  }

  /* Carnê: busca as parcelas com QR/copia-e-cola */
  let carneDisplay = null;
  if (isCarne && !isCancelled && !isInactive) {
    try {
      carneDisplay = await getCarneDisplay(code);
    } catch (err) {
      console.error(`[inscricao/${code}] erro ao montar o carnê:`, err);
    }
  }
  const carneAllPaid =
    carneDisplay?.installments.every((i) => i.status === "CONFIRMED") ?? false;

  return (
    <main
      id="main-content"
      className="inscricao-feita-scene relative min-h-screen overflow-hidden px-4 pb-16 pt-[min(23vw,23rem)] text-creme sm:px-6"
    >
      <div className="relative mx-auto w-full max-w-xl">
      {/* O título "RAIZ 2026 — Todo fruto revela uma raiz" vem da própria arte
          de fundo (inscricao-feita-bg.webp); por isso não renderizamos header. */}

      {/* Stripe cancelled note */}
      {sp.cancelado && (
        <div className="mb-4">
          <Callout tone="warning" title="Pagamento não concluído">
            Você saiu do checkout. Sua inscrição foi reservada — finalize o
            pagamento quando quiser.
          </Callout>
        </div>
      )}

      {/* Stripe error note */}
      {sp.stripe_erro && !isConfirmed && (
        <div className="mb-4">
          <Callout tone="danger" title="Pagamento com cartão indisponível">
            O serviço de pagamento com cartão está temporariamente indisponível.
            Tente novamente em alguns minutos ou escolha Pix.
          </Callout>
        </div>
      )}

      <Card className="space-y-6">
        {/* Camper info */}
        <div className="space-y-1">
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Inscrição
          </p>
          <h2 className="font-display text-3xl text-creme">{reg.fullName}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="font-mono">{reg.publicCode}</Badge>
            {isCancelled && (
              <Badge className="border-danger/40 bg-danger/10 text-danger">
                Cancelada
              </Badge>
            )}
            {isInactive && (
              <Badge className="border-amarelo-sol/40 bg-amarelo-sol/10 text-amarelo-sol">
                Desativada
              </Badge>
            )}
          </div>
        </div>

        {/* Tribo — revelada na hora da inscrição */}
        {tribo ? (
          <div
            className="relative overflow-hidden rounded-xl border p-5"
            style={{
              borderColor: `${tribo.cor}55`,
              background: `${tribo.cor}12`,
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ backgroundColor: tribo.cor }}
            />
            <p className="text-xs font-condensed uppercase tracking-widest text-muted">
              Sua tribo
            </p>
            <p
              className="font-display text-5xl leading-none"
              style={{ color: tribo.cor }}
            >
              {tribo.nome}
            </p>
            <span
              className="mt-3 inline-block rounded-sm px-3 py-0.5 font-condensed text-sm font-bold uppercase tracking-wide text-[#0b0b0a]"
              style={{ backgroundColor: tribo.cor }}
            >
              {tribo.significado}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-creme/80">
              {tribo.descricao}
            </p>
            <p className="mt-2 text-xs text-muted">
              Baseada nos frutos do Espírito de Gálatas 5.22-23. Ela é sua desde
              agora — leve pra vida.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-xs font-condensed uppercase tracking-widest text-muted">
              Sua tribo
            </p>
            <p className="mt-1 text-sm text-muted">
              Sem tribo no momento. Fale com a organização.
            </p>
          </div>
        )}

        {/* ── Status: CONFIRMED (à vista ou carnê quitado) ── */}
        {isConfirmed && (!isCarne || carneAllPaid) && (
          <Callout tone="success" title="Inscrição confirmada!">
            Pagamento confirmado. Sua vaga está garantida. Até breve no RAIZ 2026!
          </Callout>
        )}

        {/* ── Status: AWAITING_REVIEW (Pix uploaded) ── */}
        {isAwaitingReview && (
          <Callout tone="warning" title="Comprovante recebido">
            Seu comprovante Pix foi enviado e está aguardando confirmação pela
            equipe. Em até 24 h úteis sua inscrição será confirmada.
          </Callout>
        )}

        {/* ── Status: DESATIVADA ──
            Precisa dizer o que aconteceu E o que fazer. Sem isto a família
            veria a página sem chave Pix nenhuma e sem explicação. */}
        {isInactive && (
          <Callout tone="warning" title="Inscrição desativada">
            Como o pagamento não foi feito e não conseguimos contato, esta
            inscrição foi desativada e a vaga voltou a ficar disponível. Se você
            ainda quer participar, fale com a organização — havendo vaga, dá
            para reativar.
          </Callout>
        )}

        {/* ── Status: CANCELLED ── */}
        {isCancelled && (
          <Callout tone="danger" title="Inscrição cancelada">
            Esta inscrição foi cancelada. Entre em contato com a organização caso
            acredite que isso foi um erro.
          </Callout>
        )}

        {/* ── CARD: pending payment ── */}
        {isCard && !paymentConfirmed && !isCancelled && !isInactive && !isAwaitingReview && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <p className="text-xs font-condensed uppercase tracking-widest text-muted">
                Valor
              </p>
              <p className="font-display text-3xl text-verde-limao">
                {formatBRL(payment!.amountCents)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {cardOnline
                  ? "Pagamento via cartão · pendente"
                  : "Crédito ou débito · pagamento presencial"}
              </p>
            </div>

            {cardOnline ? (
              <form action={startCheckoutAction}>
                <input type="hidden" name="code" value={code} />
                <Button type="submit" size="lg" className="w-full">
                  Pagar com cartão →
                </Button>
              </form>
            ) : (
              <Callout tone="warning" title="Pagamento presencial no cartão">
                Sua vaga está reservada. O pagamento no crédito ou débito é feito
                presencialmente com a organização. Guarde seu código{" "}
                <strong className="font-mono">{reg.publicCode}</strong> — se
                preferir pagar agora, você também pode voltar e escolher Pix.
              </Callout>
            )}
          </div>
        )}

        {/* ── PIX à vista: painel de pagamento ── */}
        {isPixAvista && !isConfirmed && !isAwaitingReview && !isCancelled && !isInactive && (
          <>
            {pixDisplay ? (
              <PixPanel
                code={code}
                configured={pixDisplay.configured}
                pixKey={pixDisplay.key}
                receiverName={pixDisplay.receiverName}
                amountCents={pixDisplay.amountCents}
                txid={pixDisplay.txid}
                payload={pixDisplay.payload}
                qrDataUrl={pixDisplay.qrDataUrl}
              />
            ) : (
              <Callout tone="danger" title="Erro ao carregar dados Pix">
                Não foi possível carregar as informações de pagamento. Tente
                recarregar a página.
              </Callout>
            )}
          </>
        )}

        {/* ── Carnê Pix: vaga garantida na 1ª parcela + parcelas ── */}
        {isCarne && !isCancelled && !isInactive && (
          <>
            {isConfirmed && !carneAllPaid && (
              <Callout tone="success" title="Vaga garantida!">
                A 1ª parcela foi confirmada e sua vaga está reservada. Continue
                pagando as parcelas do carnê abaixo até quitar o total.
              </Callout>
            )}
            {carneDisplay ? (
              <CarnePanel
                code={code}
                camperName={reg.fullName}
                publicCode={reg.publicCode}
                configured={carneDisplay.configured}
                pixKey={carneDisplay.key}
                receiverName={carneDisplay.receiverName}
                totalCents={carneDisplay.totalCents}
                installments={carneDisplay.installments.map((i) => ({
                  ...i,
                  dueDate: i.dueDate.toISOString(),
                }))}
              />
            ) : (
              <Callout tone="danger" title="Erro ao carregar o carnê">
                Não foi possível carregar as parcelas. Tente recarregar a página.
              </Callout>
            )}
          </>
        )}
      </Card>
      </div>
    </main>
  );
}
