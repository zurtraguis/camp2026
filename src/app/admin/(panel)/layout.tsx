/**
 * Layout do painel admin — protegido por requireAdmin().
 *
 * ESTRATÉGIA DE AUTH-GATING (sem loop de redirect):
 *
 *   src/app/admin/
 *   ├── login/           ← rota FORA do route group (panel)
 *   │   └── page.tsx     ← acessível sem auth; não herda este layout
 *   └── (panel)/         ← route group — herda ESTE layout (exige auth)
 *       ├── layout.tsx   ← chama requireAdmin(); redireciona para /admin/login
 *       ├── page.tsx     ← dashboard (/admin)
 *       ├── em-aberto/   ← pagamentos: cobrança, revisão, baixa, troca de forma
 *       ├── recebidos/   ← extrato: de onde veio o dinheiro em caixa
 *       ├── custos/      ← despesas do acampamento + balanço entra × sai
 *       ├── saude/       ← relatório médico (LGPD art. 11, acesso restrito)
 *       ├── pagamentos/  ← só redirect para em-aberto (links antigos)
 *       ├── tribos/
 *       ├── inscricao/[id]/
 *       └── export/
 *
 * O route group (panel) não afeta a URL: /admin/pagamentos continua igual.
 * /admin/login está em admin/login/ (sem o group), portanto não herda
 * este layout e nunca sofre redirect de requireAdmin().
 */

import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui";
import Link from "next/link";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userBase = await requireAdmin();
  // user.role and passwordHash exist post-migration; cast to access safely
  const user = userBase as typeof userBase & { role?: string };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          {/* Wordmark */}
          <Link
            href="/admin"
            className="font-display text-2xl text-verde-limao tracking-widest focus-visible:outline-verde-limao rounded"
            aria-label="Dashboard RAIZ"
          >
            RAIZ
          </Link>

          {/* Nav links */}
          <nav
            aria-label="Menu do painel"
            className="hidden sm:flex items-center gap-1"
          >
            <NavLink href="/admin">Inscrições</NavLink>
            <NavLink href="/admin/tribos">Tribos</NavLink>
            <NavLink href="/admin/em-aberto">Em aberto</NavLink>
            <NavLink href="/admin/recebidos">Recebidos</NavLink>
            <NavLink href="/admin/custos">Custos</NavLink>
            <NavLink href="/admin/intercessao">Intercessão</NavLink>
          <NavLink href="/admin/saude">Saúde</NavLink>
            <NavLink href="/admin/cupons">Cupons</NavLink>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline" aria-label={`Usuário: ${user.name ?? user.email}`}>
              {user.name ?? user.email}
              {user.role === "ADMIN" && (
                <span className="ml-1.5 rounded-full border border-verde-limao/30 bg-verde-limao/10 px-1.5 py-px text-[10px] font-condensed uppercase text-verde-limao">
                  Admin
                </span>
              )}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          aria-label="Menu do painel (mobile)"
          className="flex sm:hidden gap-1 overflow-x-auto border-t border-border px-4 pb-2 pt-1"
        >
          <NavLink href="/admin">Inscrições</NavLink>
          <NavLink href="/admin/tribos">Tribos</NavLink>
          <NavLink href="/admin/em-aberto">Em aberto</NavLink>
          <NavLink href="/admin/recebidos">Recebidos</NavLink>
          <NavLink href="/admin/custos">Custos</NavLink>
          <NavLink href="/admin/intercessao">Intercessão</NavLink>
          <NavLink href="/admin/saude">Saúde</NavLink>
          <NavLink href="/admin/cupons">Cupons</NavLink>
        </nav>
      </header>

      {/* Page content */}
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Acampamento RAIZ 2026 — Painel interno
      </footer>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-condensed text-sm uppercase tracking-wide text-muted transition-colors hover:bg-surface-2 hover:text-creme focus-visible:outline-2 focus-visible:outline-verde-limao"
    >
      {children}
    </Link>
  );
}
