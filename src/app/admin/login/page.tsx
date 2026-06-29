"use client";

/**
 * Página de login do painel admin.
 * Não fica sob o layout (panel) que exige auth — está em /admin/login (rota
 * independente) e não precisa de requireAdmin(). Ver admin/(panel)/layout.tsx.
 */

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { Button, Card, Field, Input, Callout } from "@/components/ui";

const initialState = { ok: false, message: undefined as string | undefined };

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center p-4"
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="text-center">
          <span className="font-display text-4xl text-verde-limao tracking-widest">
            RAIZ
          </span>
          <p className="mt-1 font-condensed text-muted text-sm uppercase tracking-widest">
            Painel Administrativo
          </p>
        </div>

        <Card>
          <form action={action} className="space-y-5" noValidate>
            <h1 className="font-display text-xl text-creme">
              Entrar no Painel RAIZ
            </h1>

            {state.message && !state.ok && (
              <Callout tone="danger">{state.message}</Callout>
            )}

            <Field label="E-mail" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="admin@raiz.org"
                aria-required="true"
              />
            </Field>

            <Field label="Senha" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                aria-required="true"
              />
            </Field>

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted">
          Acampamento RAIZ 2026 — Acesso restrito a administradores e staff.
        </p>
      </div>
    </main>
  );
}
