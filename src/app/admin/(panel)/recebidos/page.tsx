/**
 * Recebidos — o extrato de onde veio o dinheiro.
 *
 * O dashboard mostra "total em caixa" mas não explica a composição. Aqui cada
 * entrada é uma linha: quem pagou, quanto, quando, por qual meio e quem
 * confirmou. O total desta tela precisa bater com o "em caixa" do dashboard —
 * as duas contam a mesma coisa por caminhos diferentes.
 */

import { requireAdmin } from "@/lib/auth";
import { listarRecebimentos } from "@/lib/recebidos.service";
import { totaisPorOrigem, totalRecebido, ORIGEM_LABEL } from "@/lib/recebidos";
import { formatBRL } from "@/lib/format";
import { Badge, ButtonLink, Callout, Card } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Recebidos" };

const ORIGEM_COR: Record<string, string> = {
  PIX: "border-verde-limao/30 bg-verde-limao/10 text-verde-limao",
  CARTAO: "border-info/30 bg-info/10 text-info",
  DINHEIRO: "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol",
  OUTRO: "border-border bg-surface-2 text-muted",
};

export default async function RecebidosPage() {
  await requireAdmin();
  const linhas = await listarRecebimentos();
  const total = totalRecebido(linhas);
  const porOrigem = totaisPorOrigem(linhas);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-creme">Recebidos</h1>
          <p className="mt-1 text-sm text-muted">
            Cada entrada de dinheiro: quem pagou, quando e por qual meio
          </p>
        </div>
        <ButtonLink href="/admin/export" variant="secondary" size="sm">
          Exportar planilha
        </ButtonLink>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Total recebido
          </p>
          <p className="font-display text-4xl tabular-nums text-verde-limao">
            {formatBRL(total)}
          </p>
          <p className="text-xs text-muted">
            {linhas.length} entrada{linhas.length === 1 ? "" : "s"}
          </p>
        </Card>

        {porOrigem.map((o) => (
          <Card key={o.origem} className="flex flex-col gap-1">
            <p className="text-xs font-condensed uppercase tracking-wide text-muted">
              {ORIGEM_LABEL[o.origem]}
            </p>
            <p className="font-display text-4xl tabular-nums text-creme">
              {formatBRL(o.totalCents)}
            </p>
            <p className="text-xs text-muted">
              {o.qtd} entrada{o.qtd === 1 ? "" : "s"}
            </p>
          </Card>
        ))}
      </section>

      {linhas.length === 0 ? (
        <Callout tone="warning" title="Nada recebido ainda">
          Nenhum pagamento confirmado até agora. Confirme comprovantes em{" "}
          <Link
            href="/admin/em-aberto"
            className="rounded underline hover:text-creme focus-visible:outline-verde-limao"
          >
            Em aberto
          </Link>
          .
        </Callout>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <Th>Quando</Th>
                <Th>Código</Th>
                <Th>Nome</Th>
                <Th>Referente a</Th>
                <Th>Meio</Th>
                <Th>Valor</Th>
                <Th>Confirmado por</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/50">
              {linhas.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-surface-2/80">
                  <Td className="whitespace-nowrap text-muted">
                    {l.em
                      ? l.em.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—"}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-verde-limao">
                      {l.publicCode}
                    </span>
                  </Td>
                  <Td className="text-creme">{l.nome}</Td>
                  <Td className="whitespace-nowrap text-muted">{l.descricao}</Td>
                  <Td>
                    <Badge className={ORIGEM_COR[l.origem] ?? ORIGEM_COR.OUTRO}>
                      {ORIGEM_LABEL[l.origem]}
                    </Badge>
                  </Td>
                  <Td className="tabular-nums font-semibold text-creme">
                    {formatBRL(l.valorCents)}
                  </Td>
                  <Td className="text-muted">
                    {l.confirmadoPor ?? "—"}
                    {l.nota && (
                      <p className="text-[11px] text-muted/80">{l.nota}</p>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        Este total conta o mesmo dinheiro que o &quot;Total em caixa&quot; do
        dashboard — se divergirem, algo está errado. Carnê entra parcela a
        parcela; à vista, de uma vez.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3 text-left text-xs font-condensed uppercase tracking-wide text-muted"
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
}
