"use client";

import { useActionState } from "react";
import { createCouponAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

export function CreateCouponForm() {
  const [state, action, pending] = useActionState(createCouponAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor="code" required hint="Ex.: RAIZ10, IGREJA">
          <Input
            id="code"
            name="code"
            type="text"
            required
            maxLength={40}
            placeholder="RAIZ10"
            autoCapitalize="characters"
            className="uppercase"
          />
        </Field>

        <Field label="Desconto (%)" htmlFor="percentOff" required>
          <Input
            id="percentOff"
            name="percentOff"
            type="number"
            required
            min={1}
            max={100}
            placeholder="10"
          />
        </Field>

        <Field
          label="Validade (opcional)"
          htmlFor="expiresAt"
          hint="Sem data = sem validade"
        >
          <Input id="expiresAt" name="expiresAt" type="date" />
        </Field>

        <Field
          label="Limite de usos (opcional)"
          htmlFor="maxUses"
          hint="Vazio = ilimitado"
        >
          <Input id="maxUses" name="maxUses" type="number" min={1} placeholder="20" />
        </Field>
      </div>

      <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Criando…" : "Criar cupom"}
      </Button>
    </form>
  );
}
