import type { Metadata } from "next";
import { HeroSection } from "@/components/raiz/HeroSection";
import { TribosSection } from "@/components/raiz/TribosSection";
import { ComoFuncionaSection } from "@/components/raiz/ComoFuncionaSection";
import { ValoresSection } from "@/components/raiz/ValoresSection";
import { FAQSection } from "@/components/raiz/FAQSection";
import { CTABand } from "@/components/raiz/CTABand";

// A seção de Valores lê o lote ativo; renderiza por requisição.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RAIZ 2026 — Acampamento de Adolescentes",
  description:
    "Três dias de imersão para adolescentes de 12 a 19 anos. Todo fruto revela uma raiz. Baseado em Gálatas 5. Inscreva-se agora.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TribosSection />
      <ComoFuncionaSection />
      <ValoresSection />
      <FAQSection />
      <CTABand />
    </>
  );
}
