"use client";

import { useActionState } from "react";
import {
  criarDespesaAction,
  pagarDespesaAction,
  editarDespesaAction,
  removerDespesaAction,
  removerPagamentoDespesaAction,
  type ReviewState,
} from "@/app/admin/actions";
import { Button, Callout, Field, Input, Select, Textarea } from "@/components/ui";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  FORMAS_DESPESA,
  FORMA_DESPESA_LABEL,
  type CategoriaDespesa,
} from "@/lib/custos";

const initialState: ReviewState = { ok: false };

/** Hoje em "yyyy-mm-dd" para o input date. */
function hojeISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function CamposDespesa({
  prefixo,
  valores,
  disabled,
}: {
  prefixo: string;
  valores?: {
    description?: string;
    category?: string;
    amount?: string;
    supplier?: string;
    dueDate?: string;
    notes?: string;
  };
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Descrição"
        htmlFor={`${prefixo}-desc`}
        required
        className="sm:col-span-2"
      >
        <Input
          id={`${prefixo}-desc`}
          name="description"
          required
          maxLength={160}
          placeholder="Aluguel do sítio"
          defaultValue={valores?.description}
          disabled={disabled}
        />
      </Field>

      <Field label="Categoria" htmlFor={`${prefixo}-cat`} required>
        <Select
          id={`${prefixo}-cat`}
          name="category"
          required
          defaultValue={valores?.category ?? "OUTRO"}
          disabled={disabled}
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABEL[c as CategoriaDespesa]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Valor total"
        htmlFor={`${prefixo}-valor`}
        required
        hint="O combinado por inteiro, mesmo que pague em partes"
      >
        <Input
          id={`${prefixo}-valor`}
          name="amountCents"
          required
          inputMode="decimal"
          placeholder="5.000,00"
          defaultValue={valores?.amount}
          disabled={disabled}
        />
      </Field>

      <Field label="Fornecedor" htmlFor={`${prefixo}-forn`} hint="Opcional">
        <Input
          id={`${prefixo}-forn`}
          name="supplier"
          maxLength={120}
          placeholder="Sítio Recanto"
          defaultValue={valores?.supplier}
          disabled={disabled}
        />
      </Field>

      <Field
        label="Vencimento do saldo"
        htmlFor={`${prefixo}-venc`}
        hint="Opcional"
      >
        <Input
          id={`${prefixo}-venc`}
          name="dueDate"
          type="date"
          defaultValue={valores?.dueDate}
          disabled={disabled}
        />
      </Field>

      <Field
        label="Observação"
        htmlFor={`${prefixo}-obs`}
        hint="Opcional"
        className="sm:col-span-2"
      >
        <Textarea
          id={`${prefixo}-obs`}
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Combinado com o proprietário: entrada + restante até setembro."
          defaultValue={valores?.notes}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}

/** Cadastro de despesa, já com o que porventura foi pago na hora. */
export function CriarDespesaForm() {
  const [state, action, pending] = useActionState(criarDespesaAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
      )}

      <CamposDespesa prefixo="nova" disabled={pending} />

      <fieldset className="rounded-lg border border-verde-limao/20 bg-verde-limao/5 p-4">
        <legend className="px-1 text-xs font-condensed uppercase tracking-wide text-verde-limao">
          Já pagou parte?
        </legend>
        <p className="mb-3 text-xs text-muted">
          Ex.: a entrada do aluguel. Deixe em branco se ainda não pagou nada — dá
          para registrar depois.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Valor já pago" htmlFor="nova-pago">
            <Input
              id="nova-pago"
              name="pagoAgora"
              inputMode="decimal"
              placeholder="2.000,00"
              disabled={pending}
            />
          </Field>
          <Field label="Pago em" htmlFor="nova-pago-em">
            <Input
              id="nova-pago-em"
              name="pagoAgoraEm"
              type="date"
              defaultValue={hojeISO()}
              disabled={pending}
            />
          </Field>
          <Field label="Como pagou" htmlFor="nova-pago-forma">
            <Select
              id="nova-pago-forma"
              name="pagoAgoraForma"
              defaultValue="PIX"
              disabled={pending}
            >
              {FORMAS_DESPESA.map((f) => (
                <option key={f} value={f}>
                  {FORMA_DESPESA_LABEL[f]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
        {pending ? "Salvando…" : "Cadastrar despesa"}
      </Button>
    </form>
  );
}

/** Registra mais um pagamento de uma despesa existente. */
export function PagarDespesaForm({
  expenseId,
  restanteLabel,
}: {
  expenseId: string;
  restanteLabel: string;
}) {
  const [state, action, pending] = useActionState(pagarDespesaAction, initialState);

  if (state.ok) return <Callout tone="success">{state.message}</Callout>;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-verde-limao/40 bg-verde-limao/10 px-2.5 py-1 text-xs font-semibold text-verde-limao transition-colors hover:bg-verde-limao/20 focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Registrar pagamento</span>
        <span className="hidden group-open:inline">Cancelar</span>
      </summary>

      <form action={action} className="mt-3 min-w-[15rem] space-y-3">
        <input type="hidden" name="expenseId" value={expenseId} />
        {state.message && !state.ok && (
          <Callout tone="danger">{state.message}</Callout>
        )}
        <p className="text-xs text-muted">Falta pagar {restanteLabel}.</p>

        <Field label="Valor pago" htmlFor={`pg-valor-${expenseId}`} required>
          <Input
            id={`pg-valor-${expenseId}`}
            name="amountCents"
            required
            inputMode="decimal"
            placeholder="2.000,00"
            disabled={pending}
          />
        </Field>

        <Field label="Pago em" htmlFor={`pg-data-${expenseId}`} required>
          <Input
            id={`pg-data-${expenseId}`}
            name="paidAt"
            type="date"
            required
            defaultValue={hojeISO()}
            disabled={pending}
          />
        </Field>

        <Field label="Como pagou" htmlFor={`pg-forma-${expenseId}`} required>
          <Select
            id={`pg-forma-${expenseId}`}
            name="method"
            required
            defaultValue="PIX"
            disabled={pending}
          >
            {FORMAS_DESPESA.map((f) => (
              <option key={f} value={f}>
                {FORMA_DESPESA_LABEL[f]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Observação" htmlFor={`pg-obs-${expenseId}`} hint="Opcional">
          <Input
            id={`pg-obs-${expenseId}`}
            name="notes"
            maxLength={300}
            placeholder="Recibo nº 12"
            disabled={pending}
          />
        </Field>

        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Registrando…" : "Registrar"}
        </Button>
      </form>
    </details>
  );
}

/** Edita os dados da despesa (os pagamentos ficam como estão). */
export function EditarDespesaForm({
  id,
  description,
  category,
  amount,
  supplier,
  dueDate,
  notes,
}: {
  id: string;
  description: string;
  category: string;
  amount: string;
  supplier: string;
  dueDate: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState(editarDespesaAction, initialState);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao">
        <span className="group-open:hidden">Editar</span>
        <span className="hidden group-open:inline">Fechar</span>
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={id} />
        {state.message && (
          <Callout tone={state.ok ? "success" : "danger"}>{state.message}</Callout>
        )}
        <CamposDespesa
          prefixo={`ed-${id}`}
          valores={{ description, category, amount, supplier, dueDate, notes }}
          disabled={pending}
        />
        <Button type="submit" variant="primary" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </details>
  );
}

/** Remove um pagamento lançado por engano. */
export function RemoverPagamentoForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    removerPagamentoDespesaAction,
    initialState,
  );
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        title="Remover este pagamento"
        className="rounded text-[11px] text-muted underline underline-offset-2 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-verde-limao"
      >
        {pending ? "removendo…" : "remover"}
      </button>
      {state.message && !state.ok && (
        <span className="ml-2 text-[11px] text-danger">{state.message}</span>
      )}
    </form>
  );
}

/** Exclusão da despesa, com confirmação em dois passos. */
export function RemoverDespesaForm({
  id,
  descricao,
}: {
  id: string;
  descricao: string;
}) {
  const [state, action, pending] = useActionState(removerDespesaAction, initialState);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-verde-limao">
        Excluir
      </summary>
      <div className="mt-2 space-y-2 rounded-lg border border-danger/40 bg-danger/10 p-3">
        {state.message && !state.ok && (
          <Callout tone="danger">{state.message}</Callout>
        )}
        <p className="text-xs text-creme">
          Excluir <span className="font-semibold">{descricao}</span> e todos os
          pagamentos registrados nela? Não dá para desfazer.
        </p>
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Excluindo…" : "Sim, excluir"}
          </Button>
        </form>
      </div>
    </details>
  );
}
