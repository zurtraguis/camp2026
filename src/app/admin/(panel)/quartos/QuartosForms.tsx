"use client";

import { useActionState } from "react";
import {
  gerarQuartosAction,
  encaixarQuartosAction,
  type ReviewState,
} from "@/app/admin/actions";
import { Button, Callout, Field, Input } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/**
 * Gerar do zero. Se já existem quartos, pede confirmação: regerar reembaralha
 * todo mundo, e a lista já pode ter sido anunciada às famílias.
 */
export function GerarQuartosForm({
  capacidadeAtual,
  jaTemQuartos,
}: {
  capacidadeAtual: number | null;
  jaTemQuartos: boolean;
}) {
  const [state, action, pending] = useActionState(gerarQuartosAction, initialState);

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          jaTemQuartos &&
          !window.confirm(
            "Já existem quartos montados. Gerar de novo REEMBARALHA todo mundo — inclusive quem já sabe o seu quarto. Continuar?",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}

      <Field
        label="Pessoas por quarto"
        htmlFor="cap-quarto"
        required
        hint="Meninos e meninas ficam sempre em quartos separados."
      >
        <Input
          id="cap-quarto"
          name="capacidade"
          type="number"
          inputMode="numeric"
          min={2}
          max={50}
          required
          defaultValue={capacidadeAtual ?? 6}
          disabled={pending}
          className="max-w-[8rem]"
        />
      </Field>

      <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Gerando…" : jaTemQuartos ? "Gerar de novo" : "Gerar quartos"}
      </Button>
    </form>
  );
}

/** Encaixa quem chegou depois, sem mexer em ninguém. */
export function EncaixarForm({
  capacidade,
  semQuarto,
}: {
  capacidade: number;
  semQuarto: number;
}) {
  const [state, action, pending] = useActionState(encaixarQuartosAction, initialState);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="capacidade" value={capacidade} />
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending || semQuarto === 0}
        aria-busy={pending}
      >
        {pending ? "Encaixando…" : `Encaixar os ${semQuarto} sem quarto`}
      </Button>
      <p className="text-xs text-muted">
        Vão para o quarto do mesmo gênero com menos gente; se todos estiverem
        cheios, abre um quarto novo. Ninguém que já tem quarto é mexido.
      </p>
    </form>
  );
}
