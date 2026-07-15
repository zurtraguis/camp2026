import { describe, it, expect } from "vitest";
import { notaBaixaManual, FORMAS_RECEBIMENTO } from "./baixa";
import { baixaManualSchema } from "./validation";

describe("notaBaixaManual", () => {
  it("registra a forma mesmo sem observação", () => {
    expect(notaBaixaManual("DINHEIRO")).toBe("Baixa manual — recebido em dinheiro");
    expect(notaBaixaManual("CARTAO")).toBe("Baixa manual — recebido em cartão");
    expect(notaBaixaManual("PIX")).toBe("Baixa manual — recebido em Pix");
    expect(notaBaixaManual("OUTRO")).toBe("Baixa manual — recebido em outro");
  });

  it("anexa a observação quando existe", () => {
    expect(notaBaixaManual("DINHEIRO", "pagou na igreja domingo")).toBe(
      "Baixa manual — recebido em dinheiro: pagou na igreja domingo",
    );
  });

  it("observação só com espaço não polui a nota", () => {
    expect(notaBaixaManual("PIX", "   ")).toBe("Baixa manual — recebido em Pix");
  });

  it("sempre marca que foi manual — é o que separa da confirmação por comprovante", () => {
    for (const forma of FORMAS_RECEBIMENTO) {
      expect(notaBaixaManual(forma, "x")).toContain("Baixa manual");
    }
  });
});

describe("baixaManualSchema", () => {
  const base = { forma: "DINHEIRO" as const };

  it("aceita só pagamento", () => {
    expect(baixaManualSchema.safeParse({ ...base, paymentId: "p1" }).success).toBe(true);
  });

  it("aceita só parcela", () => {
    expect(
      baixaManualSchema.safeParse({ ...base, installmentId: "i1" }).success,
    ).toBe(true);
  });

  it("rejeita os dois juntos — o alvo tem que ser único", () => {
    expect(
      baixaManualSchema.safeParse({ ...base, paymentId: "p1", installmentId: "i1" })
        .success,
    ).toBe(false);
  });

  it("rejeita nenhum alvo", () => {
    expect(baixaManualSchema.safeParse(base).success).toBe(false);
  });

  it("exige forma — sem ela não há trilha de como o dinheiro entrou", () => {
    expect(baixaManualSchema.safeParse({ paymentId: "p1" }).success).toBe(false);
    expect(
      baixaManualSchema.safeParse({ paymentId: "p1", forma: "" }).success,
    ).toBe(false);
    expect(
      baixaManualSchema.safeParse({ paymentId: "p1", forma: "CHEQUE" }).success,
    ).toBe(false);
  });

  it("limita o tamanho da observação", () => {
    expect(
      baixaManualSchema.safeParse({ ...base, paymentId: "p1", note: "x".repeat(501) })
        .success,
    ).toBe(false);
  });
});
