"use client";

import { useActionState, useState } from "react";
import { deleteRegistrationAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Exclusão permanente com confirmação em dois passos — evita apagar por engano.
 * O primeiro clique revela o botão vermelho de confirmação.
 */
export function DeleteRegistrationForm({
  id,
  publicCode,
  fullName,
}: {
  id: string;
  publicCode: string;
  fullName: string;
}) {
  const [state, action, pending] = useActionState(
    deleteRegistrationAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      {state.message && !state.ok && (
        <Callout tone="danger">{state.message}</Callout>
      )}

      {!confirming ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          Excluir inscrição
        </Button>
      ) : (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 space-y-3">
          <p className="text-sm text-creme">
            Excluir <span className="font-semibold">{fullName}</span> ({publicCode})
            em definitivo? Remove também responsável, saúde, consentimento e
            pagamento. <span className="text-danger">Não dá para desfazer.</span>
          </p>
          <form action={action} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={id} />
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Excluindo…" : "Sim, excluir permanentemente"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
