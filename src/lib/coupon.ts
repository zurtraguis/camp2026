/**
 * Cupom de desconto percentual — regras puras (sem Prisma, testáveis).
 * O domínio trabalha em centavos inteiros; o desconto é arredondado ao centavo.
 */

export const MIN_PERCENT = 1;
export const MAX_PERCENT = 100;

/** Normaliza o código digitado: maiúsculas, sem espaços nas pontas. */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Quanto é abatido (centavos) ao aplicar `percentOff` sobre `priceCents`. */
export function discountCents(priceCents: number, percentOff: number): number {
  return Math.round((priceCents * percentOff) / 100);
}

/** Valor final após o desconto (nunca negativo). */
export function applyPercentOff(priceCents: number, percentOff: number): number {
  return Math.max(0, priceCents - discountCents(priceCents, percentOff));
}

export interface CouponLike {
  active: boolean;
  percentOff: number;
  expiresAt: Date | null;
  maxUses: number | null;
  uses: number;
}

export type CouponReason = "inactive" | "expired" | "maxed";

export const COUPON_REASON_LABEL: Record<CouponReason, string> = {
  inactive: "Este cupom não está mais ativo.",
  expired: "Este cupom expirou.",
  maxed: "Este cupom atingiu o limite de usos.",
};

/**
 * O cupom pode ser usado no instante `now`? Ordem das checagens é a que faz
 * sentido para a mensagem: inativo > expirado > esgotado.
 */
export function couponUsable(
  c: CouponLike,
  now: Date,
): { ok: boolean; reason?: CouponReason } {
  if (!c.active) return { ok: false, reason: "inactive" };
  if (c.expiresAt && c.expiresAt.getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (c.maxUses !== null && c.uses >= c.maxUses) {
    return { ok: false, reason: "maxed" };
  }
  return { ok: true };
}

/** Percentual válido para um cupom (inteiro de 1 a 100). */
export function isValidPercent(p: number): boolean {
  return Number.isInteger(p) && p >= MIN_PERCENT && p <= MAX_PERCENT;
}

/* ── Cupom retroativo (admin) ──────────────────────────────────────────────
 * Caso real: a família se inscreveu e esqueceu de aplicar o cupom. O admin
 * aplica depois, e o valor devido é recalculado.
 *
 * Só vale enquanto NADA foi pago: com dinheiro já confirmado, aplicar desconto
 * criaria um crédito a devolver — e não existe fluxo de devolução no sistema.
 * Nesse caso a decisão é humana (devolver por fora), não do código.
 */

export interface PagamentoParaCupom {
  status: string;
  couponCode: string | null;
  installments: { status: string }[];
}

/** Motivo pelo qual NÃO dá para aplicar cupom retroativo, ou null se dá. */
export function bloqueioCupomRetroativo(p: PagamentoParaCupom): string | null {
  if (p.couponCode) {
    return `Esta inscrição já usou o cupom ${p.couponCode}.`;
  }
  if (p.status === "CONFIRMED") {
    return "Pagamento já confirmado — o desconto viraria um valor a devolver. Trate a devolução por fora.";
  }
  if (p.status === "AWAITING_REVIEW") {
    return "Há um comprovante aguardando revisão — decida sobre ele antes de mexer no valor.";
  }
  if (p.installments.some((i) => i.status === "CONFIRMED")) {
    return "Este carnê já tem parcela paga — o desconto viraria um valor a devolver. Trate a devolução por fora.";
  }
  if (p.installments.some((i) => i.status === "AWAITING_REVIEW")) {
    return "Há parcela com comprovante aguardando revisão — decida sobre ela antes de mexer no valor.";
  }
  return null;
}
