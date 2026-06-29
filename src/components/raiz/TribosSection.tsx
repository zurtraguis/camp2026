const tribos = [
  {
    nome: "Ágape",
    significado: "Amor",
    grego: "ἀγάπη",
    descricao:
      "Amor incondicional que não depende de retribuição. A raiz de tudo o que nasce verdadeiro.",
    cor: "#C8FF50",
    corTexto: "#0b0b0a",
  },
  {
    nome: "Eirene",
    significado: "Paz",
    grego: "εἰρήνη",
    descricao:
      "Paz que ultrapassa o entendimento — inteira, restaurada, sem fratura entre o que você é e o que aparenta.",
    cor: "#A8B92B",
    corTexto: "#0b0b0a",
  },
  {
    nome: "Pistis",
    significado: "Fidelidade",
    grego: "πίστις",
    descricao:
      "Fé que se mantém mesmo quando o solo está seco. A raiz que segura quando o vento força.",
    cor: "#FFD533",
    corTexto: "#0b0b0a",
  },
  {
    nome: "Chara",
    significado: "Alegria",
    grego: "χαρά",
    descricao:
      "Alegria que não é superficial — é fruto de profundidade, não de circunstância.",
    cor: "#9C6B2E",
    corTexto: "#f5f0e8",
  },
] as const;

export function TribosSection() {
  return (
    <section
      id="tribos"
      aria-labelledby="tribos-heading"
      className="bg-surface/30 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-verde-limao">
            Reveladas no sábado
          </p>
          <h2
            id="tribos-heading"
            className="font-display text-4xl text-creme sm:text-5xl"
          >
            AS 4 TRIBOS
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            Baseadas nos frutos do Espírito de Gálatas 5.22-23. Você descobre a
            sua no sábado — e leva pra vida.
          </p>
        </div>

        {/* Tribo cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tribos.map((t) => (
            <article
              key={t.nome}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-transform hover:-translate-y-1"
              aria-label={`Tribo ${t.nome} — ${t.significado}`}
            >
              {/* Color bar */}
              <div
                aria-hidden="true"
                className="h-2 w-full"
                style={{ backgroundColor: t.cor }}
              />

              <div className="flex flex-1 flex-col gap-3 p-6">
                {/* Greek */}
                <p
                  aria-hidden="true"
                  className="font-condensed text-2xl font-bold text-border/40 select-none"
                >
                  {t.grego}
                </p>

                {/* Name + meaning badge */}
                <div>
                  <h3 className="font-display text-3xl text-creme">
                    {t.nome}
                  </h3>
                  <span
                    className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                    style={{ backgroundColor: t.cor, color: t.corTexto }}
                  >
                    {t.significado}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-creme/70">
                  {t.descricao}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Gálatas 5.22-23 — “O fruto do Espírito é: amor, alegria, paz,
          paciência, amabilidade, bondade, fidelidade, mansidão e
          autocontrole.”
        </p>
      </div>
    </section>
  );
}
