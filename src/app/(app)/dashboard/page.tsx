import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Painel",
  description: "Painel interno do Acampamento RAIZ 2026.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-creme">RAIZ 2026</h1>
      <p className="text-creme/60">
        Para gerenciar inscrições, tribos, pagamentos e relatórios, acesse o
        painel administrativo.
      </p>
      <div className="rounded-xl border border-border bg-surface p-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 font-condensed text-sm font-semibold uppercase tracking-wide text-verde-limao underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
        >
          Acessar painel admin →
        </Link>
      </div>
    </div>
  );
}
