import { ButtonLink } from "@/components/ui";

const bases = [
  "Gálatas 5:16-25",
  "Gálatas 6:7-9",
  "Marcos 4:3-20",
  "João 12:24",
  "Ezequiel 36:26",
  "Lucas 6:43-45",
] as const;

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="raiz-section min-h-[calc(100svh-65px)] px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_at_center,rgba(92,61,31,0.78),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#d8c28b]/10 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center text-center">
        <p className="raiz-kicker">Acampamento Rocket 2026</p>

        <h1
          id="hero-heading"
          className="stone-title mt-5 font-display text-[clamp(5.5rem,20vw,15rem)] leading-[0.78] tracking-wide"
        >
          RAIZ
        </h1>

        <p className="mt-7 max-w-3xl font-condensed text-[clamp(1.75rem,4.5vw,4rem)] font-bold uppercase leading-none tracking-wide text-creme">
          Todo fruto revela uma{" "}
          <span className="brush-accent italic">raiz</span>
        </p>

        <div className="mt-8">
          <p className="font-display text-4xl tracking-[0.35em] text-verde-limao sm:text-5xl">
            25 · 26 · 27
          </p>
          <p className="mt-1 font-condensed text-sm font-bold uppercase tracking-[0.55em] text-creme/80">
            de setembro
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <ButtonLink href="/inscricao" size="lg" className="min-w-72">
            Quero participar
          </ButtonLink>
          <p className="font-condensed text-xs font-bold uppercase tracking-[0.36em] text-creme/70">
            O restante será revelado no tempo certo.
          </p>
        </div>

        <div className="mt-14 w-full max-w-5xl">
          <p className="font-condensed text-sm font-bold uppercase tracking-[0.35em] text-verde-limao">
            Base bíblica
          </p>
          <ul className="mt-5 grid gap-3 text-center font-condensed text-xs font-semibold uppercase tracking-[0.28em] text-creme/75 sm:grid-cols-2 lg:grid-cols-6">
            {bases.map((base) => (
              <li
                key={base}
                className="border-l border-verde-limao/45 px-3 first:border-l-0"
              >
                {base}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
