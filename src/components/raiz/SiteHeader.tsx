import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-[#0b0b0a]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Wordmark */}
        <Link
          href="/"
          aria-label="RAIZ 2026 — Página inicial"
          className="font-display text-xl tracking-widest text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verde-limao"
        >
          RAIZ 2026
        </Link>

        {/* Nav */}
        <nav aria-label="Navegação principal">
          <ul className="flex items-center gap-1 sm:gap-2">
            <li>
              <Link
                href="#sobre"
                className="hidden px-3 py-2 text-sm font-condensed font-semibold uppercase tracking-wide text-creme/70 transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao sm:inline-flex"
              >
                Sobre
              </Link>
            </li>
            <li>
              <Link
                href="#tribos"
                className="hidden px-3 py-2 text-sm font-condensed font-semibold uppercase tracking-wide text-creme/70 transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao sm:inline-flex"
              >
                Tribos
              </Link>
            </li>
            <li>
              <ButtonLink href="/inscricao" size="sm">
                Inscrição
              </ButtonLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
