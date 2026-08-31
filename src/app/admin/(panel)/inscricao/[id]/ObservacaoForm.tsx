"use client";

import { useActionState } from "react";
import { salvarObservacaoAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Textarea } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Observação interna da organização sobre a inscrição — bolsa combinada,
 * pendência com a família, o que a equipe precisar lembrar. Fica aberto (sem
 * <details>) quando já existe texto: o valor de uma anotação é ser lida sem
 * que ninguém precise procurar por ela.
 */
export function ObservacaoForm({
  registrationId,
  atual,
}: {
  registrationId: string;
  atual: string | null;
}) {
  const [state, action, pending] = useActionState(
    salvarObservacaoAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="registrationId" value={registrationId} />

      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}

      <Textarea
        id={`obs-${registrationId}`}
        name="adminNotes"
        rows={4}
        maxLength={2000}
        defaultValue={atual ?? ""}
        disabled={pending}
        placeholder="Ex.: bolsa combinada com a liderança; responsável pediu para pagar na igreja no dia 10."
        aria-label="Observação interna sobre esta inscrição"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Salvando…" : "Salvar observação"}
        </Button>
        <p className="text-xs text-muted">
          Só a organização vê. Não aparece para o campista nem no comprovante.
        </p>
      </div>
    </form>
  );
}
