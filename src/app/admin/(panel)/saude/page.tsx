/**
 * Relatório de saúde — o que a equipe precisa ter em mãos no acampamento.
 *
 * Reúne alergias, medicamentos, restrições alimentares, condições crônicas e
 * flags de triagem de quem vai. Existe porque essa informação só existia na
 * ficha individual: para saber quem tem alergia a amendoim, era preciso abrir
 * 150 fichas uma a uma.
 *
 * LGPD (art. 11 — dado sensível de menor): esta tela é de acesso restrito e
 * NÃO entra na exportação geral. A impressão é a via de uso no acampamento;
 * o papel deve ficar com a equipe de saúde e ser descartado depois.
 */

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIAGE_FLAG_LABELS } from "@/lib/validation";
import { formatPhone } from "@/lib/format";
import { TRIBO_META } from "@/lib/tribos";
import { Badge, Callout, Card } from "@/components/ui";
import Link from "next/link";
import { RelatorioImpressao, type FichaSaude } from "./RelatorioImpressao";
import { ATIVAS } from "@/lib/registration-status";

export const metadata = { title: "Saúde" };

/** Campos de saúde que, preenchidos, exigem atenção da equipe. */
const CAMPOS = [
  ["allergies", "Alergias"],
  ["medications", "Medicamentos"],
  ["dietaryRestrictions", "Restrições alimentares"],
  ["chronicConditions", "Condições crônicas"],
  ["healthNotes", "Observações"],
] as const;

export default async function SaudePage() {
  await requireAdmin();

  // Só quem realmente vai: cancelados fora. Ordenado por nome para procurar
  // rápido no papel durante o acampamento.
  const inscricoes = await db.registration.findMany({
    where: { ...ATIVAS, isDemo: false },
    include: {
      health: true,
      guardian: { select: { name: true, phone: true, relationship: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const temAlgo = (h: (typeof inscricoes)[number]["health"]) =>
    Boolean(
      h &&
        (h.allergies ||
          h.medications ||
          h.dietaryRestrictions ||
          h.chronicConditions ||
          h.healthNotes ||
          (h.triageFlags?.length ?? 0) > 0),
    );

  const comInfo = inscricoes.filter((r) => temAlgo(r.health));
  const semInfo = inscricoes.length - comInfo.length;

  // Mesma lista, achatada e já com os rótulos resolvidos, para o documento de
  // impressão (client component — não pode receber objetos do Prisma).
  const fichas: FichaSaude[] = comInfo.map((r) => ({
    id: r.id,
    nome: r.fullName,
    idade: r.ageAtCamp,
    codigo: r.publicCode,
    tribo: r.tribo
      ? (TRIBO_META[r.tribo as keyof typeof TRIBO_META]?.nome ?? null)
      : null,
    responsavel: r.guardian?.name ?? null,
    telefone: (() => {
      const t = r.guardian?.phone ?? r.phone;
      return t ? formatPhone(t) : null;
    })(),
    alergias: r.health?.allergies ?? null,
    medicamentos: r.health?.medications ?? null,
    restricoes: r.health?.dietaryRestrictions ?? null,
    condicoes: r.health?.chronicConditions ?? null,
    observacoes: r.health?.healthNotes ?? null,
    flags: (r.health?.triageFlags ?? []).map(
      (f) => TRIAGE_FLAG_LABELS[f as keyof typeof TRIAGE_FLAG_LABELS] ?? f,
    ),
  }));

  // Contagens por tipo, para a equipe saber o tamanho de cada demanda.
  const comAlergia = comInfo.filter((r) => r.health?.allergies).length;
  const comMedicacao = comInfo.filter((r) => r.health?.medications).length;
  const comRestricao = comInfo.filter((r) => r.health?.dietaryRestrictions).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-3xl text-creme">Relatório de saúde</h1>
          <p className="mt-1 text-sm text-muted">
            O que a equipe precisa saber sobre quem vai ao acampamento
          </p>
        </div>
        <RelatorioImpressao
          fichas={fichas}
          totalInscritos={inscricoes.length}
          geradoEm={new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        />
      </div>

      {/* Aviso LGPD — dado sensível de menor. */}
      <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
        <svg
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-danger">
            Confidencial — dados sensíveis de saúde de menores (LGPD art. 11)
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Uso restrito à equipe de saúde e à liderança responsável. Se
            imprimir, mantenha o papel sob guarda e destrua depois do
            acampamento. Não compartilhe em grupos de mensagem.
          </p>
        </div>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
        <Resumo label="Inscritos ativos" valor={inscricoes.length} />
        <Resumo label="Com alguma informação" valor={comInfo.length} destaque />
        <Resumo label="Com alergia" valor={comAlergia} />
        <Resumo label="Em uso de medicação" valor={comMedicacao} />
      </section>

      {comRestricao > 0 && (
        <Callout tone="warning" title="Cozinha">
          {comRestricao}{" "}
          {comRestricao === 1
            ? "campista tem restrição alimentar"
            : "campistas têm restrições alimentares"}{" "}
          — passe a lista para quem prepara as refeições.
        </Callout>
      )}

      {comInfo.length === 0 ? (
        <Callout tone="success" title="Nenhuma informação de saúde registrada">
          Ninguém declarou alergias, medicamentos, restrições ou condições até
          agora.
        </Callout>
      ) : (
        <section aria-label="Fichas de saúde" className="space-y-4">
          {comInfo.map((r) => {
            const meta = r.tribo
              ? TRIBO_META[r.tribo as keyof typeof TRIBO_META]
              : null;
            const tel = r.guardian?.phone ?? r.phone;
            return (
              <Card key={r.id} className="break-inside-avoid space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-2">
                  <div>
                    <Link
                      href={`/admin/inscricao/${r.id}`}
                      className="rounded font-display text-xl text-creme hover:text-verde-limao focus-visible:outline-verde-limao print:no-underline"
                    >
                      {r.fullName}
                    </Link>
                    <p className="text-xs text-muted">
                      {r.ageAtCamp} anos · {r.publicCode}
                      {meta && ` · ${meta.nome}`}
                    </p>
                  </div>
                  {tel && (
                    <div className="text-right">
                      <p className="text-xs text-muted">
                        {r.guardian?.name ?? "Responsável"}
                      </p>
                      <a
                        href={`tel:${tel.replace(/\D/g, "")}`}
                        className="rounded tabular-nums text-sm text-creme hover:text-verde-limao focus-visible:outline-verde-limao"
                      >
                        {formatPhone(tel)}
                      </a>
                    </div>
                  )}
                </div>

                {(r.health?.triageFlags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.health!.triageFlags.map((f) => (
                      <Badge
                        key={f}
                        className="border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol"
                      >
                        {TRIAGE_FLAG_LABELS[f as keyof typeof TRIAGE_FLAG_LABELS] ?? f}
                      </Badge>
                    ))}
                  </div>
                )}

                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CAMPOS.map(([campo, rotulo]) => {
                    const valor = r.health?.[campo];
                    if (!valor) return null;
                    return (
                      <div key={campo}>
                        <dt className="text-xs font-condensed uppercase tracking-wide text-muted">
                          {rotulo}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme">
                          {valor}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                {r.health?.triageNotes && (
                  <div>
                    <p className="text-xs font-condensed uppercase tracking-wide text-muted">
                      Notas de triagem
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme">
                      {r.health.triageNotes}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      )}

      {semInfo > 0 && (
        <p className="text-xs text-muted print:hidden">
          {semInfo}{" "}
          {semInfo === 1
            ? "inscrito não declarou nada de saúde"
            : "inscritos não declararam nada de saúde"}{" "}
          — não aparecem acima.
        </p>
      )}
    </div>
  );
}

function Resumo({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-condensed uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`font-display text-4xl tabular-nums ${
          destaque ? "text-amarelo-sol" : "text-creme"
        }`}
      >
        {valor}
      </p>
    </Card>
  );
}
