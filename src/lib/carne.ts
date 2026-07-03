/**
 * Carnê Pix parcelado (até 3x). Regras puras de divisão de valor e vencimentos,
 * isoladas para teste. A 1ª parcela vence na inscrição; as demais a cada 30 dias.
 */

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 3;
/** Intervalo entre parcelas (dias). Spec: "1ª na hora, demais a cada 30 dias". */
export const INSTALLMENT_INTERVAL_DAYS = 30;

/** Quantidade de parcelas é válida para carnê (2 ou 3)? */
export function isCarne(installments: number | null | undefined): boolean {
  return (
    typeof installments === "number" &&
    installments >= MIN_INSTALLMENTS &&
    installments <= MAX_INSTALLMENTS
  );
}

/**
 * Divide `totalCents` em `count` parcelas inteiras (centavos). O resto da divisão
 * é somado à 1ª parcela, de forma que a soma feche exatamente com o total.
 * Ex.: 30000/3 → [10000,10000,10000]; 10001/3 → [3335,3333,3333].
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("Valor total inválido.");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Número de parcelas inválido.");
  }
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? base + remainder : base,
  );
}

/**
 * Vencimentos das parcelas: a 1ª na data-base (inscrição) e as demais somando
 * `INSTALLMENT_INTERVAL_DAYS` dias sucessivamente.
 */
export function installmentDueDates(start: Date, count: number): Date[] {
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from(
    { length: count },
    (_, i) => new Date(start.getTime() + i * INSTALLMENT_INTERVAL_DAYS * dayMs),
  );
}
