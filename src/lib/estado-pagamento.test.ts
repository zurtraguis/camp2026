import { describe, it, expect } from "vitest";
import {
  statusDaInscricaoPorParcelas,
  bloqueioEnvioComprovante,
  bloqueioEnvioParcela,
} from "./estado-pagamento";

const p = (...st: string[]) => st.map((status) => ({ status }));

describe("statusDaInscricaoPorParcelas", () => {
  it("qualquer parcela confirmada garante a vaga", () => {
    expect(statusDaInscricaoPorParcelas(p("CONFIRMED", "PENDING", "PENDING"))).toBe(
      "CONFIRMED",
    );
    expect(statusDaInscricaoPorParcelas(p("PENDING", "CONFIRMED"))).toBe("CONFIRMED");
  });

  it("comprovante na fila (sem confirmada) → em revisão", () => {
    expect(statusDaInscricaoPorParcelas(p("AWAITING_REVIEW", "PENDING"))).toBe(
      "AWAITING_REVIEW",
    );
  });

  it("nada pago nem na fila → aguardando pagamento", () => {
    expect(statusDaInscricaoPorParcelas(p("PENDING", "PENDING"))).toBe(
      "PENDING_PAYMENT",
    );
  });

  it("REJEITAR a única parcela paga solta a vaga — o bug da vaga presa", () => {
    // Antes: rejeitar retornava cedo e a inscrição ficava CONFIRMED para sempre.
    const antes = statusDaInscricaoPorParcelas(p("CONFIRMED", "PENDING", "PENDING"));
    const depois = statusDaInscricaoPorParcelas(p("FAILED", "PENDING", "PENDING"));
    expect(antes).toBe("CONFIRMED");
    expect(depois).toBe("PENDING_PAYMENT");
  });

  it("rejeitar uma parcela NÃO solta a vaga se outra segue confirmada", () => {
    expect(statusDaInscricaoPorParcelas(p("CONFIRMED", "FAILED"))).toBe("CONFIRMED");
  });

  it("confirmada tem precedência sobre em revisão", () => {
    expect(statusDaInscricaoPorParcelas(p("CONFIRMED", "AWAITING_REVIEW"))).toBe(
      "CONFIRMED",
    );
  });

  it("carnê sem parcelas (dados inconsistentes) não quebra", () => {
    expect(statusDaInscricaoPorParcelas([])).toBe("PENDING_PAYMENT");
  });
});

describe("bloqueioEnvioComprovante (Pix à vista)", () => {
  const base = {
    method: "PIX",
    status: "PENDING",
    installmentsTotal: null,
    temParcelas: false,
    registrationStatus: "PENDING_PAYMENT",
  };

  it("Pix à vista pendente aceita comprovante", () => {
    expect(bloqueioEnvioComprovante(base)).toBeNull();
  });

  it("reenvio após recusa é permitido", () => {
    expect(bloqueioEnvioComprovante({ ...base, status: "FAILED" })).toBeNull();
  });

  it("pagamento já confirmado recusa — não rebaixa inscrição paga", () => {
    expect(bloqueioEnvioComprovante({ ...base, status: "CONFIRMED" })).toMatch(
      /já está confirmado/,
    );
  });

  it("inscrição cancelada recusa", () => {
    expect(
      bloqueioEnvioComprovante({ ...base, registrationStatus: "CANCELLED" }),
    ).toMatch(/cancelada/);
  });

  it("cartão recusa", () => {
    expect(bloqueioEnvioComprovante({ ...base, method: "CARD" })).toMatch(/não é via Pix/);
  });

  it("carnê recusa nesta rota — tem que ser por parcela", () => {
    expect(bloqueioEnvioComprovante({ ...base, temParcelas: true })).toMatch(/carnê/);
    expect(bloqueioEnvioComprovante({ ...base, installmentsTotal: 3 })).toMatch(/carnê/);
  });

  it("inscrição em revisão ainda aceita reenvio (arquivo errado)", () => {
    expect(
      bloqueioEnvioComprovante({
        ...base,
        status: "AWAITING_REVIEW",
        registrationStatus: "AWAITING_REVIEW",
      }),
    ).toBeNull();
  });
});

describe("inscrição desativada", () => {
  it("não aceita comprovante — a vaga já foi liberada", () => {
    // Aceitar aqui daria à família a impressão de que a vaga continua de pé.
    // Ela precisa falar com a organização ANTES de pagar.
    const m = bloqueioEnvioComprovante({
      method: "PIX",
      status: "PENDING",
      installmentsTotal: null,
      temParcelas: false,
      registrationStatus: "INACTIVE",
    });
    expect(m).toMatch(/desativada/i);
    expect(m).toMatch(/organização/i);
  });

  it("também não aceita comprovante de parcela", () => {
    expect(
      bloqueioEnvioParcela({
        installmentStatus: "PENDING",
        registrationStatus: "INACTIVE",
      }),
    ).toMatch(/desativada/i);
  });
});

describe("bloqueioEnvioParcela", () => {
  it("parcela pendente aceita", () => {
    expect(
      bloqueioEnvioParcela({
        installmentStatus: "PENDING",
        registrationStatus: "CONFIRMED",
      }),
    ).toBeNull();
  });

  it("parcela confirmada recusa", () => {
    expect(
      bloqueioEnvioParcela({
        installmentStatus: "CONFIRMED",
        registrationStatus: "CONFIRMED",
      }),
    ).toMatch(/já foi confirmada/);
  });

  it("inscrição cancelada recusa", () => {
    expect(
      bloqueioEnvioParcela({
        installmentStatus: "PENDING",
        registrationStatus: "CANCELLED",
      }),
    ).toMatch(/cancelada/);
  });

  it("parcela recusada aceita reenvio", () => {
    expect(
      bloqueioEnvioParcela({
        installmentStatus: "FAILED",
        registrationStatus: "CONFIRMED",
      }),
    ).toBeNull();
  });
});
