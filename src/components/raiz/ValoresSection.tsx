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
      className="bg-surface/30 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-verde-limao">
            Valores e lotes
          </p>
          <h2
            id="valores-heading"
            className="font-display text-4xl text-creme sm:text-5xl"
          >
            QUANTO CUSTA?
          </h2>

          {lote ? (
            /* Dynamic lote from DB */
            <div className="mt-10 rounded-2xl border border-verde-limao/30 bg-surface p-8">
              {lote.soldOut ? (
                <div className="space-y-3">
                  <Badge className="border-danger/40 bg-danger/10 text-danger">
                    Esgotado
                  </Badge>
                  <p className="text-creme/70">
                    Todas as vagas foram preenchidas. Acompanhe nossos canais
                    para a próxima edição.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Badge className="border-verde-limao/40 bg-verde-limao/10 text-verde-limao">
                      {lote.name}
                    </Badge>
                    <Badge>
                      {lote.remainingInLote}{" "}
                      {lote.remainingInLote === 1 ? "vaga" : "vagas"} neste lote
                    </Badge>
                  </div>

                  <p className="font-display text-6xl text-verde-limao">
                    {formatBRL(lote.priceCents)}
                  </p>
                  <p className="text-sm text-muted">
                    Pagamento via cartão (parcelado) ou Pix.
                  </p>

                  <div className="pt-2">
                    <ButtonLink href="/inscricao" size="lg">
                      Garantir minha vaga
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Static fallback */
            <div className="mt-10 rounded-2xl border border-border bg-surface p-8">
              <p className="mb-6 text-sm text-muted">
                As vagas são limitadas e vendidas em lotes — quanto antes, menor
                o valor.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { nome: "1º Lote", valor: "R$ 300", destaque: true },
                  { nome: "2º Lote", valor: "R$ 400", destaque: false },
                  { nome: "3º Lote", valor: "R$ 450", destaque: false },
                ].map((l) => (
                  <div
                    key={l.nome}
                    className={`rounded-xl border p-4 text-center ${
                      l.destaque
                        ? "border-verde-limao/50 bg-verde-limao/5"
                        : "border-border"
                    }`}
                  >
                    <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-muted">
                      {l.nome}
                    </p>
                    <p
                      className={`mt-1 font-display text-3xl ${
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
                  Fazer inscrição
                </ButtonLink>
              </div>

              <p className="mt-4 text-xs text-muted">
                Pagamento por cartão de crédito ou Pix.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
