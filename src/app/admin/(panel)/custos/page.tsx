/**
 * Custos — o outro lado do caixa.
 *
 * O painel sabia quanto ENTROU (recebidos) mas nada do que SAI. Aqui ficam as
 * despesas do acampamento, cada uma com o que já foi pago — porque na prática
 * elas são pagas em partes (a entrada do aluguel, depois o restante).
 *
 * O balanço no topo cruza as duas pontas: o saldo de hoje e a projeção de
 * fechamento (tudo que se espera receber menos tudo que se espera gastar).
 */

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listarDespesas } from "@/lib/custos.service";
import { listarRecebimentos } from "@/lib/recebidos.service";
import { totalRecebido } from "@/lib/recebidos";
import {
  saldoDaDespesa,
  totaisDosCustos,
  totaisPorCategoria,
  balanco,
  CATEGORIA_LABEL,
  FORMA_DESPESA_LABEL,
  type CategoriaDespesa,
  type FormaPagamentoDespesa,
} from "@/lib/custos";
import {
  montarExtrato,
  compromissos,
  resumoCaixa,
  saldoAtual,
  type Movimento,
} from "@/lib/caixa";
import { ORIGEM_LABEL } from "@/lib/recebidos";
import { formatBRL } from "@/lib/format";
import { Badge, Callout, Card } from "@/components/ui";
import {
  CriarDespesaForm,
  PagarDespesaForm,
  EditarDespesaForm,
  RemoverDespesaForm,
  RemoverPagamentoForm,
} from "./DespesaForms";

export const metadata = { title: "Custos" };

const ATIVAS = { status: { not: "CANCELLED" } } as const;

/** "1234,56" para preencher o input de edição. */
function centsParaInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export default async function CustosPage() {
  await requireAdmin();
  const hoje = new Date();

  const [despesas, recebimentos, previstoAgg] = await Promise.all([
    listarDespesas(),
    listarRecebimentos(),
    // Tudo que as inscrições vivas devem render (pago ou não) — para a projeção.
    db.payment.aggregate({
      _sum: { amountCents: true },
      where: { registration: ATIVAS },
    }),
  ]);

  const recebidoCents = totalRecebido(recebimentos);
  const previstoInscricoes = previstoAgg._sum.amountCents ?? 0;
  const aReceberCents = Math.max(0, previstoInscricoes - recebidoCents);

  const custos = totaisDosCustos(despesas, hoje);
  const porCategoria = totaisPorCategoria(despesas, hoje);
  const b = balanco(recebidoCents, aReceberCents, custos);

  // Extrato de caixa: entradas e saidas na mesma linha do tempo. Elas viviam
  // em telas separadas, e nenhuma respondia "depois de pagar o que ja esta
  // combinado, sobra quanto?".
  const movimentos: Movimento[] = [
    ...recebimentos
      .filter((r) => r.em !== null)
      .map((r) => ({
        id: `in-${r.id}`,
        em: r.em as Date,
        tipo: "ENTRADA" as const,
        descricao: `${r.nome} - ${r.descricao}`,
        meio: ORIGEM_LABEL[r.origem],
        valorCents: r.valorCents,
      })),
    ...despesas.flatMap((d) =>
      d.payments.map((pg) => ({
        id: `out-${pg.id}`,
        em: pg.paidAt,
        tipo: "SAIDA" as const,
        descricao: d.description,
        meio: FORMA_DESPESA_LABEL[pg.method as FormaPagamentoDespesa],
        valorCents: pg.amountCents,
      })),
    ),
  ];
  const extrato = montarExtrato(movimentos);
  const emCaixa = saldoAtual(movimentos);
  const aPagar = compromissos(
    despesas.map((d) => ({
      id: d.id,
      description: d.description,
      abertoCents: saldoDaDespesa(d, hoje).abertoCents,
      dueDate: d.dueDate,
    })),
    emCaixa,
    hoje,
  );
  const caixa = resumoCaixa(emCaixa, aPagar);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Custos</h1>
        <p className="mt-1 text-sm text-muted">
          O que o acampamento gasta — e quanto disso já foi pago
        </p>
      </div>

      {/* Balanço: entra × sai */}
      <section aria-label="Balanço" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Entrou
          </p>
          <p className="font-display text-3xl tabular-nums text-verde-limao">
            {formatBRL(b.entrouCents)}
          </p>
          <p className="text-xs text-muted">Inscrições confirmadas</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Saiu
          </p>
          <p className="font-display text-3xl tabular-nums text-danger">
            {formatBRL(b.saiuCents)}
          </p>
          <p className="text-xs text-muted">Despesas já pagas</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Em caixa hoje
          </p>
          <p
            className={`font-display text-3xl tabular-nums ${
              b.saldoCents < 0 ? "text-danger" : "text-creme"
            }`}
          >
            {formatBRL(b.saldoCents)}
          </p>
          <p className="text-xs text-muted">Entrou menos saiu</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs font-condensed uppercase tracking-wide text-muted">
            Projeção final
          </p>
          <p
            className={`font-display text-3xl tabular-nums ${
              b.projetadoCents < 0 ? "text-danger" : "text-verde-limao"
            }`}
          >
            {formatBRL(b.projetadoCents)}
          </p>
          <p className="text-xs text-muted">Se todos pagarem e tudo for quitado</p>
        </Card>
      </section>

      {b.projetadoCents < 0 && (
        <Callout tone="danger" title="A projeção está negativa">
          Somando o que ainda há para receber ({formatBRL(aReceberCents)}) com o
          que já entrou, o total não cobre as despesas previstas. Vale rever
          custos ou o número de inscrições.
        </Callout>
      )}

      {custos.vencidoCents > 0 && (
        <Callout tone="warning" title="Despesas vencidas">
          {formatBRL(custos.vencidoCents)} em despesas passou da data de
          vencimento e ainda tem saldo em aberto.
        </Callout>
      )}

      {/* Onde o dinheiro está indo */}
      {porCategoria.length > 0 && (
        <section aria-label="Por categoria" className="space-y-2">
          <h2 className="font-display text-xl text-creme">Por categoria</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {porCategoria.map((c) => (
              <Card key={c.categoria} className="flex flex-col gap-0.5">
                <p className="text-xs font-condensed uppercase tracking-wide text-muted">
                  {CATEGORIA_LABEL[c.categoria]}
                </p>
                <p className="font-display text-2xl tabular-nums text-creme">
                  {formatBRL(c.previstoCents)}
                </p>
                <p className="text-xs text-muted">
                  {formatBRL(c.pagoCents)} já pago
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Controle do saldo: o que esta combinado x o que ha em caixa */}
      <section aria-labelledby="caixa-heading" className="space-y-4">
        <h2 id="caixa-heading" className="font-display text-xl text-creme">
          Controle do saldo
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex flex-col gap-1">
            <p className="text-xs font-condensed uppercase tracking-wide text-muted">
              Em caixa
            </p>
            <p className="font-display text-3xl tabular-nums text-creme">
              {formatBRL(caixa.saldoCents)}
            </p>
            <p className="text-xs text-muted">
              O que ja entrou, menos o que ja saiu
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs font-condensed uppercase tracking-wide text-muted">
              Compromissado
            </p>
            <p className="font-display text-3xl tabular-nums text-danger">
              {formatBRL(caixa.compromissadoCents)}
            </p>
            <p className="text-xs text-muted">
              Despesas combinadas ainda nao pagas
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs font-condensed uppercase tracking-wide text-muted">
              Livre
            </p>
            <p
              className={`font-display text-3xl tabular-nums ${
                caixa.livreCents < 0 ? "text-danger" : "text-verde-limao"
              }`}
            >
              {formatBRL(caixa.livreCents)}
            </p>
            <p className="text-xs text-muted">
              O que da para assumir sem contar com quem ainda nao pagou
            </p>
          </Card>
        </div>

        {caixa.primeiroDescoberto && (
          <Callout tone="danger" title="O caixa nao cobre tudo que esta combinado">
            <p>
              A partir de{" "}
              <strong className="text-creme">
                {caixa.primeiroDescoberto.descricao}
              </strong>
              {caixa.primeiroDescoberto.dueDate
                ? ` (vence ${caixa.primeiroDescoberto.dueDate.toLocaleDateString("pt-BR")})`
                : ""}{" "}
              falta dinheiro: {formatBRL(caixa.faltaCents)}.
            </p>
            <p className="mt-1 text-xs text-muted">
              Esta conta usa so o que JA esta em caixa - promessa de pagamento
              nao paga fornecedor. Contando com as inscricoes em aberto, o
              cenario completo esta na projecao do topo.
            </p>
          </Callout>
        )}

        {aPagar.length > 0 && (
          <Card className="overflow-x-auto">
            <h3 className="mb-3 font-condensed text-xs uppercase tracking-widest text-muted">
              O que ainda falta pagar, na ordem em que vence
            </h3>
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-condensed">Despesa</th>
                  <th className="pb-2 pr-3 font-condensed">Vence</th>
                  <th className="pb-2 pr-3 text-right font-condensed">
                    Falta pagar
                  </th>
                  <th className="pb-2 text-right font-condensed">Sobra depois</th>
                </tr>
              </thead>
              <tbody>
                {aPagar.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-creme">
                      {c.descricao}
                      {c.vencido && (
                        <Badge className="ml-2 border-danger/40 bg-danger/10 text-danger">
                          vencida
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted">
                      {c.dueDate
                        ? c.dueDate.toLocaleDateString("pt-BR")
                        : "sem data"}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-creme">
                      {formatBRL(c.valorCents)}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        c.descoberto ? "font-semibold text-danger" : "text-muted"
                      }`}
                    >
                      {formatBRL(c.saldoDepoisCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {extrato.length > 0 && (
          <Card className="overflow-x-auto">
            <h3 className="mb-3 font-condensed text-xs uppercase tracking-widest text-muted">
              Extrato ({extrato.length} movimentos)
            </h3>
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-condensed">Quando</th>
                  <th className="pb-2 pr-3 font-condensed">Movimento</th>
                  <th className="pb-2 pr-3 font-condensed">Meio</th>
                  <th className="pb-2 pr-3 text-right font-condensed">Valor</th>
                  <th className="pb-2 text-right font-condensed">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {extrato.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">
                      {l.em.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 pr-3 text-creme">{l.descricao}</td>
                    <td className="py-2 pr-3 text-muted">{l.meio}</td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        l.tipo === "ENTRADA" ? "text-verde-limao" : "text-danger"
                      }`}
                    >
                      {l.tipo === "ENTRADA" ? "+" : "-"}
                      {formatBRL(l.valorCents)}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        l.saldoCents < 0 ? "text-danger" : "text-creme"
                      }`}
                    >
                      {formatBRL(l.saldoCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <Card>
        <h2 className="mb-4 border-b border-border pb-2 font-condensed text-xs uppercase tracking-widest text-muted">
          Nova despesa
        </h2>
        <CriarDespesaForm />
      </Card>

      <section aria-label="Despesas" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl text-creme">
            Despesas ({custos.quantidade})
          </h2>
          <p className="text-sm text-muted">
            Previsto {formatBRL(custos.previstoCents)} · pago{" "}
            {formatBRL(custos.pagoCents)} · falta{" "}
            <span className="text-creme">{formatBRL(custos.abertoCents)}</span>
          </p>
        </div>

        {despesas.length === 0 ? (
          <Callout tone="warning" title="Nenhuma despesa registrada">
            Cadastre acima os custos do acampamento — aluguel, alimentação,
            transporte — para acompanhar quanto já saiu e quanto falta.
          </Callout>
        ) : (
          despesas.map((d) => {
            const s = saldoDaDespesa(d, hoje);
            return (
              <Card key={d.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl text-creme">
                        {d.description}
                      </h3>
                      <Badge className="border-border bg-surface-2 text-muted">
                        {CATEGORIA_LABEL[d.category as CategoriaDespesa]}
                      </Badge>
                      {s.quitada ? (
                        <Badge className="border-verde-limao/30 bg-verde-limao/10 text-verde-limao">
                          Quitada
                        </Badge>
                      ) : s.vencida ? (
                        <Badge className="border-danger/30 bg-danger/10 text-danger">
                          Vencida
                        </Badge>
                      ) : (
                        <Badge className="border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol">
                          Em aberto
                        </Badge>
                      )}
                      {s.excedeu && (
                        <Badge className="border-danger/30 bg-danger/10 text-danger">
                          Pago acima do total
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {d.supplier && <>{d.supplier} · </>}
                      {d.dueDate
                        ? `vence ${d.dueDate.toLocaleDateString("pt-BR")}`
                        : "sem vencimento"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-display text-2xl tabular-nums text-creme">
                      {formatBRL(s.totalCents)}
                    </p>
                    <p className="text-xs text-muted">
                      pago {formatBRL(s.pagoCents)}
                      {!s.quitada && (
                        <>
                          {" · "}
                          <span className="text-amarelo-sol">
                            falta {formatBRL(s.abertoCents)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {d.notes && (
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
                    {d.notes}
                  </p>
                )}

                {d.payments.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-condensed uppercase tracking-wide text-muted">
                      Pagamentos
                    </p>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {d.payments.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span className="text-muted">
                            {p.paidAt.toLocaleDateString("pt-BR")} ·{" "}
                            {FORMA_DESPESA_LABEL[p.method as FormaPagamentoDespesa]}
                            {p.notes && (
                              <span className="text-muted/80"> · {p.notes}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="tabular-nums text-creme">
                              {formatBRL(p.amountCents)}
                            </span>
                            <RemoverPagamentoForm id={p.id} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-start gap-2 border-t border-border pt-3">
                  {!s.quitada && (
                    <PagarDespesaForm
                      expenseId={d.id}
                      restanteLabel={formatBRL(s.abertoCents)}
                    />
                  )}
                  <EditarDespesaForm
                    id={d.id}
                    description={d.description}
                    category={d.category}
                    amount={centsParaInput(d.amountCents)}
                    supplier={d.supplier ?? ""}
                    dueDate={
                      d.dueDate ? d.dueDate.toISOString().slice(0, 10) : ""
                    }
                    notes={d.notes ?? ""}
                  />
                  <RemoverDespesaForm id={d.id} descricao={d.description} />
                </div>
              </Card>
            );
          })
        )}
      </section>

      <p className="text-xs text-muted">
        &quot;Entrou&quot; usa o mesmo cálculo da aba Recebidos. &quot;Saiu&quot;
        conta só pagamentos de despesa já registrados aqui — se você pagou algo e
        não lançou, o saldo fica otimista.
      </p>
    </div>
  );
}
