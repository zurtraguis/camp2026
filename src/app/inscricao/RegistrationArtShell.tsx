import type { ReactNode } from "react";

export function RegistrationArtShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      data-testid="registration-art-shell"
      className="registration-scene relative min-h-screen overflow-hidden px-4 pb-12 pt-[15.25rem] text-creme sm:px-6 sm:pb-14 sm:pt-[16.8rem] lg:pt-[18.5rem]"
    >
      <div
        aria-hidden="true"
        data-testid="registration-header-art"
        className="registration-header-art absolute inset-x-0 top-0 h-[22rem] sm:h-[24rem] lg:h-[26rem]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center">
        <section
          data-testid="registration-panel"
          className="root-card registration-panel w-full max-w-[69rem] px-5 py-8 sm:px-9 sm:py-10 lg:min-h-[58.75rem] lg:px-10"
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
