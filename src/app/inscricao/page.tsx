import Link from "next/link";
import { getActiveLote, type ActiveLote } from "@/lib/lote.service";
import { env } from "@/lib/env";
import { Callout } from "@/components/ui";
import { RegistrationArtShell } from "./RegistrationArtShell";
import { RegistrationForm } from "./RegistrationForm";

async function loadLote(): Promise<{ lote: ActiveLote | null; dbDown: boolean }> {
  try {
    return { lote: await getActiveLote(), dbDown: false };
  } catch {
    if (process.env.NODE_ENV === "production") return { lote: null, dbDown: true };
    return {
      lote: {
        id: "dev",
        name: "1º Lote (exemplo)",
        order: 1,
        priceCents: 30000,
        remainingInLote: 80,
        totalRemaining: 240,
        soldOut: false,
      },
      dbDown: true,
    };
  }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inscrição",
  description:
    "Garanta sua vaga no Acampamento RAIZ 2026. Três dias de imersão para adolescentes de 12 a 19 anos.",
};

export default async function InscricaoPage() {
  const { lote, dbDown } = await loadLote();

  return (
    <RegistrationArtShell>
      <Link
        href="/inscricao/localizar"
        className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-verde-limao/60 bg-verde-limao/10 px-4 py-3 text-center font-condensed text-sm font-bold uppercase tracking-[0.14em] text-verde-limao transition-colors hover:bg-verde-limao hover:text-[#0b0b0a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-limao"
      >
        Já se inscreveu? Acompanhe pelo código ou CPF →
      </Link>

      {!lote && (
        <Callout tone="warning" title="Inscrições indisponíveis">
          As inscrições ainda não foram abertas. Volte em breve!
        </Callout>
      )}

      {lote?.soldOut && (
        <Callout tone="danger" title="Inscrições esgotadas">
          Todas as vagas foram preenchidas. Obrigado pelo interesse no RAIZ 2026!
        </Callout>
      )}

      {lote && !lote.soldOut && (
        <>
          {dbDown && (
            <div className="mb-6">
              <Callout tone="warning" title="Modo de desenvolvimento">
                Banco de dados não conectado. Exibindo um lote de exemplo. O
                envio só funcionará após configurar o Supabase.
              </Callout>
            </div>
          )}

          <RegistrationForm
            priceCents={lote.priceCents}
            loteName={lote.name}
            cardOnlineEnabled={env.NEXT_PUBLIC_CARD_ONLINE_ENABLED}
          />
        </>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Já se inscreveu?{" "}
        <Link
          href="/inscricao/localizar"
          className="text-verde-limao underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-verde-limao"
        >
          Encontre sua inscrição pelo código ou CPF →
        </Link>
      </p>
    </RegistrationArtShell>
  );
}
