import { describe, it, expect } from "vitest";
import {
  normalizeCouponCode,
  discountCents,
  applyPercentOff,
  nadaAPagar,
  couponUsable,
  isValidPercent,
  bloqueioCupomRetroativo,
  type CouponLike,
} from "./coupon";
import { couponSchema, couponEditSchema } from "./validation";

describe("normalizeCouponCode", () => {
  it("maiúsculas e trim", () => {
    expect(normalizeCouponCode("  raiz10 ")).toBe("RAIZ10");
    expect(normalizeCouponCode("Igreja")).toBe("IGREJA");
  });
});

describe("nadaAPagar", () => {
  it("cupom de 100% zera e a inscrição não fica devendo nada", () => {
    // O caso real (Johana, cupom BOLSA): o valor zerou, mas a inscrição ficou
    // "aguardando pagamento" — sem chave Pix que fizesse sentido e sem
    // comprovante que a família pudesse enviar. Zero não é dívida de zero.
    expect(nadaAPagar(applyPercentOff(40000, 100))).toBe(true);
  });

  it("qualquer centavo restante ainda é cobrança", () => {
    expect(nadaAPagar(1)).toBe(false);
    expect(nadaAPagar(applyPercentOff(40000, 99))).toBe(false);
  });

  it("valor negativo (não deveria acontecer) também é 'nada a pagar'", () => {
    // Defensivo: se algum cálculo escorregar para negativo, o certo é tratar
    // como quitado — nunca cobrar um valor negativo da família.
    expect(nadaAPagar(-100)).toBe(true);
  });
});

describe("discountCents / applyPercentOff", () => {
  it("10% de R$300 = R$30 off → R$270", () => {
    expect(discountCents(30000, 10)).toBe(3000);
    expect(applyPercentOff(30000, 10)).toBe(27000);
  });

  it("100% zera", () => {
    expect(applyPercentOff(30000, 100)).toBe(0);
  });

  it("arredonda ao centavo", () => {
    // 33% de 10001 = 3300.33 → 3300
    expect(discountCents(10001, 33)).toBe(3300);
    expect(applyPercentOff(10001, 33)).toBe(6701);
  });

  it("nunca devolve valor negativo", () => {
    expect(applyPercentOff(100, 100)).toBe(0);
  });
});

describe("isValidPercent", () => {
  it("aceita 1..100 inteiros; rejeita o resto", () => {
    expect(isValidPercent(1)).toBe(true);
    expect(isValidPercent(100)).toBe(true);
    expect(isValidPercent(0)).toBe(false);
    expect(isValidPercent(101)).toBe(false);
    expect(isValidPercent(10.5)).toBe(false);
    expect(isValidPercent(-5)).toBe(false);
  });
});

describe("couponUsable", () => {
  const now = new Date("2026-07-20T12:00:00-03:00");
  const base: CouponLike = {
    active: true,
    percentOff: 10,
    expiresAt: null,
    maxUses: null,
    uses: 0,
  };

  it("ativo, sem validade, sem limite → ok", () => {
    expect(couponUsable(base, now)).toEqual({ ok: true });
  });

  it("inativo", () => {
    expect(couponUsable({ ...base, active: false }, now)).toEqual({
      ok: false,
      reason: "inactive",
    });
  });

  it("expirado (validade no passado)", () => {
    expect(
      couponUsable({ ...base, expiresAt: new Date("2026-07-01T00:00:00-03:00") }, now),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("validade futura ainda vale", () => {
    expect(
      couponUsable({ ...base, expiresAt: new Date("2026-08-01T00:00:00-03:00") }, now).ok,
    ).toBe(true);
  });

  it("esgotado (uses >= maxUses)", () => {
    expect(couponUsable({ ...base, maxUses: 20, uses: 20 }, now)).toEqual({
      ok: false,
      reason: "maxed",
    });
  });

  it("abaixo do limite ainda vale", () => {
    expect(couponUsable({ ...base, maxUses: 20, uses: 19 }, now).ok).toBe(true);
  });

  it("inativo tem precedência sobre expirado", () => {
    const c = { ...base, active: false, expiresAt: new Date("2026-07-01T00:00:00-03:00") };
    expect(couponUsable(c, now).reason).toBe("inactive");
  });
});

describe("couponSchema (criação no admin)", () => {
  const ok = { code: "RAIZ10", percentOff: "10" };

  it("aceita o mínimo (código + %)", () => {
    const r = couponSchema.safeParse(ok);
    expect(r.success).toBe(true);
  });

  it("validade e limite vazios viram undefined", () => {
    const r = couponSchema.safeParse({ ...ok, expiresAt: "", maxUses: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.expiresAt).toBeUndefined();
      expect(r.data.maxUses).toBeUndefined();
    }
  });

  it("parseia validade e limite quando informados", () => {
    const r = couponSchema.safeParse({
      ...ok,
      expiresAt: "2026-08-01",
      maxUses: "20",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.maxUses).toBe(20);
      expect(r.data.expiresAt).toBeInstanceOf(Date);
    }
  });

  it("rejeita % fora de 1..100 e não-inteiro", () => {
    expect(couponSchema.safeParse({ ...ok, percentOff: "0" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, percentOff: "101" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, percentOff: "10.5" }).success).toBe(false);
  });

  it("rejeita código curto ou com espaço/símbolo", () => {
    expect(couponSchema.safeParse({ ...ok, code: "AB" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, code: "RAIZ 10" }).success).toBe(false);
    expect(couponSchema.safeParse({ ...ok, code: "RAIZ@10" }).success).toBe(false);
  });
});

describe("bloqueioCupomRetroativo", () => {
  const base = { status: "PENDING", couponCode: null, installments: [] as { status: string }[] };

  it("nada pago e sem cupom → pode aplicar", () => {
    expect(bloqueioCupomRetroativo(base)).toBeNull();
  });

  it("já tem cupom → recusa (não compõe descontos)", () => {
    expect(bloqueioCupomRetroativo({ ...base, couponCode: "RAIZ10" })).toMatch(
      /já usou o cupom RAIZ10/,
    );
  });

  it("pagamento confirmado → recusa, viraria valor a devolver", () => {
    expect(bloqueioCupomRetroativo({ ...base, status: "CONFIRMED" })).toMatch(
      /devolver/,
    );
  });

  it("comprovante na fila → decida antes", () => {
    expect(bloqueioCupomRetroativo({ ...base, status: "AWAITING_REVIEW" })).toMatch(
      /aguardando revisão/,
    );
  });

  it("carnê com parcela paga → recusa", () => {
    expect(
      bloqueioCupomRetroativo({
        ...base,
        installments: [{ status: "CONFIRMED" }, { status: "PENDING" }],
      }),
    ).toMatch(/devolver/);
  });

  it("carnê com parcela na fila → decida antes", () => {
    expect(
      bloqueioCupomRetroativo({
        ...base,
        installments: [{ status: "AWAITING_REVIEW" }, { status: "PENDING" }],
      }),
    ).toMatch(/aguardando revisão/);
  });

  it("carnê totalmente em aberto → pode aplicar", () => {
    expect(
      bloqueioCupomRetroativo({
        ...base,
        installments: [{ status: "PENDING" }, { status: "PENDING" }],
      }),
    ).toBeNull();
  });
});

describe("couponEditSchema", () => {
  const base = { id: "c1", percentOff: "15" };

  it("aceita edição mínima (% obrigatório)", () => {
    expect(couponEditSchema.safeParse(base).success).toBe(true);
  });

  it("NÃO aceita mudar o código — os pagamentos guardam o snapshot dele", () => {
    const r = couponEditSchema.safeParse({ ...base, code: "OUTRO" });
    expect(r.success).toBe(true);
    // `code` é removido do schema: mesmo enviado, não chega ao serviço.
    if (r.success) expect("code" in r.data).toBe(false);
  });

  it("exige o id", () => {
    expect(couponEditSchema.safeParse({ percentOff: "15" }).success).toBe(false);
  });

  it("valida o % igual à criação", () => {
    expect(couponEditSchema.safeParse({ ...base, percentOff: "0" }).success).toBe(
      false,
    );
    expect(couponEditSchema.safeParse({ ...base, percentOff: "101" }).success).toBe(
      false,
    );
  });

  it("validade e limite vazios viram undefined (= remover a restrição)", () => {
    const r = couponEditSchema.safeParse({ ...base, expiresAt: "", maxUses: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.expiresAt).toBeUndefined();
      expect(r.data.maxUses).toBeUndefined();
    }
  });
});
