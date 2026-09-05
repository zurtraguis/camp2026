"use client";

import { useActionState } from "react";
import { trocarTriboAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Select } from "@/components/ui";
import { TRIBOS, TRIBO_META, type TriboId } from "@/lib/tribos";

const initialState: ReviewState = { ok: false };

/**
 * Troca a tribo de um campista na mão — irmãos que precisam ficar juntos,
 * amizade que a família pediu, ajuste que o balanceamento não tem como saber.
 *
 * Fica fechado por padrão: mover alguém é exceção, e a tribo atribuída é o
 * resultado de um balanceamento que normalmente não se deve mexer.
 */
export function TrocarTriboForm({
  registrationId,
  atual,
}: {
  registrationId: string;
  atual: TriboId | null;
}) {
  const [state, action, pending] = useActionState(trocarTriboAction, initialState);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Trocar de tribo</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="registrationId" value={registrationId} />

        {state.message && (
          <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
        )}

        <Select
          name="tribo"
          aria-label="Nova tribo"
          defaultValue={atual ?? TRIBOS[0]}
          disabled={pending}
        >
          {TRIBOS.map((t) => (
            <option key={t} value={t}>
              {TRIBO_META[t].nome} ({TRIBO_META[t].significado})
            </option>
          ))}
        </Select>

        <p className="text-xs text-muted">
          Um rebalanceamento geral desfaz trocas feitas na mão — ele redistribui
          todo mundo do zero.
        </p>

        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Trocando…" : "Trocar"}
        </Button>
      </form>
    </details>
  );
}
