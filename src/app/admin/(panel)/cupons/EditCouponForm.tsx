"use client";

import { useActionState } from "react";
import { editCouponAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

export interface EditCouponFormProps {
  id: string;
  code: string;
  percentOff: number;
  /** ISO "yyyy-mm-dd" para o input date, ou "" quando não há validade. */
  expiresAt: string;
  maxUses: number | null;
  uses: number;
}

/**
 * Edita %, validade e limite. O CÓDIGO aparece só como rótulo: os pagamentos
 * guardam um snapshot dele, então renomear quebraria a auditoria de quem usou.
 */
export function EditCouponForm({
  id,
  code,
  percentOff,
  expiresAt,
  maxUses,
  uses,
}: EditCouponFormProps) {
  const [state, action, pending] = useActionState(editCouponAction, initialState);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Editar</span>
        <span className="hidden group-open:inline">Fechar</span>
      </summary>

      <form action={action} className="mt-3 min-w-[16rem] space-y-3">
        <input type="hidden" name="id" value={id} />

        {state.message && (
          <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
        )}

        <p className="text-xs text-muted">
          Editando <span className="font-mono text-creme">{code}</span>. O código
          não muda — os pagamentos que já o usaram guardam esse nome. Para trocar
          o código, desative este e crie outro.
        </p>

        <Field label="Desconto (%)" htmlFor={`pct-${id}`} required>
          <Input
            id={`pct-${id}`}
            name="percentOff"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={percentOff}
            disabled={pending}
          />
        </Field>

        <Field
          label="Validade"
          htmlFor={`exp-${id}`}
          hint="Vazio = sem validade"
        >
          <Input
            id={`exp-${id}`}
            name="expiresAt"
            type="date"
            defaultValue={expiresAt}
            disabled={pending}
          />
        </Field>

        <Field
          label="Limite de usos"
          htmlFor={`max-${id}`}
          hint={
            uses > 0
              ? `Já usado ${uses}x — o limite não pode ficar abaixo disso`
              : "Vazio = ilimitado"
          }
        >
          <Input
            id={`max-${id}`}
            name="maxUses"
            type="number"
            min={Math.max(1, uses)}
            defaultValue={maxUses ?? ""}
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
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </details>
  );
}
