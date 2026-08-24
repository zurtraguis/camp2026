const tribos = [
  {
    nome: "Ágape",
    significado: "Amor",
    descricao:
      "Amor incondicional que não depende de retribuição. A raiz de tudo o que nasce verdadeiro.",
    cor: "#C8FF50",
    icon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z M12 13v7 M8 16h8",
  },
  {
    nome: "Eirene",
    significado: "Paz",
    descricao:
      "Paz que ultrapassa o entendimento, inteira e restaurada entre o que você é e o que aparenta.",
    cor: "#A8B92B",
    icon: "M12 3c2.8 2 5 4.7 5 8.5 0 5-5 8.5-5 8.5s-5-3.5-5-8.5C7 7.7 9.2 5 12 3z M12 9v11 M8.5 13.5h7",
  },
  {
    nome: "Chara",
    significado: "Alegria",
    descricao:
      "Alegria que não é superficial. É fruto de profundidade, não de circunstância.",
    cor: "#9C6B2E",
    icon: "M12 21V9 M12 9c-4 0-6-2-7-5 4 0 7 2 7 5z M12 9c4 0 6-2 7-5-4 0-7 2-7 5z",
  },
] as const;

export function TribosSection() {
  return (
    <section
      id="tribos"
      aria-labelledby="tribos-heading"
      className="raiz-section px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="raiz-kicker">Serão reveladas perto do acamp</p>
          <h2
            id="tribos-heading"
            className="stone-title mt-3 font-display text-6xl leading-none sm:text-8xl"
          >
            As <span className="brush-accent">3</span> tribos
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-creme/78">
            Baseadas nos frutos do Espírito de Gálatas 5.22-23. Cada tribo
            carrega uma marca para viver durante o acampamento.
          </p>
        </div>

        {/* 3 cards: uma linha só a partir de md — sem card órfão numa 2ª linha. */}
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {tribos.map((t) => (
            <article
              key={t.nome}
              className="root-card group flex min-h-[27rem] flex-col items-center overflow-hidden p-7 text-center transition-transform hover:-translate-y-1"
              aria-label={`Tribo ${t.nome} - ${t.significado}`}
              style={{ borderColor: `${t.cor}66` }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-2"
                style={{ backgroundColor: t.cor }}
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-7 h-24 w-24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.45"
                style={{ color: t.cor }}
              >
                <path d={t.icon} />
              </svg>
              <h3 className="stone-title mt-8 font-display text-5xl leading-none">
                {t.nome}
              </h3>
              <span
                className="mt-3 rounded-sm px-4 py-1 font-condensed text-lg font-bold uppercase tracking-wide text-[#0b0b0a]"
                style={{ backgroundColor: t.cor }}
              >
                {t.significado}
              </span>
              <p className="mt-7 text-base leading-relaxed text-creme/78">
                {t.descricao}
              </p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-4xl text-center text-sm leading-relaxed text-creme/65">
          Gálatas 5.22-23 - &quot;O fruto do Espírito é: amor, alegria, paz,
          paciência, amabilidade, bondade, fidelidade, mansidão e autocontrole.&quot;
        </p>
      </div>
    </section>
  );
}
