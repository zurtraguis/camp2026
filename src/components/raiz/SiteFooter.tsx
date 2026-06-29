import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/30 bg-[#0b0b0a] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Wordmark */}
          <p className="font-display text-2xl tracking-widest text-verde-limao">
            RAIZ 2026
          </p>

          {/* Tagline */}
          <p className="text-sm text-muted italic">
            “Todo fruto revela uma raiz.” — Gálatas 5
          </p>

          {/* Divider */}
          <div className="h-px w-16 bg-border/40" />

          {/* Links + year */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>© {new Date().getFullYear()} Acampamento RAIZ</span>
            <span aria-hidden="true">·</span>
            <Link
              href="/inscricao"
              className="underline underline-offset-2 transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
            >
              Inscrições
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/admin"
              className="transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
