"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { Button, Callout, Field, Badge } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { RECEIPT_ACCEPT, checkReceiptFile } from "@/lib/receipt-check";
import { submitInstallmentReceiptAction } from "@/app/inscricao/actions";
import type { PixUploadState } from "@/app/inscricao/actions";

type InstStatus =
  | "PENDING"
  | "AWAITING_REVIEW"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";

export interface CarneInstallmentView {
  id: string;
  number: number;
  amountCents: number;
  dueDate: string; // ISO
  status: InstStatus;
  txid: string;
  payload?: string;
  qrDataUrl?: string;
}

export interface CarnePanelProps {
  code: string;
  camperName: string;
  publicCode: string;
  configured: boolean;
  pixKey: string;
  receiverName: string;
  totalCents: number;
  installments: CarneInstallmentView[];
}

/* Store estático para detectar o cliente via useSyncExternalStore. */
const subscribeNoop = () => () => {};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusBadge(status: InstStatus) {
  switch (status) {
    case "CONFIRMED":
      return (
        <Badge className="border-verde-limao/40 bg-verde-limao/10 text-verde-limao">
          Pago
        </Badge>
      );
    case "AWAITING_REVIEW":
      return (
        <Badge className="border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol">
          Em análise
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="border-danger/40 bg-danger/10 text-danger">
          Recusado — reenvie
        </Badge>
      );
    default:
      return <Badge>Em aberto</Badge>;
  }
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-disabled={pending}>
      {pending ? "Enviando…" : "Enviar comprovante"}
    </Button>
  );
}

function InstallmentCard({
  code,
  inst,
}: {
  code: string;
  inst: CarneInstallmentView;
}) {
  const [uploadState, uploadAction] = useActionState<PixUploadState, FormData>(
    submitInstallmentReceiptAction,
    { ok: false },
  );
  const [copied, setCopied] = useState(false);
  // Erro do arquivo escolhido (validação no cliente, antes do envio).
  const [fileErr, setFileErr] = useState<string | undefined>(undefined);

  const open =
    inst.status === "PENDING" ||
    inst.status === "FAILED" ||
    inst.status === "EXPIRED";

  async function copyPayload() {
    if (!inst.payload) return;
    try {
      await navigator.clipboard.writeText(inst.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* usuário pode copiar manualmente */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Parcela {inst.number}
          </p>
          <p className="font-display text-2xl text-verde-limao">
            {formatBRL(inst.amountCents)}
          </p>
          <p className="text-xs text-muted">Vencimento: {fmtDate(inst.dueDate)}</p>
        </div>
        {statusBadge(inst.status)}
      </div>

      {inst.status === "AWAITING_REVIEW" && (
        <p className="mt-3 text-sm text-amarelo-sol">
          Comprovante enviado — aguardando confirmação da equipe.
        </p>
      )}
      {inst.status === "CONFIRMED" && (
        <p className="mt-3 text-sm text-verde-limao">Parcela paga e confirmada. ✓</p>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          {/* QR */}
          {inst.qrDataUrl && (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inst.qrDataUrl}
                alt={`QR code Pix da parcela ${inst.number}`}
                width={180}
                height={180}
                className="rounded-lg border border-border bg-white p-2"
              />
            </div>
          )}

          {/* Copia e cola */}
          {inst.payload && (
            <div className="space-y-2">
              <p className="text-xs font-condensed uppercase tracking-widest text-muted">
                Pix copia e cola · parcela {inst.number}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 overflow-hidden rounded-lg border border-border bg-surface-1 px-3 py-2">
                  <p className="truncate font-mono text-xs text-muted">
                    {inst.payload}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyPayload}
                  aria-label={`Copiar código Pix da parcela ${inst.number}`}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          )}

          {/* Upload do comprovante desta parcela */}
          <div aria-live="polite" aria-atomic="true">
            {uploadState.ok && (
              <Callout tone="success" title="Comprovante enviado!">
                {uploadState.message}
              </Callout>
            )}
            {!uploadState.ok && uploadState.message && (
              <Callout tone="danger">{uploadState.message}</Callout>
            )}
          </div>

          {!uploadState.ok && (
            <form action={uploadAction} className="space-y-3">
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="number" value={inst.number} />
              <Field
                label={`Comprovante da parcela ${inst.number}`}
                htmlFor={`receipt_${inst.number}`}
                hint="Imagem (JPG, PNG, WEBP) ou PDF — máx. 10 MB"
                error={fileErr}
              >
                <input
                  id={`receipt_${inst.number}`}
                  name="receipt"
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  required
                  aria-required="true"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    const err = f ? checkReceiptFile(f) : undefined;
                    setFileErr(err ?? undefined);
                    if (err) e.target.value = "";
                  }}
                  className="w-full cursor-pointer rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-creme file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-verde-limao/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-verde-limao hover:file:bg-verde-limao/20"
              />
              </Field>
              <UploadButton />
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Documento de impressão do carnê.
 *
 * Renderizado via portal como filho direto do <body>: o truque anterior
 * (visibility:hidden + position:absolute dentro de um ancestral com
 * overflow:hidden) fazia o Chrome cortar tudo após a 1ª página. Como filho
 * direto do body, escondemos os irmãos com display:none e o carnê flui
 * naturalmente por quantas páginas precisar.
 * ──────────────────────────────────────────────────────────────────────── */

const PRINT_CSS = `
  #carne-print-doc { display: none; }

  @media print {
    @page { size: A4; margin: 12mm; }
    body > *:not(#carne-print-doc) { display: none !important; }
    body { background: #fff !important; }
    #carne-print-doc {
      display: block !important;
      color: #16210c;
      font-family: var(--font-inter), system-ui, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    #carne-print-doc .cp-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 3px solid #2f6b00;
      padding-bottom: 10px;
    }
    #carne-print-doc .cp-brand {
      font-family: var(--font-oswald), system-ui, sans-serif;
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #2f6b00;
    }
    #carne-print-doc .cp-title {
      font-family: var(--font-anton), system-ui, sans-serif;
      font-size: 26px;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: #16210c;
    }
    #carne-print-doc .cp-header-total { text-align: right; }
    #carne-print-doc .cp-total {
      font-family: var(--font-anton), system-ui, sans-serif;
      font-size: 22px;
      color: #2f6b00;
    }

    #carne-print-doc .cp-label {
      font-family: var(--font-oswald), system-ui, sans-serif;
      font-size: 8.5px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7360;
    }
    #carne-print-doc .cp-value { font-size: 11.5px; font-weight: 600; }
    #carne-print-doc .cp-mono {
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    }

    #carne-print-doc .cp-meta {
      display: grid;
      grid-template-columns: repeat(4, auto);
      justify-content: space-between;
      gap: 8px 20px;
      padding: 10px 0 14px;
    }

    /* ── Voucher de parcela ── */
    #carne-print-doc .cp-voucher {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 14px;
    }
    #carne-print-doc .cp-cut {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9aa18f;
      font-size: 9px;
      margin-bottom: 4px;
    }
    #carne-print-doc .cp-cut::after {
      content: "";
      flex: 1;
      border-top: 1.5px dashed #9aa18f;
    }
    #carne-print-doc .cp-voucher-body {
      display: flex;
      border: 1.5px solid #2f6b00;
      border-radius: 10px;
      overflow: hidden;
    }

    /* Canhoto (esquerda) */
    #carne-print-doc .cp-stub {
      width: 34%;
      border-right: 1.5px dashed #9aa18f;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #carne-print-doc .cp-parcela-num {
      font-family: var(--font-oswald), system-ui, sans-serif;
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #2f6b00;
      font-weight: 600;
    }
    #carne-print-doc .cp-amount {
      font-family: var(--font-anton), system-ui, sans-serif;
      font-size: 24px;
      color: #16210c;
    }

    /* Área de pagamento (direita) */
    #carne-print-doc .cp-pay {
      flex: 1;
      display: flex;
      gap: 14px;
      padding: 12px 14px;
      align-items: flex-start;
    }
    #carne-print-doc .cp-qr {
      width: 118px;
      height: 118px;
      flex-shrink: 0;
      border: 1px solid #d5dbc9;
      border-radius: 6px;
      background: #fff !important;
    }
    #carne-print-doc .cp-paycode { flex: 1; min-width: 0; }
    #carne-print-doc .cp-code {
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
      font-size: 8.5px;
      line-height: 1.5;
      word-break: break-all;
      border: 1px solid #d5dbc9;
      border-radius: 6px;
      padding: 6px 8px;
      margin-top: 3px;
      color: #16210c;
    }

    /* Carimbo de parcela paga / em análise */
    #carne-print-doc .cp-stamp {
      align-self: center;
      margin: 14px auto;
      border: 3px solid #2f6b00;
      border-radius: 8px;
      color: #2f6b00;
      font-family: var(--font-anton), system-ui, sans-serif;
      font-size: 20px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 8px 22px;
      transform: rotate(-6deg);
    }
    #carne-print-doc .cp-stamp--review {
      border-color: #8a6d00;
      color: #8a6d00;
    }

    #carne-print-doc .cp-footer {
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid #d5dbc9;
      color: #6b7360;
      font-size: 9.5px;
    }
  }
`;

function CarnePrintDoc({
  camperName,
  publicCode,
  pixKey,
  receiverName,
  totalCents,
  installments,
}: Omit<CarnePanelProps, "code" | "configured">) {
  const paidCount = installments.filter((i) => i.status === "CONFIRMED").length;

  return (
    <div id="carne-print-doc" aria-hidden="true">
      <style>{PRINT_CSS}</style>

      <header className="cp-header">
        <div>
          <p className="cp-brand">Acampamento RAIZ 2026 · Todo fruto revela uma raiz</p>
          <h1 className="cp-title">Carnê de pagamento Pix</h1>
        </div>
        <div className="cp-header-total">
          <p className="cp-label">Valor total</p>
          <p className="cp-total">{formatBRL(totalCents)}</p>
          <p className="cp-label">
            {installments.length} parcelas · {paidCount} paga
            {paidCount === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <section className="cp-meta">
        <div>
          <p className="cp-label">Campista</p>
          <p className="cp-value">{camperName}</p>
        </div>
        <div>
          <p className="cp-label">Código da inscrição</p>
          <p className="cp-value cp-mono">{publicCode}</p>
        </div>
        <div>
          <p className="cp-label">Beneficiário</p>
          <p className="cp-value">{receiverName}</p>
        </div>
        <div>
          <p className="cp-label">Chave Pix</p>
          <p className="cp-value cp-mono">{pixKey}</p>
        </div>
      </section>

      {installments.map((inst) => {
        const isPaid = inst.status === "CONFIRMED";
        const inReview = inst.status === "AWAITING_REVIEW";
        return (
          <article className="cp-voucher" key={inst.id}>
            <p className="cp-cut">✂</p>
            <div className="cp-voucher-body">
              <div className="cp-stub">
                <p className="cp-parcela-num">
                  Parcela {inst.number} de {installments.length}
                </p>
                <p className="cp-amount">{formatBRL(inst.amountCents)}</p>
                <div>
                  <p className="cp-label">Vencimento</p>
                  <p className="cp-value">{fmtDate(inst.dueDate)}</p>
                </div>
                <div>
                  <p className="cp-label">Campista</p>
                  <p className="cp-value">{camperName}</p>
                </div>
                <div>
                  <p className="cp-label">Identificador</p>
                  <p className="cp-value cp-mono">{inst.txid}</p>
                </div>
              </div>

              <div className="cp-pay">
                {isPaid ? (
                  <p className="cp-stamp">Paga ✓</p>
                ) : inReview ? (
                  <p className="cp-stamp cp-stamp--review">Em análise</p>
                ) : (
                  <>
                    {inst.qrDataUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="cp-qr"
                        src={inst.qrDataUrl}
                        alt={`QR code Pix da parcela ${inst.number}`}
                        width={118}
                        height={118}
                      />
                    )}
                    <div className="cp-paycode">
                      <p className="cp-label">
                        Pague pelo QR code ou Pix copia e cola
                      </p>
                      <p className="cp-code">{inst.payload ?? "—"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}

      <footer className="cp-footer">
        Pague cada parcela até o vencimento pelo QR code ou código Pix copia e
        cola e envie o comprovante na página da sua inscrição. A equipe confirma
        em até 24 h úteis. Sua vaga fica garantida desde a confirmação da 1ª
        parcela.
      </footer>
    </div>
  );
}

export function CarnePanel({
  code,
  camperName,
  publicCode,
  configured,
  pixKey,
  receiverName,
  totalCents,
  installments,
}: CarnePanelProps) {
  /* O portal só existe no cliente; evita mismatch de hidratação. */
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  if (!configured) {
    return (
      <Callout tone="warning" title="Chave Pix não configurada">
        A chave Pix ainda não foi configurada pela organização. Entre em contato
        para combinar o pagamento do carnê.
      </Callout>
    );
  }

  const paidCount = installments.filter((i) => i.status === "CONFIRMED").length;

  return (
    <section aria-labelledby="carne-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="carne-heading" className="font-display text-2xl text-verde-limao">
          Carnê Pix — {installments.length}x
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
        >
          Imprimir carnê
        </Button>
      </div>

      <div className="rounded-xl border border-verde-limao/30 bg-verde-limao/5 px-5 py-4">
        <p className="text-xs font-condensed uppercase tracking-widest text-muted">
          Carnê Acampamento RAIZ 2026
        </p>
        <p className="font-display text-xl text-creme">{camperName}</p>
        <p className="mt-1 text-xs text-muted">
          Código <span className="font-mono text-creme">{publicCode}</span> ·
          Beneficiário: <span className="text-creme">{receiverName}</span> ·
          Chave Pix: <span className="font-mono text-creme">{pixKey}</span>
        </p>
        <p className="mt-2 text-sm text-creme">
          Total:{" "}
          <span className="text-verde-limao">{formatBRL(totalCents)}</span> em{" "}
          {installments.length}x · {paidCount} de {installments.length} pago
          {paidCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-4">
        {installments.map((inst) => (
          <InstallmentCard key={inst.id} code={code} inst={inst} />
        ))}
      </div>

      <p className="text-[11px] leading-snug text-muted">
        Pague cada parcela pelo QR/código Pix e envie o comprovante. A equipe
        confirma em até 24 h úteis. Sua vaga já está garantida desde a 1ª parcela.
      </p>

      {mounted &&
        createPortal(
          <CarnePrintDoc
            camperName={camperName}
            publicCode={publicCode}
            pixKey={pixKey}
            receiverName={receiverName}
            totalCents={totalCents}
            installments={installments}
          />,
          document.body,
        )}
    </section>
  );
}
