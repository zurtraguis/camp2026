import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Inscrição",
  description: "Inscreva-se no Acampamento RAIZ 2026.",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="font-display text-3xl text-creme">RAIZ 2026</h1>
        <p className="mt-2 text-sm text-muted">
          O processo de inscrição é simples e não requer criação de conta.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-8 space-y-4">
        <p className="text-sm text-creme/70">
          Preencha a ficha de inscrição, obtenha autorização dos responsáveis e
          realize o pagamento — tudo em um só lugar.
        </p>
        <ButtonLink href="/inscricao" size="md">
          Ir para inscrições
        </ButtonLink>
      </div>
    </div>
  );
}
