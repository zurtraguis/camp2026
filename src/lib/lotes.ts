/** Lógica pura de lotes (sem `server-only`, testável). */

export interface ActiveLote {
  id: string;
  name: string;
  order: number;
  priceCents: number;
  /** Vagas ainda disponíveis (teto global). Mantém o nome por compatibilidade. */
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
 * Teto global de inscrições. As vagas fecham quando este número é atingido,
 * independente da data ou do lote vigente. "Vendido" = inscrições não canceladas.
 */
export const TOTAL_CAPACITY = 150;

/**
 * Cronograma de preço por DATA (não por capacidade): cada lote vale a partir da
 * sua data de início até a do próximo. Datas em horário de Brasília (-03:00) —
 * se o acampamento usar outro fuso (ex.: Manaus, -04:00), ajuste o offset aqui.
 *
 *   até 31/07/2026  → lote 1
 *   01/08–31/08     → lote 2
 *   a partir 01/09  → lote 3
 */
export const LOTE_SCHEDULE: { order: number; startsAt: Date | null }[] = [
  { order: 1, startsAt: null },
  { order: 2, startsAt: new Date("2026-08-01T00:00:00-03:00") },
  { order: 3, startsAt: new Date("2026-09-01T00:00:00-03:00") },
];

/** Ordem do lote vigente para uma data: o último cujo início já passou. */
export function activeOrderForDate(now: Date): number {
  let order = LOTE_SCHEDULE[0]?.order ?? 1;
  for (const w of LOTE_SCHEDULE) {
    if (w.startsAt === null || now.getTime() >= w.startsAt.getTime()) {
      order = w.order;
    }
  }
  return order;
}

/**
 * Lote vigente: o PREÇO é escolhido pela data (cronograma acima); a
 * DISPONIBILIDADE é um teto global de `TOTAL_CAPACITY` vagas. Esgota quando
 * `sold >= TOTAL_CAPACITY`, não importa a data.
 */
export function resolveActiveLote(
  lotes: LoteRow[],
  sold: number,
  now: Date,
): ActiveLote | null {
  if (lotes.length === 0) return null;
  const ordered = [...lotes].sort((a, b) => a.order - b.order);

  const wantOrder = activeOrderForDate(now);
  // Casa com a linha real do lote (FK/preço). Se a ordem exata não existir,
  // usa a maior ordem disponível que não passe da desejada; senão a primeira.
  const active =
    ordered.find((l) => l.order === wantOrder) ??
    [...ordered].reverse().find((l) => l.order <= wantOrder) ??
    ordered[0];

  const remaining = Math.max(0, TOTAL_CAPACITY - sold);
  return {
    id: active.id,
    name: active.name,
    order: active.order,
    priceCents: active.priceCents,
    remainingInLote: remaining,
    totalRemaining: remaining,
    soldOut: sold >= TOTAL_CAPACITY,
  };
}
