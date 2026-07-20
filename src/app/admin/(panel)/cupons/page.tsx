import { requireAdmin } from "@/lib/auth";
import { listCoupons } from "@/lib/coupon.service";
import { couponUsable } from "@/lib/coupon";
import { Badge, Card } from "@/components/ui";
import { CreateCouponForm } from "./CreateCouponForm";
import { ToggleCouponForm } from "./ToggleCouponForm";

export const metadata = { title: "Cupons" };

export default async function CuponsPage() {
  await requireAdmin();
  const coupons = await listCoupons();
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-creme">Cupons de desconto</h1>
        <p className="mt-1 text-sm text-muted">
          Desconto percentual sobre o valor da inscrição. O adolescente digita o
          código no formulário e vê o preço já com desconto.
        </p>
      </div>

      <Card>
        <h2 className="font-condensed text-xs uppercase tracking-widest text-muted border-b border-border pb-2 mb-4">
          Novo cupom
        </h2>
        <CreateCouponForm />
      </Card>

      <section aria-label="Cupons existentes">
        <h2 className="font-display text-xl text-creme mb-4">Cupons</h2>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted">Nenhum cupom criado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <Th>Código</Th>
                  <Th>Desconto</Th>
                  <Th>Validade</Th>
                  <Th>Usos</Th>
                  <Th>Situação</Th>
                  <Th>Ação</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface/50">
                {coupons.map((c) => {
                  const usable = couponUsable(c, now);
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface-2/80">
                      <Td>
                        <span className="font-mono text-verde-limao">{c.code}</span>
                      </Td>
                      <Td className="tabular-nums text-creme">{c.percentOff}%</Td>
                      <Td className="text-muted">
                        {c.expiresAt
                          ? c.expiresAt.toLocaleDateString("pt-BR")
                          : "sem validade"}
                      </Td>
                      <Td className="tabular-nums text-muted">
                        {c.uses}
                        {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                      </Td>
                      <Td>
                        <SituacaoBadge
                          active={c.active}
                          ok={usable.ok}
                          reason={usable.reason}
                        />
                      </Td>
                      <Td>
                        <ToggleCouponForm id={c.id} active={c.active} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SituacaoBadge({
  active,
  ok,
  reason,
}: {
  active: boolean;
  ok: boolean;
  reason?: "inactive" | "expired" | "maxed";
}) {
  if (ok) {
    return (
      <Badge className="border-verde-limao/30 bg-verde-limao/10 text-verde-limao">
        Válido
      </Badge>
    );
  }
  const label =
    reason === "expired" ? "Expirado" : reason === "maxed" ? "Esgotado" : "Inativo";
  const cls = active
    ? "border-amarelo-sol/30 bg-amarelo-sol/10 text-amarelo-sol"
    : "border-border bg-surface-2 text-muted";
  return <Badge className={cls}>{label}</Badge>;
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
