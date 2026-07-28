import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  applyPercentOff,
  couponUsable,
  normalizeCouponCode,
  COUPON_REASON_LABEL,
} from "@/lib/coupon";

export interface CouponPreview {
  ok: boolean;
  code?: string;
  percentOff?: number;
  finalCents?: number;
  discountCents?: number;
  message?: string;
}

/**
 * Valida um cupom para exibição (preview ao vivo no formulário). NÃO consome —
 * só diz se vale e qual o valor com desconto. `code` vazio devolve ok:false sem
 * mensagem de erro (não é um cupom inválido, é a ausência de cupom).
 */
export async function previewCoupon(
  rawCode: string,
  priceCents: number,
): Promise<CouponPreview> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false };

  // Mensagem ÚNICA para todos os casos de falha: distinguir "não existe" de
  // "expirou" transforma o preview num oráculo — o atacante sabe quando acertou
  // um código válido, e os códigos são palavras previsíveis (IGREJA10, LIDER).
  const invalido: CouponPreview = {
    ok: false,
    message: "Cupom inválido ou indisponível.",
  };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) return invalido;
  if (!couponUsable(coupon, new Date()).ok) return invalido;

  const finalCents = applyPercentOff(priceCents, coupon.percentOff);
  return {
    ok: true,
    code: coupon.code,
    percentOff: coupon.percentOff,
    finalCents,
    discountCents: priceCents - finalCents,
    message: `${coupon.percentOff}% de desconto aplicado.`,
  };
}

export interface ResolvedCoupon {
  couponId: string;
  code: string;
  percentOff: number;
}

/**
 * Dentro da transação de criação da inscrição: valida e CONSOME o cupom (uso +1),
 * de forma atômica para não estourar o maxUses sob concorrência. Lança se o
 * código foi informado mas não é utilizável — quem chama transforma isso em
 * mensagem para o formulário (a pessoa remove o cupom e reenvia).
 */
export async function resolveAndConsumeCoupon(
  tx: Prisma.TransactionClient,
  rawCode: string,
  now: Date,
): Promise<ResolvedCoupon | null> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) throw new Error(`Cupom "${code}" não encontrado.`);

  const usable = couponUsable(coupon, now);
  if (!usable.ok) throw new Error(COUPON_REASON_LABEL[usable.reason!]);

  // Incremento condicional: se maxUses existe, só incrementa enquanto uses <
  // maxUses. count !== 1 = perdeu a corrida (esgotou entre a leitura e aqui).
  const guard: Prisma.CouponWhereInput =
    coupon.maxUses === null
      ? { id: coupon.id, active: true }
      : { id: coupon.id, active: true, uses: { lt: coupon.maxUses } };
  const res = await tx.coupon.updateMany({
    where: guard,
    data: { uses: { increment: 1 } },
  });
  if (res.count !== 1) {
    throw new Error("Este cupom atingiu o limite de usos.");
  }

  return { couponId: coupon.id, code: coupon.code, percentOff: coupon.percentOff };
}

/** Lista os cupons para a tela de admin (mais recentes primeiro). */
export function listCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export interface CreateCouponInput {
  code: string;
  percentOff: number;
  expiresAt: Date | null;
  maxUses: number | null;
}

/** Cria um cupom. Lança mensagem amigável se o código já existir. */
export async function createCoupon(input: CreateCouponInput) {
  const code = normalizeCouponCode(input.code);
  try {
    return await db.coupon.create({
      data: {
        code,
        percentOff: input.percentOff,
        expiresAt: input.expiresAt,
        maxUses: input.maxUses,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new Error(`Já existe um cupom com o código "${code}".`);
    }
    throw err;
  }
}

/** Liga/desliga um cupom. */
export async function setCouponActive(id: string, active: boolean) {
  await db.coupon.update({ where: { id }, data: { active } });
}
