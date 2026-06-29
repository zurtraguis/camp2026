const perguntas = [
  {
    pergunta: "Qual a faixa etária do acampamento?",
    resposta:
      "O RAIZ 2026 é para adolescentes de 12 a 19 anos. É obrigatório ter ao menos 12 anos completos na data do evento. Jovens com 18 ou 19 anos participam normalmente — a autorização dos pais só é obrigatória para menores de 18.",
  },
  {
    pergunta: "Preciso de autorização dos pais?",
    resposta:
      "Sim, para menores de 18 anos a autorização de um responsável legal é obrigatória e faz parte do processo de inscrição. O formulário envia um link de assinatura digital ao responsável — simples e sem papel.",
  },
  {
    pergunta: "Quais são as formas de pagamento?",
    resposta:
      "Aceitamos cartão de crédito (parcelado em até 3x sem juros) e Pix. A vaga só é confirmada após o pagamento. Em caso de cancelamento antecipado (até 15 dias antes), realizamos reembolso integral.",
  },
  {
    pergunta: "O que devo levar?",
    resposta:
      "Roupas para 3 dias (incluindo roupa de dormir e tênis fechado), itens de higiene pessoal, remédios de uso contínuo informados na ficha, bíblia (opcional), e muita disposição. A lista completa é enviada após a confirmação da inscrição.",
  },
  {
    pergunta: "Como funciona a segurança e o cuidado no acampamento?",
    resposta:
      "A equipe é formada por líderes treinados e maiores de 21 anos. Há um protocolo de primeiros socorros ativo e comunicação de emergência com responsáveis. Informações médicas declaradas na ficha são confidenciais e acessadas apenas pela coordenação.",
  },
] as const;

export function FAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="bg-[#0b0b0a] px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-verde-limao">
            Perguntas frequentes
          </p>
          <h2
            id="faq-heading"
            className="font-display text-4xl text-creme sm:text-5xl"
          >
            DÚVIDAS?
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {perguntas.map((p) => (
            <details
              key={p.pergunta}
              className="group rounded-xl border border-border bg-surface open:border-verde-limao/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-condensed text-sm font-semibold uppercase tracking-wide text-creme transition-colors hover:text-verde-limao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao">
                <span>{p.pergunta}</span>
                {/* Chevron icon */}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-6 pb-5 pt-1 text-sm leading-relaxed text-creme/70">
                {p.resposta}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
