const etapas = [
  {
    numero: "01",
    titulo: "Preencha a ficha",
    descricao:
      "Formulário online com dados pessoais, emergência e saúde. Leva poucos minutos.",
    icon: "M7 4h10v4H7z M7 10h10 M7 14h6 M19 13l2 2-5 5-2-2z",
  },
  {
    numero: "02",
    titulo: "Autorização dos pais",
    descricao:
      "Para menores de 18 anos, um responsável legal precisa autorizar.",
    icon: "M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z M12 10v5 M9.5 12.5h5",
  },
  {
    numero: "03",
    titulo: "Pagamento",
    descricao:
      "Cartão ou Pix. Sua vaga é confirmada somente após o pagamento.",
    icon: "M4 7h16v10H4z M4 10h16 M7 15h4",
  },
  {
    numero: "04",
    titulo: "Descubra sua tribo",
    descricao:
      "Perto do acampamento você saberá qual é a sua tribo: Ágape, Eirene, Pistis ou Chara.",
    icon: "M12 3c4 3 6 6 6 10a6 6 0 0 1-12 0c0-4 2-7 6-10z M12 9v8 M8.5 13.5h7",
  },
] as const;

export function ComoFuncionaSection() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-heading"
      className="raiz-section px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="raiz-kicker">Inscrição simples</p>
          <h2
            id="como-heading"
            className="stone-title mt-3 font-display text-6xl leading-none sm:text-8xl"
          >
            Como funciona
          </h2>
        </div>

        <ol className="grid gap-6 lg:grid-cols-4">
          {etapas.map((e) => (
            <li key={e.numero} className="root-card flex min-h-80 flex-col items-center p-7 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-verde-limao/45 bg-verde-limao/10 font-display text-5xl text-verde-limao">
                {e.numero}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-7 h-14 w-14 text-verde-limao"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              >
                <path d={e.icon} />
              </svg>
              <h3 className="mt-6 font-condensed text-2xl font-bold uppercase tracking-wide text-creme">
                {e.titulo}
              </h3>
              <div className="mt-4 h-px w-16 bg-verde-limao/60" />
              <p className="mt-5 text-base leading-relaxed text-creme/75">
                {e.descricao}
              </p>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-12 max-w-3xl border-t border-verde-limao/35 pt-5 text-center font-condensed text-sm font-bold uppercase tracking-[0.28em] text-creme/75">
          Inscrição rápida, segura e 100% online.
        </p>
      </div>
    </section>
  );
}
