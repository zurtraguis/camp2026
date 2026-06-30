import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-verde-limao/15 bg-[#050504]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="RAIZ 2026 - Página inicial"
          className="font-display text-2xl tracking-[0.18em] text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-verde-limao"
        >
          RAIZ
          <span className="ml-2 text-sm text-creme/70">2026</span>
        </Link>

        <nav aria-label="Navegação principal">
          <ul className="flex items-center gap-1 sm:gap-3">
            <li>
              <Link
                href="#tribos"
                className="hidden px-3 py-2 font-condensed text-sm font-bold uppercase tracking-[0.18em] text-creme/70 transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao sm:inline-flex"
              >
                Tribos
              </Link>
            </li>
            <li>
              <Link
                href="#faq"
                className="hidden px-3 py-2 font-condensed text-sm font-bold uppercase tracking-[0.18em] text-creme/70 transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao md:inline-flex"
              >
                Dúvidas
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
