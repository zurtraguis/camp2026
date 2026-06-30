"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ArtSection = {
  id: string;
  src: string;
  alt: string;
  ratio: string;
  ctaClass?: string;
  correction?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
  buttonClass: string;
};

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Início", href: "#inicio" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Tribos", href: "#tribos" },
  { label: "Dúvidas", href: "#faq" },
  { label: "Quero me inscrever", href: "/inscricao" },
];

const artSections: ArtSection[] = [
  {
    id: "inicio",
    src: "/raiz-art/home.webp",
    alt: "Arte principal do Acampamento RAIZ 2026",
    ratio: "aspect-[16/9]",
    ctaClass:
      "left-[39%] top-[68%] h-[7.4%] w-[22%] sm:left-[39%] sm:top-[68%]",
  },
  {
    id: "como-funciona",
    src: "/raiz-art/home-2.webp",
    alt: "Arte da seção Como Funciona",
    ratio: "aspect-[16/9]",
  },
  {
    id: "tribos",
    src: "/raiz-art/home-tribos.webp",
    alt: "Arte da seção das quatro tribos",
    ratio: "aspect-[16/9]",
    correction: true,
  },
  {
    id: "faq",
    src: "/raiz-art/home-faq.webp",
    alt: "Arte da seção de perguntas frequentes",
    ratio: "aspect-[16/9]",
  },
  {
    id: "inscricao",
    src: "/raiz-art/home-cta.webp",
    alt: "Arte de chamada para inscrição",
    ratio: "aspect-[16/9]",
    ctaClass: "left-[36.8%] top-[68.4%] h-[8.5%] w-[26.5%]",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "Qual a faixa etária do acampamento?",
    answer:
      "O RAIZ 2026 é para adolescentes de 12 a 19 anos. Menores de 18 anos precisam de autorização do responsável.",
    buttonClass: "left-[19.4%] top-[32.4%] h-[10.2%] w-[61.2%]",
  },
  {
    question: "Preciso de autorização dos pais?",
    answer:
      "Sim. A autorização do responsável legal faz parte da inscrição e é obrigatória para menores de 18 anos.",
    buttonClass: "left-[19.4%] top-[45.1%] h-[10.2%] w-[61.2%]",
  },
  {
    question: "Quais são as formas de pagamento?",
    answer:
      "Você pode pagar com cartão de crédito ou Pix. A vaga só é confirmada após a aprovação do pagamento.",
    buttonClass: "left-[19.4%] top-[57.4%] h-[10.2%] w-[61.2%]",
  },
  {
    question: "O que devo levar?",
    answer:
      "A lista completa será enviada após a confirmação da inscrição, com roupas, higiene pessoal e itens necessários.",
    buttonClass: "left-[19.4%] top-[70%] h-[10.2%] w-[61.2%]",
  },
  {
    question: "Como funciona a segurança e o cuidado no acampamento?",
    answer:
      "A equipe conta com líderes treinados, protocolo de cuidado e comunicação com responsáveis em caso de necessidade.",
    buttonClass: "left-[19.4%] top-[82.4%] h-[10.2%] w-[61.2%]",
  },
];

export function HomeArtExperience() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-black">
      <h1 className="sr-only">Acampamento RAIZ 2026</h1>

      {/* Menu de navegação acionado pelo ícone (3 traços) da arte */}
      <nav
        aria-label="Navegação principal"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[1360px]"
      >
        <div className="relative">
          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu de navegação"}
            aria-expanded={menuOpen}
            aria-controls="home-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="pointer-events-auto absolute right-[2%] top-[2.6vw] flex h-[6.2vw] max-h-16 min-h-11 w-[7vw] min-w-11 max-w-20 items-center justify-center rounded-md focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-verde-limao sm:top-[2.2vw]"
          >
            <span className="sr-only">Menu</span>
          </button>

          {menuOpen && (
            <>
              {/* Fecha o menu ao clicar fora */}
              <button
                type="button"
                aria-label="Fechar menu"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="pointer-events-auto fixed inset-0 h-screen w-screen cursor-default"
              />
              <div
                id="home-nav-menu"
                className="pointer-events-auto absolute right-[2%] top-[8.4vw] w-56 max-w-[80vw] rounded-lg border border-verde-limao/30 bg-[#070706]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.7)] backdrop-blur-md sm:top-20"
              >
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.18em] text-creme transition-colors hover:bg-verde-limao hover:text-[#0b0b0a] focus-visible:bg-verde-limao focus-visible:text-[#0b0b0a] focus-visible:outline-none"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              </div>
            </>
          )}
        </div>
      </nav>

      {artSections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-label={section.alt}
          className="relative mx-auto w-full max-w-[1360px] overflow-hidden bg-black"
        >
          <div className={`relative w-full ${section.ratio}`}>
            <Image
              src={section.src}
              alt={section.alt}
              fill
              priority={section.id === "inicio"}
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {section.correction && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-[27.1%] h-[12.6%] w-[55%] -translate-x-1/2 bg-black"
                />
                <p className="absolute left-1/2 top-[30.3%] w-[54%] -translate-x-1/2 text-center text-[clamp(0.45rem,1.35vw,1.35rem)] leading-tight text-creme">
                  Perto do acampamento você saberá qual é a sua tribo.
                </p>
              </>
            )}

            {section.id === "faq" && (
              <div className="absolute left-1/2 top-[30.5%] z-10 min-h-[60%] w-[63%] -translate-x-1/2 bg-black px-[1.7%] py-[0.9%] shadow-[0_0_44px_rgba(0,0,0,0.94)]">
                {faqItems.map((item, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div key={item.question} className={index > 0 ? "border-t border-verde-limao/20" : ""}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() =>
                          setActiveFaq((current) => (current === index ? null : index))
                        }
                        className="flex w-full items-center justify-between gap-4 py-[2.05%] text-left font-condensed text-[clamp(0.48rem,1.18vw,1.08rem)] font-bold uppercase tracking-[0.22em] text-creme transition-colors hover:text-verde-limao focus-visible:outline-4 focus-visible:outline-verde-limao"
                      >
                        <span>{item.question}</span>
                        <span
                          aria-hidden="true"
                          className="text-verde-limao transition-transform duration-300"
                          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                        >
                          +
                        </span>
                      </button>
                      <div
                        id={`faq-answer-${index}`}
                        data-testid={`faq-answer-${index}`}
                        className="grid transition-[grid-template-rows] duration-500 ease-out"
                        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <p className="pb-[2.1%] pr-[6%] text-[clamp(0.48rem,1.06vw,0.98rem)] leading-snug text-creme/88">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {section.ctaClass && (
              <Link
                href="/inscricao"
                aria-label="Quero participar"
                className={`group absolute z-10 flex items-center justify-center rounded-sm bg-verde-limao/0 font-condensed text-[clamp(0.45rem,1.2vw,1rem)] font-bold uppercase tracking-[0.28em] text-[#0b0b0a] hover:bg-verde-limao focus-visible:bg-verde-limao focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-verde-limao ${section.ctaClass}`}
              >
                <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Quero participar
                </span>
              </Link>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
