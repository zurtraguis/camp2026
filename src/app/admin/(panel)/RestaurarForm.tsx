"use client";

import { useActionState } from "react";
import { restaurarInscricaoAction, type ReviewState } from "@/app/admin/actions";
import { Callout } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/** Traz de volta uma inscrição excluída, a partir da cópia guardada. */
export function RestaurarForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    restaurarInscricaoAction,
    initialState,
  );

  if (state.ok) return <Callout tone="success">{state.message}</Callout>;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <form action={action} className="inline">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded text-xs font-semibold text-verde-limao underline underline-offset-2 transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-verde-limao"
        >
          {pending ? "restaurando…" : "restaurar"}
        </button>
      </form>
      {state.message && !state.ok && (
        <span className="text-[11px] text-danger">{state.message}</span>
      )}
    </span>
  );
}
