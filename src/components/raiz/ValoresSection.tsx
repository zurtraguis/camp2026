import { ButtonLink, Badge } from "@/components/ui";
import { getActiveLote, type ActiveLote } from "@/lib/lote.service";
import { formatBRL } from "@/lib/format";

async function fetchLote(): Promise<ActiveLote | null> {
  try {
    return await getActiveLote();
  } catch {
    return null;
  }
}

export async function ValoresSection() {
  const lote = await fetchLote();

  return (
    <section
      id="valores"
      aria-labelledby="valores-heading"
      className="raiz-section px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p className="raiz-kicker">Valores e lotes</p>
          <h2
            id="valores-heading"
            className="stone-title mt-3 font-display text-6xl leading-none sm:text-8xl"
          >
            Quanto custa?
          </h2>
        </div>

        {lote ? (
          <div className="root-card mx-auto mt-10 max-w-3xl p-8 text-center sm:p-10">
            {lote.soldOut ? (
              <div className="space-y-4">
                <Badge className="border-danger/40 bg-danger/10 text-danger">
                  Esgotado
                </Badge>
                <p className="text-creme/75">
                  Todas as vagas foram preenchidas. Acompanhe nossos canais para
                  a próxima edição.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge className="border-verde-limao/45 bg-verde-limao/10 text-verde-limao">
                    {lote.name}
                  </Badge>
                  <Badge>
                    {lote.remainingInLote}{" "}
                    {lote.remainingInLote === 1 ? "vaga" : "vagas"} neste lote
                  </Badge>
                </div>

                <p className="font-display text-[clamp(4rem,11vw,8rem)] leading-none text-verde-limao">
                  {formatBRL(lote.priceCents)}
                </p>
                <p className="text-base text-creme/70">
                  Pagamento via cartão de crédito ou Pix. Vagas limitadas.
                </p>

                <ButtonLink href="/inscricao" size="lg">
                  Garantir minha vaga
                </ButtonLink>
              </div>
            )}
          </div>
        ) : (
          <div className="root-card mx-auto mt-10 max-w-4xl p-8 text-center sm:p-10">
            <p className="mb-8 text-base text-creme/70">
              As vagas são limitadas e vendidas em lotes. Quanto antes, menor o
              valor.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { nome: "1º Lote", valor: "R$ 300", destaque: true },
                { nome: "2º Lote", valor: "R$ 400", destaque: false },
                { nome: "3º Lote", valor: "R$ 450", destaque: false },
              ].map((l) => (
                <div
                  key={l.nome}
                  className={`rounded-sm border p-5 text-center ${
                    l.destaque
                      ? "border-verde-limao/60 bg-verde-limao/10"
                      : "border-verde-limao/20 bg-[#0b0b0a]/35"
                  }`}
                >
                  <p className="font-condensed text-xs font-bold uppercase tracking-[0.3em] text-creme/60">
                    {l.nome}
                  </p>
                  <p
                    className={`mt-2 font-display text-4xl ${
                      l.destaque ? "text-verde-limao" : "text-creme"
                    }`}
                  >
                    {l.valor}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <ButtonLink href="/inscricao" size="lg">
                Quero participar
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
