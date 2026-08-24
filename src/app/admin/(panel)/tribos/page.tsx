import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIBOS, TRIBO_META, balanceReport, type TriboId, type Gender } from "@/lib/tribos";
import { Card, Callout } from "@/components/ui";
import { RebalanceForm } from "./RebalanceForm";

export const metadata = { title: "Tribos" };

export default async function TribosPage() {
  await requireAdmin();

  type RegRow = { id: string; gender: string; ageAtCamp: number; tribo: string | null };

  const registrations = (await db.registration.findMany({
    where: { status: { not: "CANCELLED" } },
    select: {
      id: true,
      gender: true,
      ageAtCamp: true,
      tribo: true,
    },
  })) as RegRow[];

  const campers = registrations
    .filter((r: RegRow) => r.tribo !== null)
    .map((r: RegRow) => ({
      id: r.id,
      gender: r.gender as Gender,
      age: r.ageAtCamp,
      tribo: r.tribo as TriboId,
    }));

  const report = balanceReport(campers);

  // Quality thresholds
  const genderOk = report.genderSpread <= 1;
  const ageOk = report.ageSpread <= 0.5;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Tribos</h1>
        <p className="mt-1 text-sm text-muted">
          Distribuição atual dos campistas nas 3 tribos
        </p>
      </div>

      {campers.length === 0 && (
        <Callout tone="info">
          Nenhum campista com tribo atribuída ainda.
        </Callout>
      )}

      {/* Tribo cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TRIBOS.map((triboId) => {
          const meta = TRIBO_META[triboId];
          const stats = report.perTribo[triboId];
          return (
            <Card key={triboId} className="relative overflow-hidden">
              {/* Color accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                style={{ background: meta.cor }}
                aria-hidden="true"
              />

              <div className="mt-2 space-y-4">
                {/* Header */}
                <div>
                  <h2 className="font-display text-2xl text-creme">{meta.nome}</h2>
                  <p className="font-condensed text-xs uppercase tracking-widest text-muted">
                    {meta.significado}
                  </p>
                </div>

                {/* Total */}
                <p
                  className="font-display text-5xl"
                  style={{ color: meta.cor }}
                >
                  {stats.total}
                </p>

                {/* Breakdown */}
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Meninos</dt>
                    <dd className="font-semibold text-creme">{stats.male}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Meninas</dt>
                    <dd className="font-semibold text-creme">{stats.female}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <dt className="text-muted">Idade média</dt>
                    <dd className="font-semibold text-creme">
                      {stats.total > 0 ? stats.avgAge.toFixed(1) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quality metrics */}
      <section aria-label="Métricas de balanceamento">
        <h2 className="font-display text-xl text-creme mb-4">
          Qualidade do balanceamento
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            label="Dispersão de gênero"
            description="Diferença máx. entre tribos no número de meninos (ou meninas). Ideal: ≤ 1."
            value={report.genderSpread}
            ok={genderOk}
            unit="campistas"
          />
          <MetricCard
            label="Dispersão de idade"
            description="Diferença entre a maior e menor média de idade entre as tribos. Ideal: ≤ 0,5."
            value={report.ageSpread}
            ok={ageOk}
            unit="anos"
          />
        </div>

        {(!genderOk || !ageOk) && campers.length > 0 && (
          <div className="mt-4">
            <Callout tone="warning" title="Balanceamento pode ser melhorado">
              {!genderOk && (
                <p>A dispersão de gênero entre tribos está acima do ideal ({report.genderSpread} campistas).</p>
              )}
              {!ageOk && (
                <p className={!genderOk ? "mt-1" : ""}>
                  A dispersão de idade entre tribos está acima do ideal ({report.ageSpread} anos).
                </p>
              )}
              <p className="mt-2 text-xs text-muted">
                Use o rebalanceamento abaixo para redistribuir automaticamente.
              </p>
            </Callout>
          </div>
        )}

        {genderOk && ageOk && campers.length > 0 && (
          <div className="mt-4">
            <Callout tone="success" title="Balanceamento dentro do ideal">
              Dispersão de gênero ({report.genderSpread}) e dispersão de idade ({report.ageSpread} anos)
              estão dentro dos limites recomendados.
            </Callout>
          </div>
        )}
      </section>

      {/* Rebalance */}
      <section aria-label="Rebalanceamento">
        <h2 className="font-display text-xl text-creme mb-4">
          Rebalanceamento manual
        </h2>
        <RebalanceForm />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  description,
  value,
  ok,
  unit,
}: {
  label: string;
  description: string;
  value: number;
  ok: boolean;
  unit: string;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-condensed text-sm uppercase tracking-wide text-muted">
          {label}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            ok
              ? "bg-verde-limao/10 text-verde-limao border border-verde-limao/30"
              : "bg-amarelo-sol/10 text-amarelo-sol border border-amarelo-sol/30"
          }`}
          aria-label={ok ? "Dentro do ideal" : "Fora do ideal"}
        >
          {ok ? "Bom" : "Atenção"}
        </span>
      </div>
      <p className="font-display text-4xl text-creme">
        {value}
        <span className="ml-1 text-base font-sans font-normal text-muted">
          {unit}
        </span>
      </p>
      <p className="text-xs text-muted">{description}</p>
    </Card>
  );
}
