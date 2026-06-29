import { getActiveLote, type ActiveLote } from "@/lib/lote.service";
import { formatBRL } from "@/lib/format";
import { Callout } from "@/components/ui";
import { RegistrationForm } from "./RegistrationForm";

/**
 * Lê o lote ativo. Se o banco estiver indisponível, em produção mostramos um
 * aviso; em desenvolvimento caímos num lote de exemplo para permitir testar a
 * UI do formulário sem banco configurado.
 */
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

// Lê o lote ativo do banco a cada requisição (preço/vagas em tempo real).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inscrição",
  description:
    "Garanta sua vaga no Acampamento RAIZ 2026. Três dias de imersão para adolescentes de 12 a 19 anos.",
};

export default async function InscricaoPage() {
  const { lote, dbDown } = await loadLote();

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-12">
      {/* Cabeçalho */}
      <header className="mb-10 text-center">
        <p className="mb-2 text-xs font-condensed uppercase tracking-widest text-verde-folha">
          Acampamento
        </p>
        <h1 className="font-display text-5xl text-creme sm:text-6xl">RAIZ 2026</h1>
        <p className="mt-3 text-sm text-muted">
          Todo fruto revela uma raiz — 3 dias · 12 a 19 anos
        </p>
      </header>

      {/* Sem lote configurado */}
      {!lote && (
        <Callout tone="warning" title="Inscrições indisponíveis">
          As inscrições ainda não foram abertas. Volte em breve!
        </Callout>
      )}

      {/* Esgotado */}
      {lote?.soldOut && (
        <Callout tone="danger" title="Inscrições esgotadas">
          Todas as vagas foram preenchidas. Obrigado pelo interesse no RAIZ 2026!
        </Callout>
      )}

      {/* Lote ativo */}
      {lote && !lote.soldOut && (
        <>
          {dbDown && (
            <div className="mb-6">
              <Callout tone="warning" title="Modo de desenvolvimento">
                Banco de dados não conectado — exibindo um lote de exemplo. O
                envio só funcionará após configurar o Supabase.
              </Callout>
            </div>
          )}
          {/* Banner do lote */}
          <div className="mb-8 rounded-2xl border border-verde-limao/30 bg-verde-limao/5 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-condensed uppercase tracking-widest text-verde-folha">
                  {lote.name}
                </span>
                <p className="font-display text-3xl text-verde-limao">
                  {formatBRL(lote.priceCents)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">
                  <span className="font-semibold text-amarelo-sol">
                    {lote.remainingInLote}
                  </span>{" "}
                  {lote.remainingInLote === 1 ? "vaga restante" : "vagas restantes"}{" "}
                  neste lote
                </p>
                <p className="text-xs text-muted/70">
                  {lote.totalRemaining} no total
                </p>
              </div>
            </div>
          </div>

          <RegistrationForm
            priceCents={lote.priceCents}
            loteName={lote.name}
          />
        </>
      )}
    </main>
  );
}
