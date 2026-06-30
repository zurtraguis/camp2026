import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-verde-limao/15 bg-[#050504] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-display text-3xl tracking-[0.18em] text-verde-limao">
            RAIZ <span className="text-creme/70">2026</span>
          </p>

          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            Todo fruto revela uma raiz - Gálatas 5
          </p>

          <div className="h-px w-24 bg-verde-limao/35" />

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>{new Date().getFullYear()} Acampamento RAIZ</span>
            <span aria-hidden="true">·</span>
            <Link
              href="/inscricao"
              className="underline underline-offset-2 transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
            >
              Inscrições
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/admin"
              className="transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
