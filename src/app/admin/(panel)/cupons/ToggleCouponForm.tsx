"use client";

import { useActionState } from "react";
import { toggleCouponAction, type ReviewState } from "@/app/admin/actions";
import { Button } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/** Botão inline que liga/desliga um cupom (envia o estado desejado). */
export function ToggleCouponForm({ id, active }: { id: string; active: boolean }) {
  const [, action, pending] = useActionState(toggleCouponAction, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button
        type="submit"
        variant={active ? "ghost" : "primary"}
        size="sm"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "…" : active ? "Desativar" : "Ativar"}
      </Button>
    </form>
  );
}
