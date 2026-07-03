"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, Callout, Field, Input, Badge } from "@/components/ui";
import { findRegistrationAction } from "@/app/inscricao/actions";
import type { FindRegistrationState } from "@/app/inscricao/actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  AWAITING_REVIEW: "Comprovante em análise",
  CONFIRMED: "Confirmada",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? "Buscando…" : "Encontrar inscrição"}
    </Button>
  );
}

export function FindRegistrationForm() {
  const [state, action] = useActionState<FindRegistrationState, FormData>(
    findRegistrationAction,
    { ok: false },
  );

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4" aria-describedby="find-hint">
        <Field
          label="Código da inscrição ou CPF do responsável"
          htmlFor="query"
          hint="Ex.: RAIZ-UVJW47 — ou o CPF (só números) usado na inscrição"
          error={!state.ok && state.message ? state.message : undefined}
        >
          <Input
            id="query"
            name="query"
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={20}
            required
            aria-required="true"
            placeholder="RAIZ-XXXXXX ou 000.000.000-00"
          />
        </Field>
        <SubmitButton />
      </form>

      {/* Mais de uma inscrição no mesmo CPF (irmãos): lista para escolher. */}
      {state.ok && state.matches && state.matches.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          <Callout tone="success" title="Encontramos mais de uma inscrição">
            Este CPF é responsável por {state.matches.length} inscrições.
            Escolha abaixo qual deseja abrir.
          </Callout>
          <ul className="space-y-2">
            {state.matches.map((m) => (
              <li key={m.publicCode}>
                <Link
                  href={`/inscricao/${m.publicCode}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 transition-colors hover:border-verde-limao/50 focus-visible:outline-2 focus-visible:outline-verde-limao"
                >
                  <span className="space-y-0.5">
                    <span className="block font-semibold text-creme">{m.fullName}</span>
                    <span className="block font-mono text-xs text-muted">{m.publicCode}</span>
                  </span>
                  <Badge>{STATUS_LABELS[m.status] ?? m.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
