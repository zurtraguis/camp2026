import { describe, it, expect } from "vitest";
import {
  splitInstallments,
  installmentDueDates,
  isCarne,
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
