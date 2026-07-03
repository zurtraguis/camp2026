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
    </RegistrationArtShell>
  );
}
