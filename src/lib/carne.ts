/**
 * Carnê Pix parcelado. Regras puras de divisão de valor e vencimentos, isoladas
 * para teste. A 1ª parcela vence na inscrição; as demais a cada 30 dias.
 *
 * O TETO DE PARCELAS NÃO É FIXO: encolhe conforme o acampamento se aproxima,
 * porque toda parcela precisa vencer ANTES do evento — parcela que vence depois
 * é dinheiro que provavelmente não entra (o adolescente já foi, ou não foi).
 * Ver `maxInstallmentsForDate`.
 */

export const MIN_INSTALLMENTS = 2;
/** Teto absoluto (nunca mais que isso, mesmo com muito tempo pela frente). */
export const MAX_INSTALLMENTS = 3;
/** Intervalo entre parcelas (dias). Spec: "1ª na hora, demais a cada 30 dias". */
export const INSTALLMENT_INTERVAL_DAYS = 30;

/**
 * Início do acampamento: 25/09/2026 (horário de Brasília). Se a data mudar, é
 * só aqui — o limite de parcelas se ajusta sozinho.
 */
export const CAMP_START = new Date("2026-09-25T00:00:00-03:00");

/**
 * Quantas parcelas cabem se a inscrição for feita em `hoje`: a última precisa
 * vencer antes de `campStart`. Devolve 1 quando nem a 2ª parcela cabe — ou
 * seja, "à vista apenas".
 *
 * Ex. (acampamento 25/09): em 28/07 → 2 (a 3ª venceria 26/09, tarde demais);
 * em 28/08 → 1 (a 2ª venceria 27/09).
 */
export function maxInstallmentsForDate(hoje: Date, campStart = CAMP_START): number {
  const dayMs = 24 * 60 * 60 * 1000;
  let max = 1;
  for (let n = 2; n <= MAX_INSTALLMENTS; n++) {
    const vencimentoUltima = hoje.getTime() + (n - 1) * INSTALLMENT_INTERVAL_DAYS * dayMs;
    if (vencimentoUltima > campStart.getTime()) break;
    max = n;
  }
  return max;
}

/** O parcelamento ainda está disponível nesta data? */
export function carneDisponivelEm(hoje: Date, campStart = CAMP_START): boolean {
  return maxInstallmentsForDate(hoje, campStart) >= MIN_INSTALLMENTS;
}

/**
 * Quantidade de parcelas é válida para carnê? Sem `hoje`, valida só o formato
 * (2..3). Com `hoje`, valida também contra o calendário — que é o que a criação
 * de inscrição usa.
 */
export function isCarne(
  installments: number | null | undefined,
  hoje?: Date,
): boolean {
  if (typeof installments !== "number") return false;
  const teto = hoje ? maxInstallmentsForDate(hoje) : MAX_INSTALLMENTS;
  return installments >= MIN_INSTALLMENTS && installments <= teto;
}

/**
 * Progresso de um carnê para exibição no admin: é carnê? quantas parcelas já
 * foram confirmadas, de quantas? `total` cai para a contagem de parcelas
 * quando `installmentsTotal` está ausente (dados antigos).
 *
 * `emRevisao` conta parcelas com comprovante enviado esperando decisão. Sem
 * isso a lista não distingue "não pagou" de "pagou e está na fila": subir o
 * comprovante de uma parcela não mexe no status da inscrição, então ambos
 * aparecem como 0/3 / AGUARD. PGTO.
 */
export function carneProgress(payment: {
  installmentsTotal: number | null;
  installments: { status: string }[];
}): {
  carne: boolean;
  pagas: number;
  total: number;
  quitado: boolean;
  emRevisao: number;
} {
  const carne = isCarne(payment.installmentsTotal);
  const total = payment.installmentsTotal ?? payment.installments.length;
  const pagas = payment.installments.filter((i) => i.status === "CONFIRMED").length;
  const emRevisao = payment.installments.filter(
    (i) => i.status === "AWAITING_REVIEW",
  ).length;
  return { carne, pagas, total, quitado: carne && pagas >= total, emRevisao };
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
