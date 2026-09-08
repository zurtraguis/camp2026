import "server-only";

import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
import { resolveActiveLote, type ActiveLote } from "@/lib/lotes";

export type { ActiveLote } from "@/lib/lotes";

/**
 * O PREÇO vigente é definido pela DATA (cronograma em @/lib/lotes); a
 * DISPONIBILIDADE é um teto global de vagas. "Vendido" conta inscrições ATIVAS
 * (reserva a vaga enquanto o pagamento é processado/revisado). Desativada não
 * conta: liberar a vaga é justamente o motivo de desativar.
 */
export async function getActiveLote(): Promise<ActiveLote | null> {
  const [lotes, sold] = await Promise.all([
    db.lote.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    // isDemo fora da conta: inscrição de teste não pode consumir vaga real.
    db.registration.count({
      where: { ...ATIVAS, isDemo: false },
    }),
  ]);
  return resolveActiveLote(lotes, sold, new Date());
}

export async function listLotes() {
  const [lotes, sold] = await Promise.all([
    db.lote.findMany({ orderBy: { order: "asc" } }),
    // isDemo fora da conta: inscrição de teste não pode consumir vaga real.
    db.registration.count({
      where: { ...ATIVAS, isDemo: false },
    }),
  ]);
  let cumulative = 0;
  return lotes.map((l) => {
    const start = cumulative;
    cumulative += l.capacity;
    const filled = Math.max(0, Math.min(l.capacity, sold - start));
    return { ...l, filled, remaining: l.capacity - filled };
  });
}
