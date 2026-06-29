import { notFound } from "next/navigation";
import { getRegistrationByCode } from "@/lib/registration.service";
import { getPixDisplay } from "@/lib/payment.service";
import { formatBRL } from "@/lib/format";
import { TRIBO_META } from "@/lib/tribos";
import { Callout, Badge, Card, Button } from "@/components/ui";
import { startCheckoutAction } from "@/app/inscricao/actions";
import { PixPanel } from "./PixPanel";
import type { TriboId } from "@/lib/tribos";

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

  const tribo = TRIBO_META[reg.tribo as TriboId];
  const payment = reg.payment;
  const isConfirmed = reg.status === "CONFIRMED";
  const isAwaitingReview = reg.status === "AWAITING_REVIEW";
  const isCancelled = reg.status === "CANCELLED";
  const isPix = payment?.method === "PIX";
  const isCard = payment?.method === "CARD";
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
    <main id="main-content" className="mx-auto w-full max-w-xl px-4 py-12">
      {/* Header */}
      <header className="mb-8 text-center">
        <p className="mb-2 text-xs font-condensed uppercase tracking-widest text-verde-folha">
          Acampamento
        </p>
        <h1 className="font-display text-5xl text-creme sm:text-6xl">RAIZ 2026</h1>
      </header>

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

        {/* Tribo */}
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: `${tribo.cor}40`,
            backgroundColor: `${tribo.cor}0d`,
          }}
        >
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Sua tribo
          </p>
          <p
            className="font-display text-3xl"
            style={{ color: tribo.cor }}
          >
            {tribo.nome}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {tribo.significado}
          </p>
        </div>

        {/* ── Status: CONFIRMED ── */}
        {isConfirmed && (
          <Callout tone="success" title="Inscrição confirmada!">
            Pagamento confirmado. Você faz parte da tribo{" "}
            <strong>{tribo.nome}</strong> — {tribo.significado}. Até breve no
            RAIZ 2026!
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
                Pagamento via cartão · pendente
              </p>
            </div>

            <form action={startCheckoutAction}>
              <input type="hidden" name="code" value={code} />
              <Button type="submit" size="lg" className="w-full">
                Pagar com cartão →
              </Button>
            </form>
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
    </main>
  );
}
