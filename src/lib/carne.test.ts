import { describe, it, expect } from "vitest";
import {
  splitInstallments,
  installmentDueDates,
  isCarne,
  carneProgress,
  maxInstallmentsForDate,
  carneDisponivelEm,
  MAX_INSTALLMENTS,
  INSTALLMENT_INTERVAL_DAYS,
} from "./carne";

describe("splitInstallments", () => {
  it("divide valor exato igualmente", () => {
    expect(splitInstallments(30000, 3)).toEqual([10000, 10000, 10000]);
    expect(splitInstallments(30000, 2)).toEqual([15000, 15000]);
  });

  it("soma o resto na 1ª parcela e fecha o total", () => {
    const parts = splitInstallments(10001, 3);
    expect(parts).toEqual([3335, 3333, 3333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10001);
  });

  it("1 parcela devolve o total inteiro", () => {
    expect(splitInstallments(30000, 1)).toEqual([30000]);
  });

  it("rejeita entradas inválidas", () => {
    expect(() => splitInstallments(-1, 3)).toThrow();
    expect(() => splitInstallments(100, 0)).toThrow();
    expect(() => splitInstallments(100.5, 3)).toThrow();
  });
});

describe("installmentDueDates", () => {
  it("1ª na data-base e demais a cada 30 dias", () => {
    const start = new Date("2026-07-03T12:00:00.000Z");
    const dates = installmentDueDates(start, 3);
    expect(dates[0].toISOString()).toBe(start.toISOString());
    const dayMs = 24 * 60 * 60 * 1000;
    expect(dates[1].getTime() - start.getTime()).toBe(
      INSTALLMENT_INTERVAL_DAYS * dayMs,
    );
    expect(dates[2].getTime() - start.getTime()).toBe(
      2 * INSTALLMENT_INTERVAL_DAYS * dayMs,
    );
  });
});

describe("isCarne", () => {
  it("aceita 2 e 3; rejeita 1, null e fora do intervalo", () => {
    expect(isCarne(2)).toBe(true);
    expect(isCarne(3)).toBe(true);
    expect(isCarne(1)).toBe(false);
    expect(isCarne(4)).toBe(false);
    expect(isCarne(null)).toBe(false);
    expect(isCarne(undefined)).toBe(false);
  });
});

describe("carneProgress", () => {
  const inst = (...statuses: string[]) => statuses.map((status) => ({ status }));

  it("pagamento à vista não é carnê", () => {
    expect(carneProgress({ installmentsTotal: null, installments: [] })).toEqual({
      carne: false,
      pagas: 0,
      total: 0,
      quitado: false,
      emRevisao: 0,
    });
  });

  it("conta só as parcelas CONFIRMED", () => {
    const p = carneProgress({
      installmentsTotal: 3,
      installments: inst("CONFIRMED", "AWAITING_REVIEW", "PENDING"),
    });
    expect(p).toEqual({
      carne: true,
      pagas: 1,
      total: 3,
      quitado: false,
      emRevisao: 1,
    });
  });

  it("parcela recusada (FAILED) não conta como paga", () => {
    const p = carneProgress({
      installmentsTotal: 2,
      installments: inst("CONFIRMED", "FAILED"),
    });
    expect(p).toEqual({
      carne: true,
      pagas: 1,
      total: 2,
      quitado: false,
      emRevisao: 0,
    });
  });

  it("marca quitado quando todas as parcelas confirmam", () => {
    const p = carneProgress({
      installmentsTotal: 3,
      installments: inst("CONFIRMED", "CONFIRMED", "CONFIRMED"),
    });
    expect(p).toEqual({
      carne: true,
      pagas: 3,
      total: 3,
      quitado: true,
      emRevisao: 0,
    });
  });

  it("distingue 'não pagou nada' de 'pagou e está na fila' — o caso da Melissa", () => {
    const naoPagou = carneProgress({
      installmentsTotal: 3,
      installments: inst("PENDING", "PENDING", "PENDING"),
    });
    const pagouEsperaRevisao = carneProgress({
      installmentsTotal: 3,
      installments: inst("AWAITING_REVIEW", "PENDING", "PENDING"),
    });
    // Os dois mostram 0/3 — o emRevisao é o que separa um do outro.
    expect(naoPagou.pagas).toBe(0);
    expect(pagouEsperaRevisao.pagas).toBe(0);
    expect(naoPagou.emRevisao).toBe(0);
    expect(pagouEsperaRevisao.emRevisao).toBe(1);
  });

  it("sem installmentsTotal, cai para a contagem de parcelas", () => {
    const p = carneProgress({
      installmentsTotal: null,
      installments: inst("CONFIRMED", "PENDING"),
    });
    // isCarne(null) é false → some como "À vista", mas total reflete as linhas.
    expect(p.carne).toBe(false);
    expect(p.total).toBe(2);
    expect(p.pagas).toBe(1);
    expect(p.emRevisao).toBe(0);
  });
});

describe("maxInstallmentsForDate — teto encolhe até o acampamento", () => {
  const CAMP = new Date("2026-09-25T00:00:00-03:00");
  const em = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

  it("28/07/2026 → 2x (a 3ª venceria 26/09, depois do acampamento)", () => {
    expect(maxInstallmentsForDate(em("2026-07-28"), CAMP)).toBe(2);
  });

  it("28/08/2026 → só à vista (a 2ª venceria 27/09)", () => {
    expect(maxInstallmentsForDate(em("2026-08-28"), CAMP)).toBe(1);
  });

  it("com folga (junho) → o teto absoluto de 3x", () => {
    expect(maxInstallmentsForDate(em("2026-06-01"), CAMP)).toBe(3);
  });

  it("nunca passa de MAX_INSTALLMENTS mesmo com um ano de antecedência", () => {
    expect(maxInstallmentsForDate(em("2025-09-25"), CAMP)).toBe(MAX_INSTALLMENTS);
  });

  it("depois do acampamento → à vista", () => {
    expect(maxInstallmentsForDate(em("2026-10-01"), CAMP)).toBe(1);
  });

  it("borda: 30 dias antes ainda cabe 2x; 29 dias depois já não", () => {
    // 2ª parcela vence exatamente na véspera do acampamento.
    expect(maxInstallmentsForDate(em("2026-08-25"), CAMP)).toBe(2);
    // Um dia a mais e a 2ª cairia em 26/09 — tarde demais.
    expect(maxInstallmentsForDate(em("2026-08-27"), CAMP)).toBe(1);
  });

  it("carneDisponivelEm acompanha o teto", () => {
    expect(carneDisponivelEm(em("2026-07-28"), CAMP)).toBe(true);
    expect(carneDisponivelEm(em("2026-08-28"), CAMP)).toBe(false);
  });
});

describe("isCarne com data", () => {
  const CAMP_HOJE = new Date("2026-07-28T12:00:00-03:00"); // teto real = 2

  it("sem data, valida só o formato (2..3)", () => {
    expect(isCarne(3)).toBe(true);
  });

  it("com data, 3x é recusado quando só cabem 2", () => {
    expect(isCarne(3, CAMP_HOJE)).toBe(false);
    expect(isCarne(2, CAMP_HOJE)).toBe(true);
  });

  it("1x nunca é carnê", () => {
    expect(isCarne(1, CAMP_HOJE)).toBe(false);
  });
});
