import type { Metadata } from "next";
import { HomeArtExperience } from "@/components/raiz/HomeArtExperience";

export const metadata: Metadata = {
  title: "RAIZ 2026 — Acampamento de Adolescentes",
  description:
    "Acampamento RAIZ 2026. Todo fruto revela uma raiz. Inscreva-se para participar.",
};

export default function HomePage() {
  return <HomeArtExperience />;
}
