"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Callout, Field } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { submitPixReceiptAction } from "@/app/inscricao/actions";
import type { PixUploadState } from "@/app/inscricao/actions";

/* ─── Props come from the Server Component that called getPixDisplay ─── */
export interface PixPanelProps {
  code: string;
  configured: boolean;
  pixKey: string;
  receiverName: string;
  amountCents: number;
  txid: string;
  payload?: string;
  qrDataUrl?: string;
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending} aria-disabled={pending}>
      {pending ? "Enviando…" : "Enviar comprovante"}
    </Button>
  );
}

export function PixPanel({
  code,
  configured,
  pixKey,
  receiverName,
  amountCents,
  txid,
  payload,
  qrDataUrl,
}: PixPanelProps) {
  const [uploadState, uploadAction] = useActionState<PixUploadState, FormData>(
    submitPixReceiptAction,
    { ok: false },
  );

  const [copied, setCopied] = useState(false);

  async function copyPayload() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: select text manually */
    }
  }

  if (!configured) {
    return (
      <Callout tone="warning" title="Chave Pix não configurada">
        A chave Pix ainda não foi configurada pela organização. Entre em contato
        diretamente para combinar o pagamento.
      </Callout>
    );
  }

  return (
    <section aria-labelledby="pix-heading" className="space-y-6">
      <h2
        id="pix-heading"
        className="font-display text-2xl text-verde-limao"
      >
        Pague via Pix
      </h2>

      {/* Amount */}
      <div className="rounded-xl border border-verde-limao/30 bg-verde-limao/5 px-5 py-4">
        <p className="text-xs font-condensed uppercase tracking-widest text-muted">
          Valor a pagar
        </p>
        <p className="font-display text-4xl text-verde-limao">
          {formatBRL(amountCents)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Beneficiário: <span className="text-creme">{receiverName}</span> · TxID:{" "}
          <span className="text-creme">{txid}</span>
        </p>
      </div>

      {/* QR code */}
      {qrDataUrl && (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code Pix para pagamento. Escaneie com o app do seu banco ou use o código Pix copia e cola abaixo."
            width={220}
            height={220}
            className="rounded-xl border border-border bg-white p-2"
          />
          <p className="text-xs text-muted">
            Escaneie o QR code com o app do seu banco
          </p>
        </div>
      )}

      {/* Pix key */}
      <div className="space-y-1">
        <p className="text-xs font-condensed uppercase tracking-widest text-muted">
          Chave Pix
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
          <span
            className="flex-1 break-all font-mono text-sm text-creme"
            aria-label={`Chave Pix: ${pixKey}`}
          >
            {pixKey}
          </span>
        </div>
      </div>

      {/* Copia e cola */}
      {payload && (
        <div className="space-y-2">
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Pix copia e cola
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 overflow-hidden rounded-lg border border-border bg-surface-2 px-3 py-2.5"
              aria-label="Código Pix copia e cola"
            >
              <p className="truncate font-mono text-xs text-muted">{payload}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copyPayload}
              aria-label="Copiar código Pix"
            >
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}

      <hr className="border-border" />

      {/* Receipt upload */}
      <div className="space-y-4">
        <h3 className="font-display text-lg text-amarelo-sol">
          Enviar comprovante
        </h3>
        <p className="text-sm text-muted">
          Após realizar o Pix, envie o comprovante para que possamos confirmar
          sua inscrição em até 24 h úteis.
        </p>

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
          <form action={uploadAction} className="space-y-4">
            <input type="hidden" name="code" value={code} />

            <Field
              label="Comprovante de pagamento"
              htmlFor="receipt"
              hint="Imagem (JPG, PNG, WEBP) ou PDF — máx. 10 MB"
              error={undefined}
            >
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/*,application/pdf"
                required
                aria-required="true"
                className="w-full cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-creme file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-verde-limao/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-verde-limao hover:file:bg-verde-limao/20"
              />
            </Field>

            <UploadButton />
          </form>
        )}
      </div>
    </section>
  );
}
