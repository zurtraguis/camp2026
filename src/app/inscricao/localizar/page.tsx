import Link from "next/link";
import { Card } from "@/components/ui";
import { FindRegistrationForm } from "./FindRegistrationForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Encontrar Inscrição",
  description:
    "Já se inscreveu no Acampamento RAIZ 2026? Encontre sua inscrição pelo código ou pelo CPF do responsável para acompanhar o pagamento e enviar comprovantes.",
};

export default function LocalizarInscricaoPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen px-4 py-16 text-creme sm:px-6"
    >
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-condensed uppercase tracking-widest text-muted">
            Acampamento RAIZ 2026
          </p>
          <h1 className="font-display text-4xl text-verde-limao">
            Encontre sua inscrição
          </h1>
          <p className="text-sm text-muted">
            Acompanhe o pagamento e envie os comprovantes das parcelas do carnê
            usando o código da inscrição ou o CPF do responsável.
          </p>
        </div>

        <Card className="space-y-4">
          <FindRegistrationForm />
        </Card>

        <p className="text-center text-sm text-muted">
          Ainda não se inscreveu?{" "}
          <Link
            href="/inscricao"
            className="text-verde-limao underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-verde-limao"
          >
            Fazer inscrição →
          </Link>
        </p>
      </div>
    </main>
  );
}
