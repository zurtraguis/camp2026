import type { ReactNode } from "react";

export function RegistrationArtShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      data-testid="registration-art-shell"
      className="registration-scene relative min-h-screen overflow-hidden px-4 pb-12 pt-[min(48vw,26rem)] text-creme sm:px-6 sm:pb-14"
    >
      {/* Mantido para compatibilidade; o cabeçalho (RAIZ + tagline) agora vem da
          própria arte de fundo (forms-bg.webp), por isso não renderizamos texto
          aqui — evita duplicar o que já está na imagem. */}
      <div
        aria-hidden="true"
        data-testid="registration-header-art"
        className="registration-header-art pointer-events-none absolute inset-x-0 top-0 h-px"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center">
        <section
          data-testid="registration-panel"
          className="root-card registration-panel w-full max-w-[46rem] px-5 py-7 sm:px-8 sm:py-9"
        >
          {children}
        </section>

        <footer className="mt-8 flex items-center justify-center gap-4 font-condensed text-sm tracking-[0.2em] text-creme/70">
          <span>20</span>
          <span className="stone-title font-display text-5xl leading-none">R</span>
          <span>26</span>
        </footer>
      </div>
    </main>
  );
}
