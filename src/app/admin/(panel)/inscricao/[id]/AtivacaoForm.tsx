"use client";

import { useActionState } from "react";
import {
  desativarInscricaoAction,
  reativarInscricaoAction,
  type ReviewState,
} from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Desativar / reativar uma inscrição.
 *
 * Desativar é ação de arrumação, não de exclusão: nada é apagado, a vaga volta
 * para o teto e a pessoa sai da tribo. Por isso não usa o vermelho de perigo
 * da exclusão — mas fica fechado, porque mexe na vaga de alguém.
 */
export function DesativarForm({
  id,
  fullName,
}: {
  id: string;
  fullName: string;
}) {
  const [state, action, pending] = useActionState(
    desativarInscricaoAction,
    initialState,
  );

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-amarelo-sol/40 bg-amarelo-sol/10 px-2.5 py-1 text-xs font-semibold text-amarelo-sol transition-colors hover:bg-amarelo-sol/20 focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Desativar inscrição</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <form action={action} className="mt-3 max-w-md space-y-3">
        <input type="hidden" name="id" value={id} />
        {state.message && (
          <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
        )}

        <p className="text-sm text-muted">
          Para quem sumiu e não pagou.{" "}
          <strong className="text-creme">{fullName}</strong> sai da tribo, deixa
          de ocupar vaga e some da fila de cobrança. Nada é apagado — se
          aparecer e pagar, é só reativar.
        </p>

        <Field label="Motivo" htmlFor={`mot-${id}`} hint="Opcional — vai para a observação">
          <Input
            id={`mot-${id}`}
            name="motivo"
            maxLength={300}
            placeholder="Sem resposta desde 20/08."
            disabled={pending}
          />
        </Field>

        <Button type="submit" variant="secondary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Desativando…" : "Desativar"}
        </Button>
      </form>
    </details>
  );
}

/** Reativa: nova tribo pela distribuição do dia. */
export function ReativarForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    reativarInscricaoAction,
    initialState,
  );

  return (
    <div className="space-y-3">
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Reativando…" : "Reativar inscrição"}
        </Button>
      </form>
      <p className="text-xs text-muted">
        A tribo é sorteada de novo pela distribuição de hoje, como se a
        inscrição fosse feita agora — devolver a tribo antiga desequilibraria os
        times, que foram refeitos sem esta pessoa.
      </p>
    </div>
  );
}
