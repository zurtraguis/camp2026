import { ButtonLink } from "@/components/ui";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-[#0b0b0a] px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28"
    >
      {/* Decorative background grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Lime glow blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[640px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-verde-limao/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Pre-title badge */}
        <p className="mb-4 font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-verde-limao">
          Acampamento de Adolescentes · 12 a 19 anos
        </p>

        {/* Main headline */}
        <h1
          id="hero-heading"
          className="font-display text-[clamp(5rem,18vw,11rem)] leading-none tracking-tight text-creme"
        >
          RAIZ
          <br />
          <span className="text-verde-limao">2026</span>
        </h1>

        {/* Tagline */}
        <p className="mx-auto mt-6 max-w-xl font-condensed text-xl font-semibold uppercase tracking-widest text-creme/80 sm:text-2xl">
          “Todo fruto revela uma raiz.”
        </p>

        {/* Sub-tagline */}
        <p className="mx-auto mt-4 max-w-lg text-base text-muted sm:text-lg">
          Três dias de imersão, descoberta e identidade — fundamentados em
          Gálatas 5. Sexta a domingo.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/inscricao" size="lg">
            Fazer inscrição
          </ButtonLink>
          <a
            href="#sobre"
            className="inline-flex h-13 items-center px-7 font-condensed text-base font-semibold uppercase tracking-wide text-creme/70 transition-colors hover:text-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
          >
            Saiba mais ↓
          </a>
        </div>
      </div>

      {/* Bottom rule with lime accent */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 h-px w-48 -translate-x-1/2 bg-gradient-to-r from-transparent via-verde-limao/60 to-transparent"
      />
    </section>
  );
}
