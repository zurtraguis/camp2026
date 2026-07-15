"use client";

import { useActionState } from "react";
import { baixaManualAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Select, Textarea } from "@/components/ui";

export interface ParcelaEmAberto {
  id: string;
  /** Rótulo pronto do servidor: "1ª · R$ 100,00 · venceu 09/07/2026". */
  label: string;
}

interface Props {
  /** Nome do campista — o formulário fica dentro da linha, mas o menu não. */
  nome: string;
  /** Pagamento à vista. Exclusivo com `parcelas`. */
  paymentId?: string;
  /** Parcelas em aberto do carnê, da mais antiga para a mais nova. */
  parcelas?: ParcelaEmAberto[];
}

const initialState: ReviewState = { ok: false };

export function BaixaManualForm({ nome, paymentId, parcelas }: Props) {
  const [state, action, pending] = useActionState(baixaManualAction, initialState);
  const isCarne = Boolean(parcelas?.length);
  const id = paymentId ?? parcelas?.[0]?.id ?? "";

  if (state.ok) {
    return (
      <Callout tone="success">{state.message ?? "Baixa registrada."}</Callout>
    );
  }

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Dar baixa</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <form action={action} className="mt-3 min-w-[15rem] space-y-3">
        <p className="text-xs text-muted">
          Confirmar pagamento de <span className="text-creme">{nome}</span> sem
          comprovante no site.
        </p>

        {state.message && !state.ok && (
          <Callout tone="danger">{state.message}</Callout>
        )}

        {isCarne ? (
          <Field label="Parcela" htmlFor={`parcela-${id}`}>
            <Select id={`parcela-${id}`} name="installmentId" disabled={pending}>
              {parcelas!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="paymentId" value={paymentId} />
        )}

        <Field
          label="Como recebeu?"
          htmlFor={`forma-${id}`}
          hint="Fica no histórico junto com seu nome."
        >
          <Select id={`forma-${id}`} name="forma" required defaultValue="" disabled={pending}>
            <option value="" disabled>
              Selecione…
            </option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="CARTAO">Cartão</option>
            <option value="PIX">Pix</option>
            <option value="OUTRO">Outro</option>
          </Select>
        </Field>

        <Field label="Observação (opcional)" htmlFor={`obs-${id}`}>
          <Textarea
            id={`obs-${id}`}
            name="note"
            placeholder="Ex: pagou na igreja domingo; comprovante no meu WhatsApp"
            rows={2}
            maxLength={500}
            disabled={pending}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Registrando…" : "Confirmar baixa"}
        </Button>
      </form>
    </details>
  );
}
