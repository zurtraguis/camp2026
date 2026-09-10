"use client";

import { useActionState, useState } from "react";
import { deleteRegistrationAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Exclusão com confirmação em dois passos.
 *
 * Desde set/2026 a exclusão guarda uma fotografia completa da inscrição antes
 * de apagar — dá para restaurar depois. O texto diz isso: avisar "não dá para
 * desfazer" quando dá faz a pessoa hesitar à toa; e o contrário, pior ainda.
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
            Excluir <span className="font-semibold">{fullName}</span> ({publicCode})?
            Sai da lista, da tribo e das cobranças. Uma cópia completa fica na
            lixeira, no fim da lista de inscrições, e dá para restaurar.
          </p>
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <Field
              label="Motivo"
              htmlFor={`del-mot-${id}`}
              hint="Opcional — fica guardado com a cópia"
            >
              <Input
                id={`del-mot-${id}`}
                name="motivo"
                maxLength={300}
                placeholder="Desistiu; estorno feito."
                disabled={pending}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Excluindo…" : "Sim, excluir"}
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
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
