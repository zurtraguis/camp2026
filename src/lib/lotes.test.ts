import { describe, it, expect } from "vitest";
import { resolveActiveLote, type LoteRow } from "./lotes";

const LOTES: LoteRow[] = [
  { id: "l1", name: "1º Lote", order: 1, priceCents: 30000, capacity: 80 },
  { id: "l2", name: "2º Lote", order: 2, priceCents: 40000, capacity: 80 },
  { id: "l3", name: "3º Lote", order: 3, priceCents: 45000, capacity: 80 },
];

describe("resolveActiveLote", () => {
  it("retorna null sem lotes", () => {
    expect(resolveActiveLote([], 0)).toBeNull();
  });

  it("0 vendidos → 1º lote, R$300", () => {
    const a = resolveActiveLote(LOTES, 0)!;
    expect(a.order).toBe(1);
    expect(a.priceCents).toBe(30000);
    expect(a.remainingInLote).toBe(80);
    expect(a.totalRemaining).toBe(240);
    expect(a.soldOut).toBe(false);
  });

  it("preenchido o 1º lote (80) → 2º lote, R$400", () => {
    const a = resolveActiveLote(LOTES, 80)!;
    expect(a.order).toBe(2);
    expect(a.priceCents).toBe(40000);
    expect(a.remainingInLote).toBe(80);
  });

  it("borda: 79 vendidos ainda é 1º lote (1 vaga)", () => {
    const a = resolveActiveLote(LOTES, 79)!;
    expect(a.order).toBe(1);
    expect(a.remainingInLote).toBe(1);
  });

  it("160 vendidos → 3º lote, R$450", () => {
    const a = resolveActiveLote(LOTES, 160)!;
    expect(a.order).toBe(3);
    expect(a.priceCents).toBe(45000);
  });

  it("240 vendidos → esgotado (último lote, soldOut)", () => {
    const a = resolveActiveLote(LOTES, 240)!;
    expect(a.soldOut).toBe(true);
    expect(a.remainingInLote).toBe(0);
    expect(a.totalRemaining).toBe(0);
  });

  it("ordena lotes fora de ordem", () => {
    const shuffled = [LOTES[2], LOTES[0], LOTES[1]];
    expect(resolveActiveLote(shuffled, 0)!.order).toBe(1);
  });
});
