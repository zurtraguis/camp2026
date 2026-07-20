import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatPhone } from "@/lib/format";
import { carneProgress } from "@/lib/carne";
import { TRIBO_META } from "@/lib/tribos";
import { TRIAGE_FLAG_LABELS } from "@/lib/validation";
import { signedReceiptUrl } from "@/lib/storage";
import { Badge, ButtonLink, Card } from "@/components/ui";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

// Status / method labels
const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  AWAITING_REVIEW: "Aguardando revisão",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol",
  AWAITING_REVIEW: "border-info/30 bg-info/10 text-info",
  CONFIRMED: "border-verde-limao/30 bg-verde-limao/10 text-verde-limao",
  CANCELLED: "border-danger/30 bg-danger/10 text-danger",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  AWAITING_REVIEW: "Em revisão",
  CONFIRMED: "Confirmado",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  REFUNDED: "Reembolsado",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol",
  AWAITING_REVIEW: "border-info/30 bg-info/10 text-info",
  CONFIRMED: "border-verde-limao/30 bg-verde-limao/10 text-verde-limao",
  FAILED: "border-danger/30 bg-danger/10 text-danger",
  EXPIRED: "border-danger/30 bg-danger/10 text-danger",
  REFUNDED: "border-border bg-surface-2 text-muted",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "Cartão de crédito",
  PIX: "Pix",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
};

const GUARDIAN_RELATIONSHIP_LABELS: Record<string, string> = {
  pai: "Pai",
  mae: "Mãe",
  responsavel_legal: "Responsável legal",
  outro: "Outro",
};

// Full registration type (post-migration shape)
type FullRegistration = {
  id: string;
  publicCode: string;
  fullName: string;
  birthDate: Date;
  ageAtCamp: number;
  gender: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  shirtSize: string | null;
  church: string | null;
  city: string | null;
  tribo: string | null;
  status: string;
  createdAt: Date;
  guardian: {
    name: string;
    cpf: string;
    phone: string;
    email: string | null;
    relationship: string;
  } | null;
  health: {
    allergies: string | null;
    medications: string | null;
    dietaryRestrictions: string | null;
    chronicConditions: string | null;
    healthNotes: string | null;
    triageFlags: string[];
    triageNotes: string | null;
  } | null;
  consent: {
    consentData: boolean;
    consentHealth: boolean;
    consentActivities: boolean;
    consentImage: boolean;
    termVersion: string;
    consentedAt: Date | null;
    ip: string | null;
  } | null;
  payment: {
    method: string;
    status: string;
    amountCents: number;
    installmentsTotal: number | null;
    installments: {
      id: string;
      number: number;
      amountCents: number;
      dueDate: Date;
      status: string;
    }[];
    couponCode: string | null;
    discountPercent: number | null;
    originalAmountCents: number | null;
    pixReceiptPath: string | null;
    pixTxid: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
  } | null;
  lote: { name: string } | null;
};

export default async function InscricaoDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const reg = (await db.registration.findUnique({
    where: { id },
    include: {
      guardian: true,
      health: true,
      consent: true,
      payment: { include: { installments: { orderBy: { number: "asc" } } } },
      lote: true,
    },
  })) as FullRegistration | null;

  if (!reg) notFound();

  const triboMeta = reg.tribo ? TRIBO_META[reg.tribo as keyof typeof TRIBO_META] : null;

  const carne = reg.payment ? carneProgress(reg.payment) : null;
  const formaLabel = carne?.carne
    ? `Carnê em ${carne.total}x — ${carne.pagas}/${carne.total} confirmada(s)`
    : "À vista";

  // Signed URL for Pix receipt
  let receiptUrl: string | null = null;
  if (reg.payment?.pixReceiptPath) {
    try {
      receiptUrl = await signedReceiptUrl(reg.payment.pixReceiptPath, 900);
    } catch {
      receiptUrl = null;
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link
          href="/admin"
          className="hover:text-creme transition-colors focus-visible:outline-verde-limao rounded"
        >
          Inscrições
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-mono text-verde-limao">{reg.publicCode}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="font-display text-3xl text-creme">{reg.fullName}</h1>
            <Badge className={STATUS_COLORS[reg.status] ?? ""}>
              {STATUS_LABELS[reg.status] ?? reg.status}
            </Badge>
          </div>
          <p className="text-sm text-muted font-mono">{reg.publicCode}</p>
        </div>
        {triboMeta && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-2"
            style={{
              borderColor: triboMeta.cor + "44",
              background: triboMeta.cor + "14",
            }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: triboMeta.cor }}
              aria-hidden="true"
            />
            <span className="font-display text-lg" style={{ color: triboMeta.cor }}>
              {triboMeta.nome}
            </span>
            <span className="text-xs text-muted">({triboMeta.significado})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dados do campista */}
        <Card>
          <SectionTitle>Dados do Campista</SectionTitle>
          <dl className="mt-4 space-y-3">
            <DataRow label="Nome completo" value={reg.fullName} />
            <DataRow
              label="Data de nascimento"
              value={reg.birthDate.toLocaleDateString("pt-BR")}
            />
            <DataRow label="Idade no acampamento" value={`${reg.ageAtCamp} anos`} />
            <DataRow
              label="Gênero"
              value={GENDER_LABELS[reg.gender] ?? reg.gender}
            />
            {reg.cpf && <DataRow label="CPF" value={maskCPF(reg.cpf)} />}
            {reg.phone && <DataRow label="Telefone" value={formatPhone(reg.phone)} />}
            {reg.email && <DataRow label="E-mail" value={reg.email} />}
            {reg.shirtSize && <DataRow label="Tamanho de camiseta" value={reg.shirtSize} />}
            {reg.church && <DataRow label="Igreja" value={reg.church} />}
            {reg.city && <DataRow label="Cidade" value={reg.city} />}
            <DataRow
              label="Inscrito em"
              value={reg.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            />
          </dl>
        </Card>

        {/* Responsável */}
        {reg.guardian && (
          <Card>
            <SectionTitle>Responsável Legal</SectionTitle>
            <dl className="mt-4 space-y-3">
              <DataRow label="Nome" value={reg.guardian.name} />
              <DataRow
                label="Parentesco"
                value={
                  GUARDIAN_RELATIONSHIP_LABELS[reg.guardian.relationship] ??
                  reg.guardian.relationship
                }
              />
              <DataRow label="CPF" value={maskCPF(reg.guardian.cpf)} />
              <DataRow label="Telefone" value={formatPhone(reg.guardian.phone)} />
              {reg.guardian.email && (
                <DataRow label="E-mail" value={reg.guardian.email} />
              )}
            </dl>
          </Card>
        )}

        {/* Pagamento */}
        {reg.payment && (
          <Card>
            <SectionTitle>Pagamento</SectionTitle>
            <dl className="mt-4 space-y-3">
              <DataRow
                label="Método"
                value={METHOD_LABELS[reg.payment.method] ?? reg.payment.method}
              />
              <DataRow
                label="Status"
                value={
                  PAYMENT_STATUS_LABELS[reg.payment.status] ?? reg.payment.status
                }
              />
              <DataRow
                label="Valor"
                value={formatBRL(reg.payment.amountCents)}
              />
              {reg.payment.couponCode && (
                <>
                  <DataRow
                    label="Valor original"
                    value={formatBRL(
                      reg.payment.originalAmountCents ?? reg.payment.amountCents,
                    )}
                  />
                  <DataRow
                    label="Cupom"
                    value={`${reg.payment.couponCode} (−${reg.payment.discountPercent ?? 0}%)`}
                  />
                </>
              )}
              <DataRow label="Forma" value={formaLabel} />
              {reg.lote && (
                <DataRow label="Lote" value={reg.lote.name} />
              )}
              {reg.payment.pixTxid && (
                <DataRow label="TxID Pix" value={reg.payment.pixTxid} mono />
              )}
              {reg.payment.reviewedAt && (
                <DataRow
                  label="Revisado em"
                  value={reg.payment.reviewedAt.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                />
              )}
              {reg.payment.reviewNote && (
                <DataRow label="Nota da revisão" value={reg.payment.reviewNote} />
              )}
            </dl>

            {reg.payment.installments.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-condensed uppercase tracking-wide text-muted mb-2">
                  Parcelas do carnê
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {reg.payment.installments.map((inst) => (
                    <li
                      key={inst.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="text-muted">
                        {inst.number}ª · vence{" "}
                        {inst.dueDate.toLocaleDateString("pt-BR")}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums text-creme">
                          {formatBRL(inst.amountCents)}
                        </span>
                        <Badge
                          className={
                            PAYMENT_STATUS_COLORS[inst.status] ??
                            "border-border bg-surface-2 text-muted"
                          }
                        >
                          {PAYMENT_STATUS_LABELS[inst.status] ?? inst.status}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {receiptUrl && (
              <div className="mt-4">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-verde-limao"
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Ver comprovante Pix
                  <span className="text-xs text-muted">(expira em 15 min)</span>
                </a>
              </div>
            )}

            {!receiptUrl && reg.payment.pixReceiptPath && (
              <p className="mt-3 text-xs text-muted italic">
                Comprovante existente, mas o link não pôde ser gerado (verifique o
                storage).
              </p>
            )}
          </Card>
        )}

        {/* Consentimentos */}
        {reg.consent && (
          <Card>
            <SectionTitle>Consentimentos (LGPD)</SectionTitle>
            <dl className="mt-4 space-y-3">
              <ConsentRow
                label="Tratamento de dados pessoais"
                value={reg.consent.consentData}
              />
              <ConsentRow
                label="Dados de saúde"
                value={reg.consent.consentHealth}
              />
              <ConsentRow
                label="Participação em atividades"
                value={reg.consent.consentActivities}
              />
              <ConsentRow
                label="Uso de imagem"
                value={reg.consent.consentImage}
              />
              <DataRow label="Versão dos termos" value={reg.consent.termVersion} mono />
              {reg.consent.consentedAt && (
                <DataRow
                  label="Consentido em"
                  value={reg.consent.consentedAt.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                />
              )}
              {reg.consent.ip && (
                <DataRow label="IP do consentimento" value={reg.consent.ip} mono />
              )}
            </dl>
          </Card>
        )}
      </div>

      {/* HEALTH — full width, clearly separated, LGPD warning */}
      {reg.health && (
        <section aria-label="Informações de saúde — Confidencial">
          {/* LGPD banner */}
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
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
              <p className="font-semibold text-danger text-sm">
                Confidencial — Dados Sensíveis de Saúde (LGPD art. 11)
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Estas informações são de acesso restrito à equipe de saúde e
                liderança autorizada. Não compartilhe ou exporte sem necessidade
                fundamentada e registro.
              </p>
            </div>
          </div>

          <Card className="border-danger/20">
            <SectionTitle className="text-danger">
              Saúde & Triagem — CONFIDENCIAL
            </SectionTitle>

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Health fields */}
              <dl className="space-y-4">
                <HealthField
                  label="Alergias"
                  value={reg.health.allergies}
                />
                <HealthField
                  label="Medicamentos em uso"
                  value={reg.health.medications}
                />
                <HealthField
                  label="Restrições alimentares"
                  value={reg.health.dietaryRestrictions}
                />
                <HealthField
                  label="Condições crônicas"
                  value={reg.health.chronicConditions}
                />
                <HealthField
                  label="Observações de saúde"
                  value={reg.health.healthNotes}
                />
              </dl>

              {/* Triage flags */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-condensed uppercase tracking-wide text-muted mb-2">
                    Flags de triagem
                  </p>
                  {reg.health.triageFlags && reg.health.triageFlags.length > 0 ? (
                    <ul className="space-y-2">
                      {reg.health.triageFlags.map((flag: string) => (
                        <li key={flag} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full bg-amarelo-sol shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-sm text-creme">
                            {TRIAGE_FLAG_LABELS[flag as keyof typeof TRIAGE_FLAG_LABELS] ?? flag}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted italic">Nenhuma flag ativa.</p>
                  )}
                </div>

                {reg.health.triageNotes && (
                  <div>
                    <p className="text-xs font-condensed uppercase tracking-wide text-muted mb-2">
                      Notas de triagem
                    </p>
                    <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme whitespace-pre-wrap">
                      {reg.health.triageNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Back */}
      <div>
        <ButtonLink href="/admin" variant="secondary" size="sm">
          Voltar às inscrições
        </ButtonLink>
      </div>
    </div>
  );
}

// --- Helpers ---

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-condensed text-xs uppercase tracking-widest text-muted border-b border-border pb-2 ${className ?? ""}`}
    >
      {children}
    </h2>
  );
}

function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className={`text-creme text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function ConsentRow({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd>
        {value ? (
          <span className="inline-flex items-center gap-1 text-verde-limao font-medium">
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Sim
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted">
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Não
          </span>
        )}
      </dd>
    </div>
  );
}

function HealthField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return (
      <div>
        <dt className="text-xs font-condensed uppercase tracking-wide text-muted">
          {label}
        </dt>
        <dd className="mt-1 text-sm text-muted italic">Não informado</dd>
      </div>
    );
  }
  return (
    <div>
      <dt className="text-xs font-condensed uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-creme whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

// Mask helper — o CPF segue parcial (não é dado de contato operacional).
// Telefones aparecem inteiros: a equipe precisa ligar para o responsável.
function maskCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.***.${d.slice(9)}`;
}
