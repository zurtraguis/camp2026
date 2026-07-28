"use client";

import { useActionState } from "react";
import { alterarFormaAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout } from "@/components/ui";
import { FORMA_ALVO_LABEL, type FormaAlvo } from "@/lib/forma-pagamento";

const initialState: ReviewState = { ok: false };

/**
 * Troca a forma de pagamento da inscrição (Pix à vista / cartão). Só é
 * renderizado quando a troca é possível (nada confirmado, nada em revisão) —
 * a página decide via alvosDisponiveis(); o serviço revalida de qualquer jeito.
 */
export function AlterarFormaForm({
  paymentId,
  alvos,
  isCarne,
}: {
  paymentId: string;
  alvos: FormaAlvo[];
  isCarne: boolean;
}) {
  const [state, action, pending] = useActionState(alterarFormaAction, initialState);

  if (state.ok) {
    return <Callout tone="success">{state.message}</Callout>;
  }

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Alterar forma</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <div className="mt-3 min-w-[15rem] space-y-3">
        {state.message && !state.ok && (
          <Callout tone="danger">{state.message}</Callout>
        )}
        {isCarne && (
          <p className="text-xs text-muted">
            Este é um carnê sem parcela paga: ao trocar, as parcelas são
            descartadas e o valor passa a ser cobrado na nova forma.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {alvos.map((alvo) => (
            <form key={alvo} action={action}>
              <input type="hidden" name="paymentId" value={paymentId} />
              <input type="hidden" name="alvo" value={alvo} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Alterando…" : `Mudar para ${FORMA_ALVO_LABEL[alvo]}`}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </details>
  );
}
