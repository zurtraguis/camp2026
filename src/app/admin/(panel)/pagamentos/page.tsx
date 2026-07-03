import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { signedReceiptUrl } from "@/lib/storage";
import { Card, Callout, Badge } from "@/components/ui";
import { ReviewForm } from "./ReviewForm";

export const metadata = { title: "Pagamentos Pix" };

type PaymentRow = {
  id: string;
  amountCents: number;
  pixReceiptPath: string | null;
  pixTxid: string | null;
  registration: {
    id: string;
    publicCode: string;
    fullName: string;
    ageAtCamp: number;
  };
};

export default async function PagamentosPage() {
  await requireAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db_ = db as any; // pre-migration cast

  const payments = (await db_.payment.findMany({
    where: {
      method: "PIX",
      status: "AWAITING_REVIEW",
    },
    include: {
      registration: {
        select: {
          id: true,
          publicCode: true,
          fullName: true,
          ageAtCamp: true,
        },
      },
    },
    orderBy: { updatedAt: "asc" }, // oldest first — FIFO review queue
  })) as PaymentRow[];

  // Generate signed URLs server-side (may fail if storage not configured)
  const paymentsWithUrls = await Promise.all(
    payments.map(async (payment: PaymentRow) => {
      let receiptUrl: string | null = null;
      if (payment.pixReceiptPath) {
        try {
          receiptUrl = await signedReceiptUrl(payment.pixReceiptPath, 900);
        } catch {
          receiptUrl = null;
        }
      }
      return { ...payment, receiptUrl };
    }),
  );

  // Parcelas de carnê aguardando revisão (uma linha por parcela).
  type InstallmentRow = {
    id: string;
    number: number;
    amountCents: number;
    dueDate: Date;
    pixReceiptPath: string | null;
    pixTxid: string | null;
    payment: {
      installmentsTotal: number | null;
      registration: { publicCode: string; fullName: string; ageAtCamp: number };
    };
  };
  const installments = (await db_.installment.findMany({
    where: { status: "AWAITING_REVIEW" },
    include: {
      payment: {
        select: {
          installmentsTotal: true,
          registration: {
            select: { publicCode: true, fullName: true, ageAtCamp: true },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  })) as InstallmentRow[];

  const installmentsWithUrls = await Promise.all(
    installments.map(async (inst: InstallmentRow) => {
      let receiptUrl: string | null = null;
      if (inst.pixReceiptPath) {
        try {
          receiptUrl = await signedReceiptUrl(inst.pixReceiptPath, 900);
        } catch {
          receiptUrl = null;
        }
      }
      return { ...inst, receiptUrl };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Pagamentos Pix</h1>
        <p className="mt-1 text-sm text-muted">
          Comprovantes aguardando revisão manual
        </p>
      </div>

      <h2 className="font-condensed text-sm uppercase tracking-wide text-muted">
        Pix à vista
      </h2>

      {paymentsWithUrls.length === 0 ? (
        <Callout tone="success" title="Tudo em dia">
          Não há comprovantes Pix à vista aguardando revisão no momento.
        </Callout>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {paymentsWithUrls.length} comprovante
            {paymentsWithUrls.length !== 1 ? "s" : ""} aguardando revisão
          </p>

          {paymentsWithUrls.map((payment: PaymentRow & { receiptUrl: string | null }) => (
            <Card key={payment.id} className="space-y-5">
              {/* Camper info */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-verde-limao">
                      {payment.registration.publicCode}
                    </span>
                    <Badge className="border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol">
                      Em revisão
                    </Badge>
                  </div>
                  <p className="font-semibold text-creme text-lg">
                    {payment.registration.fullName}
                  </p>
                  <p className="text-sm text-muted">
                    {payment.registration.ageAtCamp} anos
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-display text-2xl text-verde-limao">
                    {formatBRL(payment.amountCents)}
                  </p>
                  {payment.pixTxid && (
                    <p className="text-xs text-muted font-mono">
                      TxID: {payment.pixTxid}
                    </p>
                  )}
                </div>
              </div>

              {/* Receipt link */}
              <div>
                {payment.receiptUrl ? (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Ver comprovante
                    <span className="text-xs text-muted">(link expira em 15 min)</span>
                  </a>
                ) : payment.pixReceiptPath ? (
                  <p className="text-sm text-muted italic">
                    Comprovante enviado, mas não foi possível gerar o link (storage não configurado).
                  </p>
                ) : (
                  <p className="text-sm text-muted italic">
                    Nenhum comprovante anexado.
                  </p>
                )}
              </div>

              <hr className="border-border" />

              {/* Review form */}
              <div>
                <h3 className="font-condensed text-sm uppercase tracking-wide text-muted mb-3">
                  Decisão
                </h3>
                <ReviewForm paymentId={payment.id} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Parcelas de carnê ── */}
      <h2 className="font-condensed text-sm uppercase tracking-wide text-muted pt-4">
        Parcelas de carnê
      </h2>

      {installmentsWithUrls.length === 0 ? (
        <Callout tone="success" title="Tudo em dia">
          Não há parcelas de carnê aguardando revisão no momento.
        </Callout>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {installmentsWithUrls.length} parcela
            {installmentsWithUrls.length !== 1 ? "s" : ""} aguardando revisão
          </p>

          {installmentsWithUrls.map(
            (inst: InstallmentRow & { receiptUrl: string | null }) => (
              <Card key={inst.id} className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-verde-limao">
                        {inst.payment.registration.publicCode}
                      </span>
                      <Badge className="border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol">
                        Parcela {inst.number}/{inst.payment.installmentsTotal ?? "?"}
                      </Badge>
                    </div>
                    <p className="font-semibold text-creme text-lg">
                      {inst.payment.registration.fullName}
                    </p>
                    <p className="text-sm text-muted">
                      {inst.payment.registration.ageAtCamp} anos · vence{" "}
                      {inst.dueDate.toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-display text-2xl text-verde-limao">
                      {formatBRL(inst.amountCents)}
                    </p>
                    {inst.pixTxid && (
                      <p className="text-xs text-muted font-mono">
                        TxID: {inst.pixTxid}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {inst.receiptUrl ? (
                    <a
                      href={inst.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao"
                    >
                      Ver comprovante
                      <span className="text-xs text-muted">(link expira em 15 min)</span>
                    </a>
                  ) : inst.pixReceiptPath ? (
                    <p className="text-sm text-muted italic">
                      Comprovante enviado, mas não foi possível gerar o link (storage não configurado).
                    </p>
                  ) : (
                    <p className="text-sm text-muted italic">
                      Nenhum comprovante anexado.
                    </p>
                  )}
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="font-condensed text-sm uppercase tracking-wide text-muted mb-3">
                    Decisão
                  </h3>
                  <ReviewForm installmentId={inst.id} />
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
