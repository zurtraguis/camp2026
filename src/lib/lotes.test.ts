import { describe, it, expect } from "vitest";
import {
  resolveActiveLote,
  activeOrderForDate,
  TOTAL_CAPACITY,
  type LoteRow,
} from "./lotes";

const LOTES: LoteRow[] = [
  { id: "l1", name: "1º Lote", order: 1, priceCents: 30000, capacity: 80 },
  { id: "l2", name: "2º Lote", order: 2, priceCents: 40000, capacity: 80 },
  { id: "l3", name: "3º Lote", order: 3, priceCents: 40000, capacity: 80 },
];

// Datas de referência (horário de Brasília).
const JULHO = new Date("2026-07-15T12:00:00-03:00");
const AGOSTO = new Date("2026-08-15T12:00:00-03:00");
const SETEMBRO = new Date("2026-09-15T12:00:00-03:00");

describe("activeOrderForDate", () => {
  it("julho → lote 1", () => {
    expect(activeOrderForDate(JULHO)).toBe(1);
  });
  it("agosto → lote 2", () => {
    expect(activeOrderForDate(AGOSTO)).toBe(2);
  });
  it("setembro em diante → lote 3", () => {
    expect(activeOrderForDate(SETEMBRO)).toBe(3);
    expect(activeOrderForDate(new Date("2027-01-01T00:00:00-03:00"))).toBe(3);
  });

  it("viradas exatas à meia-noite", () => {
    expect(activeOrderForDate(new Date("2026-07-31T23:59:59-03:00"))).toBe(1);
    expect(activeOrderForDate(new Date("2026-08-01T00:00:00-03:00"))).toBe(2);
    expect(activeOrderForDate(new Date("2026-08-31T23:59:59-03:00"))).toBe(2);
    expect(activeOrderForDate(new Date("2026-09-01T00:00:00-03:00"))).toBe(3);
  });
});

describe("resolveActiveLote — preço por data", () => {
  it("retorna null sem lotes", () => {
    expect(resolveActiveLote([], 0, JULHO)).toBeNull();
  });

  it("julho → 1º lote, R$300", () => {
    const a = resolveActiveLote(LOTES, 0, JULHO)!;
    expect(a.order).toBe(1);
    expect(a.priceCents).toBe(30000);
  });

  it("agosto → 2º lote, R$400 (independente de quantos venderam)", () => {
    const a = resolveActiveLote(LOTES, 3, AGOSTO)!;
    expect(a.order).toBe(2);
    expect(a.priceCents).toBe(40000);
  });

  it("setembro → 3º lote, R$400 (o preço parou de subir em agosto)", () => {
    const a = resolveActiveLote(LOTES, 3, SETEMBRO)!;
    expect(a.order).toBe(3);
    expect(a.priceCents).toBe(40000);
  });

  it("ordena lotes fora de ordem", () => {
    const shuffled = [LOTES[2], LOTES[0], LOTES[1]];
    expect(resolveActiveLote(shuffled, 0, JULHO)!.order).toBe(1);
  });
});

describe("resolveActiveLote — teto global de vagas", () => {
  it(`teto é ${TOTAL_CAPACITY}`, () => {
    expect(TOTAL_CAPACITY).toBe(150);
  });

  it("vagas restantes = teto − vendidos", () => {
    const a = resolveActiveLote(LOTES, 40, JULHO)!;
    expect(a.remainingInLote).toBe(110);
    expect(a.totalRemaining).toBe(110);
    expect(a.soldOut).toBe(false);
  });

  it("no teto → esgotado, mesmo em julho", () => {
    const a = resolveActiveLote(LOTES, 150, JULHO)!;
    expect(a.soldOut).toBe(true);
    expect(a.remainingInLote).toBe(0);
  });

  it("acima do teto não devolve vaga negativa", () => {
    const a = resolveActiveLote(LOTES, 160, AGOSTO)!;
    expect(a.soldOut).toBe(true);
    expect(a.remainingInLote).toBe(0);
  });

  it("1 antes do teto ainda tem vaga", () => {
    const a = resolveActiveLote(LOTES, 149, SETEMBRO)!;
    expect(a.soldOut).toBe(false);
    expect(a.remainingInLote).toBe(1);
  });
});
