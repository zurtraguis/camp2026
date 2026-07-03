import { notFound } from "next/navigation";
import { getRegistrationByCode } from "@/lib/registration.service";
import { getPixDisplay } from "@/lib/payment.service";
import { env } from "@/lib/env";
import { formatBRL } from "@/lib/format";
import { Callout, Badge, Card, Button } from "@/components/ui";
import { startCheckoutAction } from "@/app/inscricao/actions";
import { PixPanel } from "./PixPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sua Inscrição",
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

  // A tribo é atribuída internamente (registration.service) e fica disponível
  // só no painel admin. A revelação ao campista acontecerá depois — aqui
  // mostramos apenas um teaser, sem expor a tribo sorteada.
  const payment = reg.payment;
  const isConfirmed = reg.status === "CONFIRMED";
  const isAwaitingReview = reg.status === "AWAITING_REVIEW";
  const isCancelled = reg.status === "CANCELLED";
  const isPix = payment?.method === "PIX";
  const isCard = payment?.method === "CARD";
  const cardOnline = env.NEXT_PUBLIC_CARD_ONLINE_ENABLED;
  const paymentConfirmed = payment?.status === "CONFIRMED";

  /* Fetch Pix display data server-side (server-only function) */
  let pixDisplay = null;
  if (isPix && !isConfirmed && !isAwaitingReview && !isCancelled) {
    try {
      pixDisplay = await getPixDisplay(code);
    } catch {
      /* will show error state */
    }
  }

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
          </div>
        </div>

        {/* Tribo — sorteio interno; revelação ao campista acontecerá depois */}
        <div className="rounded-xl border border-verde-limao/30 bg-verde-limao/5 p-4">
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Sua tribo
          </p>
          <p className="font-display text-3xl text-verde-limao">
            Será revelada em breve
          </p>
          <p className="mt-0.5 text-sm text-muted">
            O sorteio das tribos será anunciado pela organização mais perto do
            acampamento. Fique de olho!
          </p>
        </div>

        {/* ── Status: CONFIRMED ── */}
        {isConfirmed && (
          <Callout tone="success" title="Inscrição confirmada!">
            Pagamento confirmado. Sua vaga está garantida — a tribo será
            revelada em breve pela organização. Até breve no RAIZ 2026!
          </Callout>
        )}

        {/* ── Status: AWAITING_REVIEW (Pix uploaded) ── */}
        {isAwaitingReview && (
          <Callout tone="warning" title="Comprovante recebido">
            Seu comprovante Pix foi enviado e está aguardando confirmação pela
            equipe. Em até 24 h úteis sua inscrição será confirmada.
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
        {isCard && !paymentConfirmed && !isCancelled && !isAwaitingReview && (
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

        {/* ── PIX: show payment panel ── */}
        {isPix && !isConfirmed && !isAwaitingReview && !isCancelled && (
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
      </Card>
      </div>
    </main>
  );
}
