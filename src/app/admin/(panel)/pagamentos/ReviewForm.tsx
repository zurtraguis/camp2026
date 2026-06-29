"use client";

import { useActionState } from "react";
import { reviewPixAction, type ReviewState } from "@/app/admin/actions";
import { Button, Callout, Field, Textarea } from "@/components/ui";

interface ReviewFormProps {
  paymentId: string;
}

const initialState: ReviewState = { ok: false };

export function ReviewForm({ paymentId }: ReviewFormProps) {
  const [state, action, pending] = useActionState(reviewPixAction, initialState);

  if (state.ok) {
    return (
      <Callout tone="success">
        {state.message ?? "Revisão concluída."}
      </Callout>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />

      {state.message && !state.ok && (
        <Callout tone="danger">{state.message}</Callout>
      )}

      <Field
        label="Observação (opcional)"
        htmlFor={`note-${paymentId}`}
        hint="Visível no histórico interno."
      >
        <Textarea
          id={`note-${paymentId}`}
          name="note"
          placeholder="Ex: comprovante ilegível, valor incorreto…"
          rows={2}
          maxLength={500}
          disabled={pending}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="confirm"
          variant="primary"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Processando…" : "Confirmar"}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="danger"
          size="sm"
          disabled={pending}
          aria-busy={pending}
        >
          Rejeitar
        </Button>
      </div>
    </form>
  );
}
