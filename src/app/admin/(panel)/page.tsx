import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIBOS, TRIBO_META } from "@/lib/tribos";
import { formatBRL } from "@/lib/format";
import { carneProgress } from "@/lib/carne";
import { Badge, ButtonLink, Card } from "@/components/ui";
import Link from "next/link";
import { RestaurarForm } from "./RestaurarForm";
import { ATIVAS } from "@/lib/registration-status";

export const metadata = { title: "Dashboard" };

// Status labels in pt-BR
const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Aguard. pgto",
  AWAITING_REVIEW: "Em revisão",
  CONFIRMED: "Confirmada",
  INACTIVE: "Desativada",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol",
  AWAITING_REVIEW: "border-info/30 bg-info/10 text-info",
  CONFIRMED: "border-verde-limao/30 bg-verde-limao/10 text-verde-limao",
  INACTIVE: "border-border bg-surface-2 text-muted",
  CANCELLED: "border-danger/30 bg-danger/10 text-danger",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "M",
  FEMALE: "F",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "Cartão",
  PIX: "Pix",
};

/** Inscrições vivas — base comum de todos os números desta página. */

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [
    registrations,
    desativadas,
    excluidas,
    pendingReview,
    confirmed,
    byTribo,
    totalCount,
    previstoAgg,
    avistaEmCaixaAgg,
    parcelasEmCaixaAgg,
  ] = await Promise.all([
    // TODAS as inscrições ativas — não só as 50 mais recentes. A lista é
    // limitada por natureza: o acampamento tem teto de TOTAL_CAPACITY (150)
    // vagas, então não existe cenário de "milhares de linhas" para paginar.
    // Cortar em 50 escondia gente da organização sem avisar direito.
    db.registration.findMany({
      where: ATIVAS,
      include: {
        payment: {
          select: {
            method: true,
            amountCents: true,
            status: true,
            installmentsTotal: true,
            installments: { select: { status: true } },
          },
        },
        lote: { select: { name: true, order: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Desativadas: ficam FORA de tudo (vaga, tribo, cobrança), mas nao podem
    // sumir da tela — e do lugar onde se reativa.
    db.registration.findMany({
      where: { status: "INACTIVE" },
      select: { id: true, publicCode: true, fullName: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    // Lixeira: o que foi excluído, com a cópia completa guardada.
    db.deletedRegistration.findMany({
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        publicCode: true,
        fullName: true,
        deletedAt: true,
        deletedByName: true,
        reason: true,
        restoredAt: true,
      },
    }),
    // Count awaiting review
    db.registration.count({ where: { status: "AWAITING_REVIEW" } }),
    // Count confirmed
    db.registration.count({ where: { status: "CONFIRMED" } }),
    // Count by tribo (non-cancelled)
    db.registration.groupBy({
      by: ["tribo"],
      where: ATIVAS,
      _count: { _all: true },
      orderBy: { tribo: "asc" },
    }),
    // Total non-cancelled
    db.registration.count({ where: ATIVAS }),
    // Previsto: tudo que as inscrições vivas devem render, pago ou não.
    db.payment.aggregate({
      _sum: { amountCents: true },
      where: { registration: ATIVAS },
    }),
    // Em caixa, parte 1: pagamentos à vista (Pix/cartão) quitados. O corte é
    // "não tem parcela" em vez de installmentsTotal: um carnê é contado só
    // pelas parcelas abaixo, senão seu valor cheio entraria duas vezes.
    db.payment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: "CONFIRMED",
        installments: { none: {} },
        registration: ATIVAS,
      },
    }),
    // Em caixa, parte 2: carnê entra parcela a parcela, conforme confirmadas.
    db.installment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: "CONFIRMED",
        payment: { registration: ATIVAS },
      },
    }),
  ]);

  const triboCountMap: Record<string, number> = {};
  for (const row of byTribo) {
    if (row.tribo) triboCountMap[row.tribo] = row._count._all;
  }

  const previstoCents = previstoAgg._sum.amountCents ?? 0;
  const emCaixaCents =
    (avistaEmCaixaAgg._sum.amountCents ?? 0) +
    (parcelasEmCaixaAgg._sum.amountCents ?? 0);
  const aReceberCents = previstoCents - emCaixaCents;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-creme">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Visão geral das inscrições do Acampamento RAIZ 2026
          </p>
        </div>
        <ButtonLink href="/admin/export" variant="secondary" size="sm">
          Exportar planilha
        </ButtonLink>
      </div>

      {/* Summary cards */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Total de inscrições"
          value={totalCount}
          accent="text-creme"
        />
        <SummaryCard
          label="Confirmadas"
          value={confirmed}
          accent="text-verde-limao"
        />
        <SummaryCard
          label="Aguardando revisão"
          value={pendingReview}
          accent="text-amarelo-sol"
          href="/admin/em-aberto"
        />
        {/* Tribo breakdown */}
        <Card className="col-span-2 sm:col-span-1">
          <p className="text-xs font-condensed uppercase text-muted tracking-wide mb-2">
            Por tribo
          </p>
          <ul className="space-y-1">
            {TRIBOS.map((triboId) => {
              const meta = TRIBO_META[triboId];
              const count = triboCountMap[triboId] ?? 0;
              return (
                <li key={triboId} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-creme">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: meta.cor }}
                      aria-hidden="true"
                    />
                    {meta.nome}
                  </span>
                  <span className="text-xs font-semibold text-creme">{count}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Financeiro */}
      <section aria-label="Financeiro" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total previsto"
          value={formatBRL(previstoCents)}
          accent="text-creme"
          hint="Todas as inscrições ativas, pagas ou não"
        />
        <SummaryCard
          label="Total em caixa"
          value={formatBRL(emCaixaCents)}
          accent="text-verde-limao"
          hint="Ver de onde veio →"
          href="/admin/recebidos"
        />
        <SummaryCard
          label="A receber"
          value={formatBRL(aReceberCents)}
          accent="text-amarelo-sol"
          hint="Previsto menos o que já entrou"
        />
      </section>

      {/* Recent registrations table */}
      <section aria-label="Inscrições recentes">
        <h2 className="font-display text-xl text-creme mb-4">
          Inscrições recentes
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <Th>Código</Th>
                <Th>Nome</Th>
                <Th>Idade</Th>
                <Th>Gênero</Th>
                <Th>Tribo</Th>
                <Th>Status</Th>
                <Th>Método</Th>
                <Th>Carnê</Th>
                <Th>Valor</Th>
                <Th>Data</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/50">
              {registrations.map((reg) => {
                const meta = reg.tribo ? TRIBO_META[reg.tribo as keyof typeof TRIBO_META] : null;
                return (
                  <tr
                    key={reg.id}
                    className="transition-colors hover:bg-surface-2/80"
                  >
                    <Td>
                      <Link
                        href={`/admin/inscricao/${reg.id}`}
                        className="font-mono text-xs text-verde-limao hover:underline focus-visible:outline-verde-limao rounded"
                      >
                        {reg.publicCode}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/inscricao/${reg.id}`}
                        className="text-creme hover:text-verde-limao transition-colors focus-visible:outline-verde-limao rounded"
                      >
                        {reg.fullName}
                      </Link>
                    </Td>
                    <Td className="text-muted">{reg.ageAtCamp}</Td>
                    <Td className="text-muted">{GENDER_LABELS[reg.gender] ?? reg.gender}</Td>
                    <Td>
                      {meta ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border-transparent"
                          style={{ background: meta.cor, color: "#0b0b0a" }}
                        >
                          {meta.nome}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        className={
                          STATUS_COLORS[reg.status] ??
                          "border-border bg-surface-2 text-muted"
                        }
                      >
                        {STATUS_LABELS[reg.status] ?? reg.status}
                      </Badge>
                    </Td>
                    <Td className="text-muted">
                      {reg.payment?.method
                        ? METHOD_LABELS[reg.payment.method] ?? reg.payment.method
                        : "—"}
                    </Td>
                    <Td>
                      <CarneCell payment={reg.payment} />
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {reg.payment?.amountCents != null
                        ? formatBRL(reg.payment.amountCents)
                        : "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {reg.createdAt.toLocaleDateString("pt-BR")}
                    </Td>
                  </tr>
                );
              })}
              {registrations.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-muted"
                  >
                    Nenhuma inscrição encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {registrations.length > 0 && (
          <p className="mt-2 text-xs text-muted text-right">
            {registrations.length === 1
              ? "1 inscrição ativa (todas listadas)."
              : `${registrations.length} inscrições ativas — todas listadas.`}{" "}
            Use <span className="text-creme">Exportar</span> para a planilha
            completa.
          </p>
        )}

        {desativadas.length > 0 && (
          <details className="mt-6 rounded-xl border border-border bg-surface-2/40 p-4">
            <summary className="cursor-pointer select-none font-condensed text-xs uppercase tracking-widest text-muted">
              Desativadas ({desativadas.length}) — fora da vaga e da tribo
            </summary>
            <ul className="mt-3 space-y-1 text-sm">
              {desativadas.map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline gap-x-3">
                  <Link
                    href={`/admin/inscricao/${d.id}`}
                    className="font-mono text-xs text-muted underline-offset-2 hover:text-creme hover:underline"
                  >
                    {d.publicCode}
                  </Link>
                  <span className="text-creme">{d.fullName}</span>
                  <span className="text-xs text-muted">
                    desde {d.updatedAt.toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Abra a ficha para reativar — a tribo é sorteada de novo pela
              distribuição do dia.
            </p>
          </details>
        )}

        {excluidas.length > 0 && (
          <details className="mt-4 rounded-xl border border-border bg-surface-2/40 p-4">
            <summary className="cursor-pointer select-none font-condensed text-xs uppercase tracking-widest text-muted">
              Lixeira ({excluidas.filter((e) => !e.restoredAt).length}) — excluídas,
              com cópia guardada
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {excluidas.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-xs text-muted">
                    {e.publicCode}
                  </span>
                  <span className="text-creme">{e.fullName}</span>
                  <span className="text-xs text-muted">
                    {e.deletedAt.toLocaleDateString("pt-BR")}
                    {e.deletedByName ? ` · ${e.deletedByName}` : ""}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </span>
                  {e.restoredAt ? (
                    <span className="text-xs text-verde-limao">
                      restaurada em {e.restoredAt.toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <RestaurarForm id={e.id} />
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              A cópia guarda campista, responsável, saúde, consentimento e
              pagamento. Ao restaurar, a tribo é sorteada pela distribuição do dia.
            </p>
          </details>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  accent: string;
  href?: string;
  hint?: string;
}) {
  const content = (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-condensed uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`font-display text-4xl tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-verde-limao"
      >
        {content}
      </Link>
    );
  }
  return content;
}

/**
 * Diz se a inscrição é carnê e quantas parcelas já foram confirmadas.
 * Verde quando o carnê está quitado; amarelo enquanto faltam parcelas.
 */
function CarneCell({
  payment,
}: {
  payment: {
    installmentsTotal: number | null;
    installments: { status: string }[];
  } | null;
}) {
  if (!payment) return <span className="text-muted">—</span>;

  const { carne, pagas, total, quitado, emRevisao } = carneProgress(payment);
  if (!carne) return <span className="text-muted">À vista</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge
        className={
          quitado
            ? "border-verde-limao/30 bg-verde-limao/10 text-verde-limao"
            : emRevisao > 0
              ? "border-info/30 bg-info/10 text-info"
              : "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol"
        }
      >
        <span className="tabular-nums">
          {pagas}/{total}
        </span>
        <span className="sr-only"> parcelas confirmadas</span>
      </Badge>
      {emRevisao > 0 && (
        <span className="whitespace-nowrap text-[11px] text-info">
          {emRevisao} em revisão
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
  return (
    <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>
  );
}
