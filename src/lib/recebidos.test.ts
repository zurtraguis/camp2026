import { describe, it, expect } from "vitest";
import {
  extrairRecebimentos,
  origemDoRecebimento,
  totaisPorOrigem,
  totalRecebido,
  type PagamentoParaExtrato,
} from "./recebidos";

const reg = (code: string, nome: string) => ({ publicCode: code, fullName: nome });

const avista = (over: Partial<PagamentoParaExtrato> = {}): PagamentoParaExtrato => ({
  id: "p1",
  method: "PIX",
  status: "CONFIRMED",
  amountCents: 30000,
  reviewedAt: new Date("2026-07-10T12:00:00-03:00"),
  reviewNote: null,
  reviewedBy: { name: "Alexandre" },
  registration: reg("RAIZ-AAAA1111", "Maria"),
  installments: [],
  ...over,
});

const carne = (
  statuses: string[],
  over: Partial<PagamentoParaExtrato> = {},
): PagamentoParaExtrato => ({
  ...avista({ id: "p2", status: "PENDING", registration: reg("RAIZ-BBBB2222", "João") }),
  installments: statuses.map((status, i) => ({
    id: `i${i + 1}`,
    number: i + 1,
    amountCents: 10000,
    status,
    reviewedAt: new Date(`2026-07-${11 + i}T12:00:00-03:00`),
    reviewNote: null,
    reviewedBy: { name: "Alexandre" },
  })),
  ...over,
});

describe("origemDoRecebimento", () => {
  it("sem baixa manual, vale o método do pagamento", () => {
    expect(origemDoRecebimento("PIX", null)).toBe("PIX");
    expect(origemDoRecebimento("CARD", null)).toBe("CARTAO");
  });

  it("baixa manual manda na origem — é a única prova de como entrou", () => {
    expect(
      origemDoRecebimento("PIX", "Baixa manual — recebido em dinheiro: na igreja"),
    ).toBe("DINHEIRO");
    expect(origemDoRecebimento("PIX", "Baixa manual — recebido em cartão")).toBe(
      "CARTAO",
    );
    expect(origemDoRecebimento("CARD", "Baixa manual — recebido em Pix")).toBe("PIX");
    expect(origemDoRecebimento("PIX", "Baixa manual — recebido em outro")).toBe(
      "OUTRO",
    );
  });

  it("nota que não é de baixa manual não confunde a origem", () => {
    expect(origemDoRecebimento("PIX", "comprovante ilegível")).toBe("PIX");
  });
});

describe("extrairRecebimentos", () => {
  it("à vista confirmado vira uma linha", () => {
    const linhas = extrairRecebimentos([avista()]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      publicCode: "RAIZ-AAAA1111",
      descricao: "À vista",
      valorCents: 30000,
      origem: "PIX",
      confirmadoPor: "Alexandre",
    });
  });

  it("à vista NÃO confirmado não entra", () => {
    expect(extrairRecebimentos([avista({ status: "PENDING" })])).toHaveLength(0);
    expect(extrairRecebimentos([avista({ status: "AWAITING_REVIEW" })])).toHaveLength(0);
    expect(extrairRecebimentos([avista({ status: "FAILED" })])).toHaveLength(0);
  });

  it("carnê entra parcela a parcela — só as confirmadas", () => {
    const linhas = extrairRecebimentos([
      carne(["CONFIRMED", "CONFIRMED", "PENDING"]),
    ]);
    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => l.descricao).sort()).toEqual([
      "1ª parcela",
      "2ª parcela",
    ]);
    expect(totalRecebido(linhas)).toBe(20000);
  });

  it("carnê quitado NÃO conta duas vezes (nem o payment, nem em dobro)", () => {
    // O payment de um carnê vira CONFIRMED quando todas as parcelas entram;
    // contar os dois inflaria o caixa.
    const linhas = extrairRecebimentos([
      carne(["CONFIRMED", "CONFIRMED", "CONFIRMED"], { status: "CONFIRMED" }),
    ]);
    expect(linhas).toHaveLength(3);
    expect(totalRecebido(linhas)).toBe(30000);
  });

  it("parcela rejeitada não conta", () => {
    const linhas = extrairRecebimentos([carne(["CONFIRMED", "FAILED", "PENDING"])]);
    expect(linhas).toHaveLength(1);
    expect(totalRecebido(linhas)).toBe(10000);
  });

  it("ordena do mais recente para o mais antigo", () => {
    const antigo = avista({
      id: "velho",
      reviewedAt: new Date("2026-07-01T12:00:00-03:00"),
    });
    const novo = avista({
      id: "novo",
      reviewedAt: new Date("2026-07-20T12:00:00-03:00"),
    });
    expect(extrairRecebimentos([antigo, novo]).map((l) => l.id)).toEqual([
      "novo",
      "velho",
    ]);
  });
});

describe("totaisPorOrigem", () => {
  it("agrupa e soma por meio, do maior para o menor", () => {
    const linhas = extrairRecebimentos([
      avista({ id: "a", amountCents: 30000 }),
      avista({
        id: "b",
        amountCents: 50000,
        reviewNote: "Baixa manual — recebido em dinheiro",
      }),
      avista({
        id: "c",
        amountCents: 10000,
        reviewNote: "Baixa manual — recebido em dinheiro",
      }),
    ]);
    const t = totaisPorOrigem(linhas);
    expect(t[0]).toEqual({ origem: "DINHEIRO", totalCents: 60000, qtd: 2 });
    expect(t[1]).toEqual({ origem: "PIX", totalCents: 30000, qtd: 1 });
  });

  it("a soma das origens fecha com o total geral", () => {
    const linhas = extrairRecebimentos([
      avista({ id: "a" }),
      carne(["CONFIRMED", "CONFIRMED"]),
    ]);
    const somaOrigens = totaisPorOrigem(linhas).reduce(
      (s, o) => s + o.totalCents,
      0,
    );
    expect(somaOrigens).toBe(totalRecebido(linhas));
  });
});
