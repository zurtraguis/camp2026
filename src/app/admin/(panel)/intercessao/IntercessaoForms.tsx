"use client";

import { useActionState } from "react";
import {
  adicionarCoordenadoresAction,
  renomearCoordenadorAction,
  removerCoordenadorAction,
  distribuirIntercessaoAction,
  type ReviewState,
} from "@/app/admin/actions";
import { Button, Callout, Field, Input, Textarea } from "@/components/ui";

const initialState: ReviewState = { ok: false };

/** Cadastro em lote — 22 coordenadores num formulário de cada vez seria cruel. */
export function AdicionarCoordenadoresForm() {
  const [state, action, pending] = useActionState(
    adicionarCoordenadoresAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}

      <Field
        label="Nomes dos coordenadores"
        htmlFor="coord-nomes"
        required
        hint="Um por linha. Cole a lista inteira de uma vez."
      >
        <Textarea
          id="coord-nomes"
          name="nomes"
          rows={6}
          required
          disabled={pending}
          placeholder={"Ana Paula\nBruno Carvalho\nCarla Menezes"}
        />
      </Field>

      <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Cadastrando…" : "Cadastrar"}
      </Button>
    </form>
  );
}

/** Distribui os campistas sem coordenador. */
export function DistribuirForm({ pendentes }: { pendentes: number }) {
  const [state, action, pending] = useActionState(
    distribuirIntercessaoAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}
      <p className="text-sm text-muted">
        {pendentes > 0
          ? `${pendentes} campista(s) ainda sem coordenador.`
          : "Todos os campistas já têm coordenador."}
      </p>
      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={pending || pendentes === 0}
        aria-busy={pending}
      >
        {pending ? "Distribuindo…" : "Distribuir quem está sem"}
      </Button>
    </form>
  );
}

/**
 * Redistribuição total — destrutiva de propósito: desfaz o vínculo que os
 * coordenadores já construíram. Confirmação em dois passos, como no
 * rebalanceamento das tribos.
 */
export function RedistribuirTudoForm() {
  const [state, action, pending] = useActionState(
    distribuirIntercessaoAction,
    initialState,
  );

  return (
    <details className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <summary className="cursor-pointer select-none font-condensed text-sm uppercase tracking-wide text-danger">
        Redistribuir tudo do zero
      </summary>
      <div className="mt-4 space-y-3">
        {state.message && (
          <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
        )}
        <p className="text-sm text-muted">
          Reatribui <strong className="text-creme">todos</strong> os campistas,
          inclusive os que já têm coordenador. Quem vinha orando por alguém há
          semanas passa a orar por outra pessoa — use só quando a equipe mudar
          de verdade.
        </p>
        <form action={action}>
          <input type="hidden" name="redistribuirTudo" value="1" />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Redistribuindo…" : "Sim, redistribuir tudo"}
          </Button>
        </form>
      </div>
    </details>
  );
}

/** Renomear/remover um coordenador. */
export function CoordenadorForm({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [rename, renameAction, renaming] = useActionState(
    renomearCoordenadorAction,
    initialState,
  );
  const [remove, removeAction, removing] = useActionState(
    removerCoordenadorAction,
    initialState,
  );

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">editar</span>
        <span className="hidden group-open:inline">fechar</span>
      </summary>
      <div className="mt-2 space-y-2">
        {(rename.message || remove.message) && (
          <Callout tone={rename.ok || remove.ok ? "success" : "danger"}>
            {rename.message || remove.message}
          </Callout>
        )}

        <form action={renameAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <Input
            name="name"
            defaultValue={name}
            maxLength={120}
            aria-label="Nome do coordenador"
            disabled={renaming}
            className="max-w-xs"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={renaming}>
            {renaming ? "Salvando…" : "Salvar"}
          </Button>
        </form>

        <form action={removeAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={removing}
            className="rounded text-[11px] text-muted underline underline-offset-2 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-verde-limao"
          >
            {removing ? "removendo…" : "remover coordenador"}
          </button>
          <span className="ml-2 text-[11px] text-muted">
            os campistas dele voltam para a fila
          </span>
        </form>
      </div>
    </details>
  );
}
