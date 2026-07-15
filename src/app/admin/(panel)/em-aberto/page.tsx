/**
 * Cobrança — quem ainda deve, quanto, e há quantos dias.
 *
 * Complementa /admin/pagamentos: lá é a fila de REVISÃO (só o que tem
 * comprovante esperando decisão); aqui é o que está EM ABERTO (o dinheiro que
 * ainda não entrou), com ou sem comprovante enviado.
 */

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatPhone } from "@/lib/format";
import { saldoDoPagamento, ordenarPorUrgencia } from "@/lib/cobranca";
import { Badge, Callout, Card } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Em aberto" };

export default async function EmAbertoPage() {
  await requireAdmin();
  const hoje = new Date();

  const registrations = await db.registration.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      payment: { include: { installments: { orderBy: { number: "asc" } } } },
      guardian: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const linhas = ordenarPorUrgencia(
    registrations
      .filter((r) => r.payment !== null)
      .map((r) => ({ reg: r, saldo: saldoDoPagamento(r.payment!, hoje) }))
      .filter((l) => !l.saldo.quitado),
  );

  const totalAberto = linhas.reduce((s, l) => s + l.saldo.abertoCents, 0);
  const totalVencido = linhas
    .filter((l) => l.saldo.diasAtraso > 0)
    .reduce((s, l) => s + l.saldo.abertoCents, 0);
  const emRevisao = linhas.filter((l) => l.saldo.emRevisao > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Em aberto</h1>
        <p className="mt-1 text-sm text-muted">
          Inscrições com saldo devedor — mais atrasadas primeiro
        </p>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Total em aberto
          </p>
          <p className="font-display text-4xl tabular-nums text-amarelo-sol">
            {formatBRL(totalAberto)}
          </p>
          <p className="text-xs text-muted">
            {linhas.length} inscriç{linhas.length === 1 ? "ão" : "ões"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Vencido
          </p>
          <p className="font-display text-4xl tabular-nums text-danger">
            {formatBRL(totalVencido)}
          </p>
          <p className="text-xs text-muted">Parcela com vencimento passado</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Esperando você
          </p>
          <p className="font-display text-4xl tabular-nums text-info">{emRevisao}</p>
          <p className="text-xs text-muted">
            {emRevisao === 1 ? "Comprovante enviado" : "Comprovantes enviados"} —{" "}
            <Link
              href="/admin/pagamentos"
              className="text-info underline hover:no-underline focus-visible:outline-verde-limao rounded"
            >
              revisar
            </Link>
          </p>
        </Card>
      </section>

      {linhas.length === 0 ? (
        <Callout tone="success" title="Tudo quitado">
          Nenhuma inscrição ativa com saldo em aberto.
        </Callout>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <Th>Código</Th>
                <Th>Nome</Th>
                <Th>Contato</Th>
                <Th>Forma</Th>
                <Th>Pago</Th>
                <Th>Em aberto</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/50">
              {linhas.map(({ reg, saldo }) => {
                const telefone = reg.guardian?.phone ?? reg.phone;
                return (
                  <tr key={reg.id} className="transition-colors hover:bg-surface-2/80">
                    <Td>
                      <Link
                        href={`/admin/inscricao/${reg.id}`}
                        className="rounded font-mono text-xs text-verde-limao hover:underline focus-visible:outline-verde-limao"
                      >
                        {reg.publicCode}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/inscricao/${reg.id}`}
                        className="rounded text-creme transition-colors hover:text-verde-limao focus-visible:outline-verde-limao"
                      >
                        {reg.fullName}
                      </Link>
                    </Td>
                    <Td>
                      {telefone ? (
                        <a
                          href={`tel:${telefone.replace(/\D/g, "")}`}
                          className="rounded tabular-nums text-creme hover:text-verde-limao focus-visible:outline-verde-limao"
                        >
                          {formatPhone(telefone)}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {reg.guardian?.name && (
                        <p className="text-xs text-muted">{reg.guardian.name}</p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {saldo.carne
                        ? `Carnê ${reg.payment!.installmentsTotal ?? reg.payment!.installments.length}x`
                        : "À vista"}
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {formatBRL(saldo.pagoCents)}
                      <span className="text-xs text-muted">
                        {" "}
                        / {formatBRL(saldo.totalCents)}
                      </span>
                    </Td>
                    <Td className="tabular-nums font-semibold text-creme">
                      {formatBRL(saldo.abertoCents)}
                    </Td>
                    <Td>
                      <SituacaoBadge saldo={saldo} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        &quot;Em aberto&quot; é o que ainda não entrou em caixa. Um comprovante
        enviado só abate o saldo depois de aprovado em{" "}
        <Link
          href="/admin/pagamentos"
          className="rounded underline hover:text-creme focus-visible:outline-verde-limao"
        >
          Pagamentos
        </Link>
        .
      </p>
    </div>
  );
}

/** Atraso manda na cor; comprovante na fila aparece junto, não no lugar. */
function SituacaoBadge({
  saldo,
}: {
  saldo: { diasAtraso: number; vencidas: number; emRevisao: number };
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      {saldo.diasAtraso > 0 ? (
        <Badge className="border-danger/30 bg-danger/10 text-danger">
          {saldo.vencidas} vencida{saldo.vencidas === 1 ? "" : "s"} · {saldo.diasAtraso}{" "}
          dia{saldo.diasAtraso === 1 ? "" : "s"}
        </Badge>
      ) : (
        <Badge className="border-border bg-surface-2 text-muted">Em dia</Badge>
      )}
      {saldo.emRevisao > 0 && (
        <span className="whitespace-nowrap text-[11px] text-info">
          {saldo.emRevisao} comprovante{saldo.emRevisao === 1 ? "" : "s"} na fila
        </span>
      )}
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
