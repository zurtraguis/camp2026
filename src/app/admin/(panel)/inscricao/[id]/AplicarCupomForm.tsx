"use client";

import { useActionState } from "react";
import { aplicarCupomAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Aplica um cupom numa inscrição já criada — o caso "a mãe esqueceu de colocar
 * o cupom". Só aparece quando nada foi pago; a página decide, e o serviço
 * revalida (a UI não é a fronteira).
 */
export function AplicarCupomForm({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(aplicarCupomAction, initialState);

  if (state.ok) {
    return <Callout tone="success">{state.message}</Callout>;
  }

  return (
    <details className="group mt-4">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Aplicar cupom</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="paymentId" value={paymentId} />

        {state.message && !state.ok && (
          <Callout tone="danger">{state.message}</Callout>
        )}

        <p className="text-xs text-muted">
          Para quem esqueceu o cupom na inscrição. O valor devido é recalculado
          — e, no carnê, as parcelas são redivididas.
        </p>

        <Field label="Código do cupom" htmlFor={`cupom-${paymentId}`} required>
          <Input
            id={`cupom-${paymentId}`}
            name="code"
            type="text"
            required
            maxLength={40}
            placeholder="RAIZ10"
            autoCapitalize="characters"
            className="uppercase"
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
          {pending ? "Aplicando…" : "Aplicar e recalcular"}
        </Button>
      </form>
    </details>
  );
}
