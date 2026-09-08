import { describe, it, expect } from "vitest";
import {
  STATUS_ATIVOS,
  ATIVAS,
  estaAtiva,
  bloqueioDesativar,
  bloqueioReativar,
} from "./registration-status";

describe("quem está dentro do acampamento", () => {
  it("desativada e cancelada ficam de FORA", () => {
    // O ponto da mudança inteira: quem foi desativado não ocupa vaga, não
    // entra em tribo, não aparece na cobrança nem no relatório de saúde.
    expect(estaAtiva("PENDING_PAYMENT")).toBe(true);
    expect(estaAtiva("AWAITING_REVIEW")).toBe(true);
    expect(estaAtiva("CONFIRMED")).toBe(true);
    expect(estaAtiva("INACTIVE")).toBe(false);
    expect(estaAtiva("CANCELLED")).toBe(false);
  });

  it("o filtro do Prisma lista os ativos, em vez de excluir os inativos", () => {
    // `not: CANCELLED` era o padrão antigo e passou a estar ERRADO: incluía
    // as desativadas. Listar quem entra falha de forma segura quando um status
    // novo aparecer — o desconhecido fica de fora até alguém decidir.
    expect(ATIVAS).toEqual({ status: { in: STATUS_ATIVOS } });
    expect(STATUS_ATIVOS).not.toContain("INACTIVE");
    expect(STATUS_ATIVOS).not.toContain("CANCELLED");
  });
});

describe("bloqueioDesativar", () => {
  it("libera quem não pagou nada — o caso real", () => {
    expect(
      bloqueioDesativar({
        status: "PENDING_PAYMENT",
        temPagamentoConfirmado: false,
      }),
    ).toBeNull();
  });

  it("libera quem mandou comprovante mas ainda não foi confirmado", () => {
    expect(
      bloqueioDesativar({
        status: "AWAITING_REVIEW",
        temPagamentoConfirmado: false,
      }),
    ).toBeNull();
  });

  it("RECUSA quando há dinheiro confirmado", () => {
    // Desativar aqui criaria um valor a devolver sem nenhum registro disso.
    // A decisão vira humana: cancelar e acertar a devolução por fora.
    const m = bloqueioDesativar({
      status: "CONFIRMED",
      temPagamentoConfirmado: true,
    });
    expect(m).toMatch(/devolver/i);
  });

  it("recusa desativar duas vezes ou mexer numa cancelada", () => {
    expect(
      bloqueioDesativar({ status: "INACTIVE", temPagamentoConfirmado: false }),
    ).toMatch(/já está desativada/i);
    expect(
      bloqueioDesativar({ status: "CANCELLED", temPagamentoConfirmado: false }),
    ).toMatch(/cancelada/i);
  });
});

describe("bloqueioReativar", () => {
  it("libera só quem está desativada", () => {
    expect(bloqueioReativar({ status: "INACTIVE" })).toBeNull();
  });

  it("recusa quem já está ativa", () => {
    for (const s of STATUS_ATIVOS) {
      expect(bloqueioReativar({ status: s })).toMatch(/já está ativa/i);
    }
  });

  it("cancelada não volta — faz-se inscrição nova", () => {
    expect(bloqueioReativar({ status: "CANCELLED" })).toMatch(/nova/i);
  });
});
