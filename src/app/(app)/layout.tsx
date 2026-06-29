import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/dal";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defesa em profundidade: a autorização não depende só do middleware (CVE-2025-29927).
  // Redireciona para /login enquanto não há sessão (fail-closed).
  await requireUser();

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-64 border-r border-foreground/10 bg-background lg:block"
        aria-label="Navegação da aplicação"
      >
        <div className="p-6">
          <span className="text-lg font-semibold">Dashboard</span>
        </div>
        <nav className="space-y-1 px-3" aria-label="Seções">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
          >
            Overview
          </Link>
          <Link
            href="/settings"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
          >
            Settings
          </Link>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="border-b border-foreground/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/70">Painel</span>
          </div>
        </header>
        <main id="main-content" className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
