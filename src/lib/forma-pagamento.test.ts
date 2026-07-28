import { describe, it, expect } from "vitest";
import {
  bloqueioTrocaForma,
  alvosDisponiveis,
  type PagamentoParaTroca,
} from "./forma-pagamento";

const avistaPix = (over: Partial<PagamentoParaTroca> = {}): PagamentoParaTroca => ({
  method: "PIX",
  status: "PENDING",
  installmentsTotal: null,
  installments: [],
  ...over,
});

const carne = (...statuses: string[]): PagamentoParaTroca => ({
  method: "PIX",
  status: "PENDING",
  installmentsTotal: statuses.length,
  installments: statuses.map((status) => ({ status })),
});

describe("bloqueioTrocaForma", () => {
  it("Pix à vista pendente pode virar cartão", () => {
    expect(bloqueioTrocaForma(avistaPix(), "CARD")).toBeNull();
  });

  it("cartão pendente pode virar Pix", () => {
    expect(bloqueioTrocaForma(avistaPix({ method: "CARD" }), "PIX")).toBeNull();
  });

  it("mesma forma não é troca", () => {
    expect(bloqueioTrocaForma(avistaPix(), "PIX")).toMatch(/já está/);
    expect(bloqueioTrocaForma(avistaPix({ method: "CARD" }), "CARD")).toMatch(
      /já está/,
    );
  });

  it("carnê → PIX é válido: vira à vista", () => {
    expect(bloqueioTrocaForma(carne("PENDING", "PENDING"), "PIX")).toBeNull();
    expect(bloqueioTrocaForma(carne("PENDING", "PENDING"), "CARD")).toBeNull();
  });

  it("pagamento confirmado nunca troca", () => {
    expect(bloqueioTrocaForma(avistaPix({ status: "CONFIRMED" }), "CARD")).toMatch(
      /confirmado/,
    );
  });

  it("comprovante na fila bloqueia — decida antes", () => {
    expect(
      bloqueioTrocaForma(avistaPix({ status: "AWAITING_REVIEW" }), "CARD"),
    ).toMatch(/aguardando revisão/);
  });

  it("carnê com parcela confirmada nunca troca", () => {
    expect(bloqueioTrocaForma(carne("CONFIRMED", "PENDING"), "CARD")).toMatch(
      /parcela confirmada/,
    );
  });

  it("carnê com parcela na fila bloqueia", () => {
    expect(bloqueioTrocaForma(carne("AWAITING_REVIEW", "PENDING"), "CARD")).toMatch(
      /aguardando revisão/,
    );
  });
});

describe("alvosDisponiveis", () => {
  it("Pix à vista → só cartão", () => {
    expect(alvosDisponiveis(avistaPix())).toEqual(["CARD"]);
  });

  it("cartão → só Pix", () => {
    expect(alvosDisponiveis(avistaPix({ method: "CARD" }))).toEqual(["PIX"]);
  });

  it("carnê limpo → Pix à vista e cartão", () => {
    expect(alvosDisponiveis(carne("PENDING", "PENDING", "PENDING"))).toEqual([
      "PIX",
      "CARD",
    ]);
  });

  it("carnê com parcela paga → nenhum alvo", () => {
    expect(alvosDisponiveis(carne("CONFIRMED", "PENDING"))).toEqual([]);
  });

  it("comprovante na fila → nenhum alvo", () => {
    expect(alvosDisponiveis(avistaPix({ status: "AWAITING_REVIEW" }))).toEqual([]);
  });
});
