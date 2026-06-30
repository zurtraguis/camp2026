import { ButtonLink } from "@/components/ui";

export function CTABand() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="raiz-section px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="root-card relative mx-auto max-w-5xl px-6 py-14 text-center sm:px-12 sm:py-16">
        <div className="absolute inset-x-8 top-0 h-px bg-verde-limao shadow-[0_0_28px_rgba(200,255,80,0.9)]" />
        <h2
          id="cta-heading"
          className="stone-title font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.88]"
        >
          Pronto para
          <br />
          plantar <span className="brush-accent">raízes?</span>
        </h2>
        <p className="mx-auto mt-7 max-w-2xl text-xl font-medium text-creme/78">
          Vagas limitadas. Garanta a sua antes que o lote mude.
        </p>

        <div className="mt-8">
          <ButtonLink href="/inscricao" size="lg" className="min-w-72">
            Quero participar
          </ButtonLink>
        </div>

        <p className="mt-8 font-condensed text-xs font-bold uppercase tracking-[0.28em] text-creme/62">
          Transforme seu setembro em algo que vai ficar pra sempre.
        </p>
      </div>
    </section>
  );
}
