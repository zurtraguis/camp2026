import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIBOS, TRIBO_META } from "@/lib/tribos";
import { formatBRL } from "@/lib/format";
import { Badge, ButtonLink, Card } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

// Status labels in pt-BR
const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Aguard. pgto",
  AWAITING_REVIEW: "Em revisão",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol",
  AWAITING_REVIEW: "border-info/30 bg-info/10 text-info",
  CONFIRMED: "border-verde-limao/30 bg-verde-limao/10 text-verde-limao",
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

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [registrations, pendingReview, confirmed, byTribo, totalCount] =
    await Promise.all([
      // Recent 50 registrations for the table
      db.registration.findMany({
        where: { status: { not: "CANCELLED" } },
        include: {
          payment: { select: { method: true, amountCents: true, status: true } },
          lote: { select: { name: true, order: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Count awaiting review
      db.registration.count({ where: { status: "AWAITING_REVIEW" } }),
      // Count confirmed
      db.registration.count({ where: { status: "CONFIRMED" } }),
      // Count by tribo (non-cancelled)
      db.registration.groupBy({
        by: ["tribo"],
        where: { status: { not: "CANCELLED" } },
        _count: { _all: true },
        orderBy: { tribo: "asc" },
      }),
      // Total non-cancelled
      db.registration.count({ where: { status: { not: "CANCELLED" } } }),
    ]);

  const triboCountMap: Record<string, number> = {};
  for (const row of byTribo) {
    if (row.tribo) triboCountMap[row.tribo] = row._count._all;
  }

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
          Exportar CSV
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
          href="/admin/pagamentos"
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
                    colSpan={9}
                    className="py-12 text-center text-muted"
                  >
                    Nenhuma inscrição encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {registrations.length === 50 && (
          <p className="mt-2 text-xs text-muted text-right">
            Exibindo as 50 mais recentes. Use o CSV para exportar todas.
          </p>
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
}: {
  label: string;
  value: number;
  accent: string;
  href?: string;
}) {
  const content = (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-condensed uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`font-display text-4xl ${accent}`}>{value}</p>
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
