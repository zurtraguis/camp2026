/**
 * Em aberto — central de pagamentos do admin.
 *
 * Uma tela só para todo o ciclo: quem deve (e há quantos dias), comprovantes
 * esperando decisão (revisar inline, com link assinado), baixa manual de
 * dinheiro que entrou fora do site, e troca da forma de pagamento. A antiga
 * /admin/pagamentos (fila de revisão separada) foi absorvida por esta tela e
 * hoje só redireciona para cá.
 */

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatPhone } from "@/lib/format";
import { saldoDoPagamento, ordenarPorUrgencia } from "@/lib/cobranca";
import { alvosDisponiveis } from "@/lib/forma-pagamento";
import { signedReceiptUrl } from "@/lib/storage";
import { Badge, Callout, Card } from "@/components/ui";
import { BaixaManualForm, type ParcelaEmAberto } from "./BaixaManualForm";
import { ReviewForm } from "./ReviewForm";
import { AlterarFormaForm } from "./AlterarFormaForm";
import Link from "next/link";
import { ATIVAS } from "@/lib/registration-status";

export const metadata = { title: "Em aberto" };

/** Parcelas ainda não confirmadas, da mais antiga para a mais nova. */
function parcelasEmAberto(
  installments: { id: string; number: number; amountCents: number; dueDate: Date; status: string }[],
  hoje: Date,
): ParcelaEmAberto[] {
  return installments
    .filter((i) => i.status !== "CONFIRMED")
    .sort((a, b) => a.number - b.number)
    .map((i) => {
      const venceu = i.dueDate.getTime() < hoje.getTime();
      const data = i.dueDate.toLocaleDateString("pt-BR");
      return {
        id: i.id,
        label: `${i.number}ª · ${formatBRL(i.amountCents)} · ${venceu ? "venceu" : "vence"} ${data}`,
      };
    });
}

/** Item com comprovante aguardando a decisão do admin. */
interface ItemRevisao {
  kind: "payment" | "installment";
  id: string;
  label: string;
  receiptUrl: string | null;
  temComprovante: boolean;
}

async function tentaAssinar(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await signedReceiptUrl(path, 900);
  } catch {
    return null;
  }
}

export default async function EmAbertoPage() {
  await requireAdmin();
  const hoje = new Date();

  const registrations = await db.registration.findMany({
    where: ATIVAS,
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

  // Comprovantes em revisão desta linha, com URL assinada (15 min) para abrir.
  const linhasComRevisao = await Promise.all(
    linhas.map(async (l) => {
      const p = l.reg.payment!;
      const revisao: ItemRevisao[] = [];
      if (p.status === "AWAITING_REVIEW") {
        revisao.push({
          kind: "payment",
          id: p.id,
          label: `À vista · ${formatBRL(p.amountCents)}`,
          receiptUrl: await tentaAssinar(p.pixReceiptPath),
          temComprovante: Boolean(p.pixReceiptPath),
        });
      }
      for (const i of p.installments) {
        if (i.status === "AWAITING_REVIEW") {
          revisao.push({
            kind: "installment",
            id: i.id,
            label: `Parcela ${i.number} · ${formatBRL(i.amountCents)}`,
            receiptUrl: await tentaAssinar(i.pixReceiptPath),
            temComprovante: Boolean(i.pixReceiptPath),
          });
        }
      }
      return { ...l, revisao };
    }),
  );

  const totalAberto = linhas.reduce((s, l) => s + l.saldo.abertoCents, 0);
  const totalVencido = linhas
    .filter((l) => l.saldo.diasAtraso > 0)
    .reduce((s, l) => s + l.saldo.abertoCents, 0);
  const totalRevisao = linhasComRevisao.reduce((s, l) => s + l.revisao.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Em aberto</h1>
        <p className="mt-1 text-sm text-muted">
          Saldo devedor, comprovantes para revisar e baixas — mais atrasados
          primeiro
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
          <p className="font-display text-4xl tabular-nums text-info">
            {totalRevisao}
          </p>
          <p className="text-xs text-muted">
            {totalRevisao === 1 ? "Comprovante" : "Comprovantes"} aguardando
            decisão — use o botão &quot;Revisar&quot; da linha
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
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/50">
              {linhasComRevisao.map(({ reg, saldo, revisao }) => {
                const telefone = reg.guardian?.phone ?? reg.phone;
                const parcelas = parcelasEmAberto(reg.payment!.installments, hoje);
                const alvos = alvosDisponiveis(reg.payment!);
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
                        : reg.payment!.method === "CARD"
                          ? "Cartão"
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
                    <Td className="align-top">
                      <div className="flex flex-col items-start gap-2">
                        {revisao.length > 0 && (
                          <details className="group" open={revisao.length > 0 && linhasComRevisao.length <= 3}>
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-info/40 bg-info/10 px-2.5 py-1 text-xs font-semibold text-info transition-colors hover:bg-info/20 focus-visible:outline-2 focus-visible:outline-verde-limao">
                              <span className="group-open:hidden">
                                Revisar ({revisao.length})
                              </span>
                              <span className="hidden group-open:inline">Fechar</span>
                            </summary>
                            <div className="mt-3 min-w-[16rem] space-y-3">
                              {revisao.map((item) => (
                                <div
                                  key={item.id}
                                  className="space-y-2 rounded-lg border border-info/30 bg-info/5 p-3"
                                >
                                  <p className="text-xs font-semibold text-creme">
                                    {item.label}
                                  </p>
                                  {item.receiptUrl ? (
                                    <a
                                      href={item.receiptUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao"
                                    >
                                      Ver comprovante
                                      <span className="text-muted">(15 min)</span>
                                    </a>
                                  ) : (
                                    <p className="text-xs italic text-muted">
                                      {item.temComprovante
                                        ? "Comprovante existe, mas o link falhou (storage)."
                                        : "Nenhum comprovante anexado."}
                                    </p>
                                  )}
                                  <ReviewForm
                                    paymentId={
                                      item.kind === "payment" ? item.id : undefined
                                    }
                                    installmentId={
                                      item.kind === "installment" ? item.id : undefined
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {saldo.carne ? (
                          parcelas.length > 0 ? (
                            <BaixaManualForm nome={reg.fullName} parcelas={parcelas} />
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )
                        ) : (
                          <BaixaManualForm
                            nome={reg.fullName}
                            paymentId={reg.payment!.id}
                          />
                        )}

                        {alvos.length > 0 && (
                          <AlterarFormaForm
                            paymentId={reg.payment!.id}
                            alvos={alvos}
                            isCarne={saldo.carne}
                          />
                        )}
                      </div>
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
        enviado só abate o saldo depois que você o aprova no botão
        &quot;Revisar&quot; da linha.
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
