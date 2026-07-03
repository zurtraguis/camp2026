"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Callout, Field, Badge } from "@/components/ui";
import { formatBRL } from "@/lib/format";
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
                style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
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
                  className="no-print"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          )}

          {/* Upload do comprovante desta parcela */}
          <div className="no-print" aria-live="polite" aria-atomic="true">
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
            <form action={uploadAction} className="no-print space-y-3">
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="number" value={inst.number} />
              <Field
                label={`Comprovante da parcela ${inst.number}`}
                htmlFor={`receipt_${inst.number}`}
                hint="Imagem (JPG, PNG, WEBP) ou PDF — máx. 10 MB"
                error={undefined}
              >
                <input
                  id={`receipt_${inst.number}`}
                  name="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  aria-required="true"
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
      {/* Regras de impressão: ao imprimir, mostra só o carnê, em fundo branco. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #carne-print, #carne-print * { visibility: visible !important; }
          #carne-print {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #fff !important; color: #000 !important; padding: 16px;
          }
          #carne-print .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="carne-heading" className="font-display text-2xl text-verde-limao">
          Carnê Pix — {installments.length}x
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          className="no-print"
        >
          Imprimir carnê
        </Button>
      </div>

      <div id="carne-print" className="space-y-5">
        {/* Cabeçalho do carnê (aparece na impressão) */}
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
            Total: <span className="text-verde-limao">{formatBRL(totalCents)}</span>{" "}
            em {installments.length}x · {paidCount} de {installments.length} pago
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
      </div>
    </section>
  );
}
