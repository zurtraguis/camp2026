const perguntas = [
  {
    pergunta: "Qual a faixa etária do acampamento?",
    resposta:
      "O RAIZ 2026 é para adolescentes de 12 a 19 anos. Jovens com 18 ou 19 anos participam normalmente; a autorização dos pais é obrigatória apenas para menores de 18.",
  },
  {
    pergunta: "Preciso de autorização dos pais?",
    resposta:
      "Sim, para menores de 18 anos a autorização de um responsável legal é obrigatória e faz parte do processo de inscrição.",
  },
  {
    pergunta: "Quais são as formas de pagamento?",
    resposta:
      "Aceitamos cartão de crédito e Pix. A vaga só é confirmada após o pagamento.",
  },
  {
    pergunta: "O que devo levar?",
    resposta:
      "A lista completa será enviada após a confirmação da inscrição. Leve roupas para o período, itens de higiene pessoal, remédios de uso contínuo informados na ficha e disposição para viver o acampamento.",
  },
  {
    pergunta: "Como funciona a segurança e o cuidado no acampamento?",
    resposta:
      "A equipe é formada por líderes treinados. Há protocolo de primeiros socorros e comunicação de emergência com responsáveis.",
  },
] as const;

export function FAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="raiz-section px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="raiz-kicker">Perguntas frequentes</p>
          <h2
            id="faq-heading"
            className="stone-title mt-3 font-display text-7xl leading-none sm:text-9xl"
          >
            Dúvidas?
          </h2>
        </div>

        <div className="space-y-4">
          {perguntas.map((p) => (
            <details
              key={p.pergunta}
              className="root-card group overflow-hidden open:border-verde-limao/45"
            >
              <summary className="flex cursor-pointer list-none items-center gap-5 px-5 py-5 font-condensed text-lg font-bold uppercase tracking-[0.12em] text-creme transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao sm:px-7">
                <span className="text-3xl leading-none text-verde-limao">+</span>
                <span className="flex-1">{p.pergunta}</span>
                <svg
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full border border-verde-limao/50 p-1.5 text-verde-limao transition-transform group-open:rotate-180"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-5 pb-6 pl-[4.25rem] text-base leading-relaxed text-creme/72 sm:px-7 sm:pl-[5.25rem]">
                {p.resposta}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
