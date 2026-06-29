/** Lógica pura de lotes (sem `server-only`, testável). */

export interface ActiveLote {
  id: string;
  name: string;
  order: number;
  priceCents: number;
  remainingInLote: number;
  totalRemaining: number;
  soldOut: boolean;
}

export interface LoteRow {
  id: string;
  name: string;
  order: number;
  priceCents: number;
  capacity: number;
}

/**
 * Dado os lotes e o nº já vendido (inscrições não canceladas), retorna o lote
 * vigente: o primeiro (por ordem) cuja capacidade acumulada ainda não foi
 * preenchida. Se todos esgotaram, retorna o último com `soldOut: true`.
 */
export function resolveActiveLote(
  lotes: LoteRow[],
  sold: number,
): ActiveLote | null {
  if (lotes.length === 0) return null;
  const ordered = [...lotes].sort((a, b) => a.order - b.order);
  const totalCapacity = ordered.reduce((s, l) => s + l.capacity, 0);
  let cumulative = 0;
  for (const lote of ordered) {
    cumulative += lote.capacity;
    if (sold < cumulative) {
      return {
        id: lote.id,
        name: lote.name,
        order: lote.order,
        priceCents: lote.priceCents,
        remainingInLote: cumulative - sold,
        totalRemaining: totalCapacity - sold,
        soldOut: false,
      };
    }
  }
  const last = ordered[ordered.length - 1];
  return {
    id: last.id,
    name: last.name,
    order: last.order,
    priceCents: last.priceCents,
    remainingInLote: 0,
    totalRemaining: 0,
    soldOut: true,
  };
}
