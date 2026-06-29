const etapas = [
  {
    numero: "01",
    titulo: "Preencha a ficha",
    descricao:
      "Formulário online com dados pessoais, emergências e informações de saúde. Leva menos de 5 minutos.",
  },
  {
    numero: "02",
    titulo: "Autorização dos pais",
    descricao:
      "Um responsável legal assina a autorização digitalmente — obrigatório para menores de 18 anos.",
  },
  {
    numero: "03",
    titulo: "Pagamento (cartão ou Pix)",
    descricao:
      "Pague com cartão de crédito (parcelado) ou Pix. Sua vaga só é confirmada após o pagamento.",
  },
  {
    numero: "04",
    titulo: "Receba sua tribo",
    descricao:
      "No sábado você descobre sua tribo — Ágape, Eirene, Pistis ou Chara — e o acampamento realmente começa.",
  },
] as const;

export function ComoFuncionaSection() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-heading"
      className="bg-[#0b0b0a] px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-verde-limao">
            Inscrição simples
          </p>
          <h2
            id="como-heading"
            className="font-display text-4xl text-creme sm:text-5xl"
          >
            COMO FUNCIONA
          </h2>
        </div>

        {/* Steps */}
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map((e) => (
            <li
              key={e.numero}
              className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
            >
              {/* Step number */}
              <span
                aria-hidden="true"
                className="font-display text-4xl text-verde-limao/30 select-none"
              >
                {e.numero}
              </span>

              <h3 className="font-condensed text-base font-bold uppercase tracking-wide text-creme">
                {e.titulo}
              </h3>
              <p className="text-sm leading-relaxed text-creme/60">
                {e.descricao}
              </p>

              {/* Connector line (hidden on last) */}
              {e.numero !== "04" && (
                <div
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 hidden h-px w-6 bg-border/50 lg:block"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
