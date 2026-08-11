import { describe, it, expect } from "vitest";
import {
  saldoDaDespesa,
  totaisDosCustos,
  totaisPorCategoria,
  balanco,
  type DespesaParaSaldo,
} from "./custos";

const HOJE = new Date("2026-08-15T12:00:00-03:00");
const dia = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

const despesa = (over: Partial<DespesaParaSaldo> = {}): DespesaParaSaldo => ({
  amountCents: 500000, // R$5.000
  dueDate: null,
  payments: [],
  ...over,
});

describe("saldoDaDespesa", () => {
  it("sem pagamento: tudo em aberto", () => {
    const s = saldoDaDespesa(despesa(), HOJE);
    expect(s.pagoCents).toBe(0);
    expect(s.abertoCents).toBe(500000);
    expect(s.quitada).toBe(false);
  });

  it("o caso do aluguel: entrada de R$2.000 paga, R$3.000 em aberto", () => {
    const s = saldoDaDespesa(
      despesa({ payments: [{ amountCents: 200000, paidAt: dia("2026-08-01") }] }),
      HOJE,
    );
    expect(s.pagoCents).toBe(200000);
    expect(s.abertoCents).toBe(300000);
    expect(s.quitada).toBe(false);
    expect(s.ultimoPagamentoEm).toEqual(dia("2026-08-01"));
  });

  it("soma vários pagamentos parciais até quitar", () => {
    const s = saldoDaDespesa(
      despesa({
        payments: [
          { amountCents: 200000, paidAt: dia("2026-08-01") },
          { amountCents: 300000, paidAt: dia("2026-09-01") },
        ],
      }),
      HOJE,
    );
    expect(s.pagoCents).toBe(500000);
    expect(s.abertoCents).toBe(0);
    expect(s.quitada).toBe(true);
    expect(s.ultimoPagamentoEm).toEqual(dia("2026-09-01"));
  });

  it("sinaliza quando pagou MAIS que o combinado (erro de digitação ou reajuste)", () => {
    const s = saldoDaDespesa(
      despesa({ payments: [{ amountCents: 600000, paidAt: dia("2026-08-01") }] }),
      HOJE,
    );
    expect(s.excedeu).toBe(true);
    expect(s.abertoCents).toBe(0); // nunca negativo
  });

  it("vencida só quando passou da data E ainda há saldo", () => {
    const comSaldo = saldoDaDespesa(
      despesa({ dueDate: dia("2026-08-10") }),
      HOJE,
    );
    expect(comSaldo.vencida).toBe(true);

    const quitadaVencida = saldoDaDespesa(
      despesa({
        dueDate: dia("2026-08-10"),
        payments: [{ amountCents: 500000, paidAt: dia("2026-08-05") }],
      }),
      HOJE,
    );
    expect(quitadaVencida.vencida).toBe(false);
  });

  it("vencimento futuro não é vencida", () => {
    expect(saldoDaDespesa(despesa({ dueDate: dia("2026-09-20") }), HOJE).vencida).toBe(
      false,
    );
  });

  it("sem vencimento nunca vence", () => {
    expect(saldoDaDespesa(despesa({ dueDate: null }), HOJE).vencida).toBe(false);
  });
});

describe("totaisDosCustos", () => {
  it("soma previsto, pago e em aberto", () => {
    const t = totaisDosCustos(
      [
        despesa({
          amountCents: 500000,
          payments: [{ amountCents: 200000, paidAt: dia("2026-08-01") }],
        }),
        despesa({ amountCents: 100000 }),
      ],
      HOJE,
    );
    expect(t.previstoCents).toBe(600000);
    expect(t.pagoCents).toBe(200000);
    expect(t.abertoCents).toBe(400000);
    expect(t.quantidade).toBe(2);
  });

  it("vencido conta só o saldo do que passou da data", () => {
    const t = totaisDosCustos(
      [
        despesa({ amountCents: 500000, dueDate: dia("2026-08-01") }), // vencida
        despesa({ amountCents: 100000, dueDate: dia("2026-09-30") }), // no prazo
      ],
      HOJE,
    );
    expect(t.vencidoCents).toBe(500000);
  });

  it("lista vazia devolve zeros", () => {
    const t = totaisDosCustos([], HOJE);
    expect(t).toEqual({
      previstoCents: 0,
      pagoCents: 0,
      abertoCents: 0,
      vencidoCents: 0,
      quantidade: 0,
    });
  });
});

describe("totaisPorCategoria", () => {
  it("agrupa e ordena pelo maior previsto", () => {
    const r = totaisPorCategoria(
      [
        { ...despesa({ amountCents: 100000 }), category: "ALIMENTACAO" },
        { ...despesa({ amountCents: 500000 }), category: "LOCAL" },
        { ...despesa({ amountCents: 50000 }), category: "ALIMENTACAO" },
      ],
      HOJE,
    );
    expect(r[0]).toEqual({ categoria: "LOCAL", previstoCents: 500000, pagoCents: 0 });
    expect(r[1]).toEqual({
      categoria: "ALIMENTACAO",
      previstoCents: 150000,
      pagoCents: 0,
    });
  });
});

describe("balanco", () => {
  it("saldo é o que entrou menos o que JÁ saiu", () => {
    const custos = totaisDosCustos(
      [
        despesa({
          amountCents: 500000,
          payments: [{ amountCents: 200000, paidAt: dia("2026-08-01") }],
        }),
      ],
      HOJE,
    );
    const b = balanco(180000, 410000, custos);
    expect(b.entrouCents).toBe(180000);
    expect(b.saiuCents).toBe(200000);
    expect(b.saldoCents).toBe(-20000); // gastou mais do que entrou até agora
  });

  it("projetado considera o que falta receber e o que falta pagar", () => {
    const custos = totaisDosCustos([despesa({ amountCents: 500000 })], HOJE);
    // Recebido 180.000 + a receber 410.000 = 590.000; custo previsto 500.000.
    const b = balanco(180000, 410000, custos);
    expect(b.projetadoCents).toBe(90000);
  });

  it("projetado negativo avisa que o acampamento não fecha", () => {
    const custos = totaisDosCustos([despesa({ amountCents: 900000 })], HOJE);
    expect(balanco(180000, 410000, custos).projetadoCents).toBeLessThan(0);
  });
});
