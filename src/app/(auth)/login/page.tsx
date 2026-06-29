import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta do Acampamento RAIZ 2026.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="font-display text-3xl text-creme">RAIZ 2026</h1>
        <p className="mt-2 text-sm text-muted">
          A inscrição para o acampamento é feita diretamente pelo formulário
          abaixo — não é necessário criar conta.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-8 space-y-4">
        <p className="text-sm text-creme/70">
          Para se inscrever no acampamento, acesse a página de inscrições.
        </p>
        <ButtonLink href="/inscricao" size="md">
          Fazer inscrição
        </ButtonLink>
      </div>
    </div>
  );
}
