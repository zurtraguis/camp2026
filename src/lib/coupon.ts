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
