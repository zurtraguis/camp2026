import { Card } from "@/components/ui";

const dias = [
  {
    dia: "Sexta",
    titulo: "A semente e o solo",
    descricao:
      "De onde viemos? Qual o terreno que formou quem somos? No primeiro dia, exploramos raízes — família, história e identidade — e entendemos que o solo importa tanto quanto a semente.",
    acento: "border-verde-folha/50",
    numero: "01",
  },
  {
    dia: "Sábado",
    titulo: "O que você alimenta",
    descricao:
      "O que regamos cresce. No segundo dia, olhamos para os hábitos, relacionamentos e escolhas que nutrem — ou sufocam — o fruto que queremos dar. As tribos são reveladas.",
    acento: "border-verde-limao/60",
    numero: "02",
  },
  {
    dia: "Domingo",
    titulo: "A semente precisa morrer",
    descricao:
      "Nenhuma semente vira árvore sem se transformar. No último dia, entendemos que morte e ressurreição não são o fim — são o começo do fruto. Gálatas 5 na prática.",
    acento: "border-amarelo-sol/50",
    numero: "03",
  },
] as const;

export function SobreSection() {
  return (
    <section
      id="sobre"
      aria-labelledby="sobre-heading"
      className="bg-[#0b0b0a] px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-verde-limao">
            A jornada
          </p>
          <h2
            id="sobre-heading"
            className="font-display text-4xl text-creme sm:text-5xl"
          >
            TRÊS DIAS,<br />
            <span className="text-verde-limao">UMA RAIZ.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            Cada dia tem um movimento intencional. Juntos, eles formam uma
            jornada que vai da origem à transformação.
          </p>
        </div>

        {/* Day cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {dias.map((d) => (
            <Card
              key={d.numero}
              className={`relative border-t-2 ${d.acento} flex flex-col gap-4`}
            >
              <span
                aria-hidden="true"
                className="font-display text-5xl text-border/30 select-none"
              >
                {d.numero}
              </span>
              <div>
                <p className="mb-1 font-condensed text-xs font-semibold uppercase tracking-widest text-muted">
                  {d.dia}
                </p>
                <h3 className="font-condensed text-lg font-bold uppercase text-creme">
                  {d.titulo}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-creme/70">
                {d.descricao}
              </p>
            </Card>
          ))}
        </div>

        {/* Scripture anchor */}
        <p className="mt-10 text-center font-condensed text-sm font-semibold uppercase tracking-widest text-muted">
          Base bíblica: Gálatas 5
        </p>
      </div>
    </section>
  );
}
