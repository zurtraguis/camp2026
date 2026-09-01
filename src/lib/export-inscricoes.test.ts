import { describe, it, expect } from "vitest";
import {
  COLUNAS_INSCRICOES,
  linhaInscricao,
  type InscricaoParaExport,
} from "./export-inscricoes";

const base = (over: Partial<InscricaoParaExport> = {}): InscricaoParaExport => ({
  publicCode: "RAIZ-ABC123",
  fullName: "Maria de Souza",
  birthDate: new Date("2010-04-15T12:00:00-03:00"),
  ageAtCamp: 16,
  gender: "FEMALE",
  phone: "92991234567",
  email: "maria@exemplo.com",
  shirtSize: "M",
  church: "Igreja Central",
  city: "Manaus",
  tribo: "CHARA",
  status: "CONFIRMED",
  adminNotes: null,
  createdAt: new Date("2026-07-10T12:00:00-03:00"),
  guardian: {
    name: "Ana de Souza",
    phone: "92998887777",
    email: "ana@exemplo.com",
    relationship: "mãe",
  },
  payment: {
    method: "PIX",
    amountCents: 40000,
    status: "CONFIRMED",
    installmentsTotal: null,
    couponCode: null,
    discountPercent: null,
    originalAmountCents: null,
    installments: [],
  },
  ...over,
});

describe("linhaInscricao", () => {
  it("traz a CAMISA — o campo que faltava na planilha", () => {
    // Foi o que motivou tudo isto: a família escolhe o tamanho no formulário,
    // e a exportação (usada para encomendar as camisas) não trazia.
    expect(linhaInscricao(base({ shirtSize: "GG" }), "1º Lote").camisa).toBe("GG");
  });

  it("camisa não informada vira vazio, não 'null' na célula", () => {
    expect(linhaInscricao(base({ shirtSize: null }), null).camisa).toBe("");
  });

  it("traz o resto do que a família preenche", () => {
    const l = linhaInscricao(base(), "2º Lote");
    expect(l).toMatchObject({
      codigo: "RAIZ-ABC123",
      nome: "Maria de Souza",
      nascimento: "15/04/2010",
      idade: 16,
      genero: "F",
      camisa: "M",
      igreja: "Igreja Central",
      cidade: "Manaus",
      tel: "92991234567",
      email: "maria@exemplo.com",
      resp: "Ana de Souza",
      parentesco: "mãe",
      respTel: "92998887777",
      respEmail: "ana@exemplo.com",
      lote: "2º Lote",
    });
  });

  it("toda coluna declarada tem valor na linha (nenhuma sai em branco por engano)", () => {
    // O bug era este: a coluna não existia. Amarrar as duas listas garante que
    // acrescentar coluna sem preencher (ou o contrário) falhe aqui.
    const l = linhaInscricao(base(), "1º Lote");
    const chavesDeclaradas = COLUNAS_INSCRICOES.map((c) => c.key).sort();
    expect(Object.keys(l).sort()).toEqual(chavesDeclaradas);
  });

  it("carnê mostra quantas parcelas já foram pagas", () => {
    const l = linhaInscricao(
      base({
        payment: {
          method: "PIX",
          amountCents: 40000,
          status: "PENDING",
          installmentsTotal: 3,
          couponCode: null,
          discountPercent: null,
          originalAmountCents: null,
          installments: [
            { status: "CONFIRMED" },
            { status: "AWAITING_REVIEW" },
            { status: "PENDING" },
          ],
        },
      }),
      "1º Lote",
    );
    expect(l.forma).toBe("Carnê 3x");
    expect(l.parcelasPagas).toBe("1/3");
  });

  it("à vista não inventa '0/0' na coluna de parcelas", () => {
    expect(linhaInscricao(base(), "1º Lote").parcelasPagas).toBe("");
  });

  it("cupom aparece com o percentual e o valor cheio ao lado", () => {
    const l = linhaInscricao(
      base({
        payment: {
          method: "PIX",
          amountCents: 0,
          status: "CONFIRMED",
          installmentsTotal: null,
          couponCode: "BOLSA",
          discountPercent: 100,
          originalAmountCents: 40000,
          installments: [],
        },
      }),
      "2º Lote",
    );
    expect(l.cupom).toBe("BOLSA (−100%)");
    expect(l.valor).toBe(0);
    expect(l.cheio).toBe(400);
  });

  it("sem pagamento não quebra a linha", () => {
    const l = linhaInscricao(base({ payment: null }), null);
    expect(l.forma).toBe("");
    expect(l.valor).toBeNull();
    expect(l.nome).toBe("Maria de Souza");
  });

  it("leva a observação interna da organização", () => {
    const l = linhaInscricao(base({ adminNotes: "Bolsa combinada." }), "1º Lote");
    expect(l.obs).toBe("Bolsa combinada.");
  });

  it("NÃO leva dado de saúde nem CPF — a planilha circula", () => {
    // Minimização (LGPD): saúde tem relatório próprio; o CPF a ficha mostra
    // parcial de propósito. Se alguém acrescentar, este teste avisa.
    const chaves = COLUNAS_INSCRICOES.map((c) => c.key.toLowerCase());
    for (const proibida of ["cpf", "alergia", "medicacao", "saude", "triagem"]) {
      expect(chaves.some((k) => k.includes(proibida))).toBe(false);
    }
  });
});
