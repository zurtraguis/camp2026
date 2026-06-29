import "server-only";

import { db } from "@/lib/db";
import { resolveActiveLote, type ActiveLote } from "@/lib/lotes";

export type { ActiveLote } from "@/lib/lotes";

/**
 * Lotes vendem em ordem: preenchida a capacidade do lote 1, o lote 2 (mais caro)
 * passa a vigorar, e assim por diante. "Vendido" conta inscrições não canceladas
 * (reserva a vaga enquanto o pagamento é processado/revisado).
 */
export async function getActiveLote(): Promise<ActiveLote | null> {
  const lotes = await db.lote.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  const sold = await db.registration.count({
    where: { status: { not: "CANCELLED" } },
  });
  return resolveActiveLote(lotes, sold);
}

export async function listLotes() {
  const lotes = await db.lote.findMany({ orderBy: { order: "asc" } });
  const sold = await db.registration.count({
    where: { status: { not: "CANCELLED" } },
  });
  let cumulative = 0;
  return lotes.map((l) => {
    const start = cumulative;
    cumulative += l.capacity;
    const filled = Math.max(0, Math.min(l.capacity, sold - start));
    return { ...l, filled, remaining: l.capacity - filled };
  });
}
