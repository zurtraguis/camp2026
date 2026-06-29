import { ButtonLink } from "@/components/ui";

export function CTABand() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden bg-verde-limao px-4 py-16 sm:px-6 sm:py-20"
    >
      {/* Texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <h2
          id="cta-heading"
          className="font-display text-4xl text-[#0b0b0a] sm:text-5xl"
        >
          PRONTO PARA<br />PLANTAR RAÍZES?
        </h2>
        <p className="mt-4 text-base font-medium text-[#0b0b0a]/70">
          Vagas limitadas. Garanta a sua antes que o lote mude.
        </p>

        <div className="mt-8">
          <ButtonLink
            href="/inscricao"
            size="lg"
            className="bg-[#0b0b0a] text-verde-limao hover:bg-[#1a1a18]"
          >
            Fazer inscrição agora
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
