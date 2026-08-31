/**
 * Ciclo do carnê — o teste que prova o bug da VAGA PRESA.
 *
 * Antes da Onda 1: rejeitar a única parcela paga retornava cedo e a inscrição
 * ficava CONFIRMED para sempre — vaga ocupada sem dinheiro. Este arquivo falha
 * no código antigo e passa no novo.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import {
  db,
  resetDb,
  seedLotes,
  seedAdmin,
  inscricaoValida,
  precoVigente,
  PARCELAS_NO_TESTE,
  congelarEmDataComCarne,
  descongelarRelogio,
} from "./helpers";
import { createRegistration } from "@/lib/registration.service";
import { reviewInstallment, reviewPixPayment } from "@/lib/payment.service";

let adminId: string;

beforeAll(async () => {
  // Sem congelar, de 26/08/2026 em diante não existe mais carnê e este arquivo
  // inteiro passa a criar inscrições à vista.
  congelarEmDataComCarne();
  await seedLotes();
  adminId = await seedAdmin();
});
beforeEach(resetDb);
afterAll(async () => {
  descongelarRelogio();
  await db.$disconnect();
});

/** Cria uma inscrição de carnê e devolve as parcelas ordenadas. */
// Quantas parcelas cabem na data de teste (ver DATA_COM_CARNE): o teto
// encolhe conforme o acampamento se aproxima, e chumbar 3 quebraria a suíte.
const N = PARCELAS_NO_TESTE;

async function criarCarne(parcelas = N) {
  const criada = await createRegistration(
    inscricaoValida({ paymentMethod: "PIX", installments: parcelas }),
  );
  const payment = await db.payment.findUniqueOrThrow({
    where: { registrationId: criada.id },
    include: { installments: { orderBy: { number: "asc" } } },
  });
  return { registrationId: criada.id, payment };
}

describe("carnê — ciclo completo", () => {
  it("cria as parcelas somando o valor do lote", async () => {
    const { payment } = await criarCarne(N);
    expect(payment.installments).toHaveLength(N);
    expect(payment.installmentsTotal).toBe(N);
    expect(payment.amountCents).toBe(await precoVigente());
    const soma = payment.installments.reduce((s, i) => s + i.amountCents, 0);
    expect(soma).toBe(payment.amountCents);
    expect(payment.status).toBe("PENDING");
  });

  it("confirmar a 1ª parcela garante a vaga, mas não quita o pagamento", async () => {
    const { registrationId, payment } = await criarCarne(N);
    await reviewInstallment(payment.installments[0].id, "confirm", adminId);

    const reg = await db.registration.findUniqueOrThrow({
      where: { id: registrationId },
    });
    const pg = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(reg.status).toBe("CONFIRMED"); // vaga garantida
    expect(pg.status).toBe("PENDING"); // ainda deve 2 parcelas
  });

  it("REJEITAR a única parcela paga SOLTA a vaga (bug da vaga presa)", async () => {
    const { registrationId, payment } = await criarCarne(N);
    const p1 = payment.installments[0].id;

    await reviewInstallment(p1, "confirm", adminId);
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registrationId } })).status,
    ).toBe("CONFIRMED");

    // Admin percebe que o comprovante era falso/errado e rejeita.
    await reviewInstallment(p1, "reject", adminId, "comprovante ilegível");

    const reg = await db.registration.findUniqueOrThrow({
      where: { id: registrationId },
    });
    // ANTES: continuava CONFIRMED para sempre. AGORA: volta a dever.
    expect(reg.status).toBe("PENDING_PAYMENT");
    const inst = await db.installment.findUniqueOrThrow({ where: { id: p1 } });
    expect(inst.status).toBe("FAILED");
    expect(inst.reviewNote).toBe("comprovante ilegível");
    expect(inst.reviewedById).toBe(adminId);
  });

  it("rejeitar uma parcela NÃO solta a vaga se outra segue confirmada", async () => {
    const { registrationId, payment } = await criarCarne(N);
    await reviewInstallment(payment.installments[0].id, "confirm", adminId);
    await reviewInstallment(payment.installments[1].id, "confirm", adminId);
    await reviewInstallment(payment.installments[1].id, "reject", adminId);

    const reg = await db.registration.findUniqueOrThrow({
      where: { id: registrationId },
    });
    expect(reg.status).toBe("CONFIRMED"); // a 1ª ainda está paga
  });

  it("confirmar todas quita o pagamento; rejeitar uma depois o reabre", async () => {
    const { payment } = await criarCarne(N);
    for (const i of payment.installments) {
      await reviewInstallment(i.id, "confirm", adminId);
    }
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
    ).toBe("CONFIRMED");

    await reviewInstallment(payment.installments[N - 1].id, "reject", adminId);
    const pg = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(pg.status).toBe("PENDING"); // voltou a dever a 3ª
  });

  it("confirmação dupla da mesma parcela é recusada", async () => {
    const { payment } = await criarCarne(N);
    const p1 = payment.installments[0].id;
    await reviewInstallment(p1, "confirm", adminId);

    // Segundo voluntário clica "confirmar" com a tela velha aberta.
    await expect(reviewInstallment(p1, "confirm", adminId)).rejects.toThrow(
      /já está confirmada/i,
    );

    const inst = await db.installment.findUniqueOrThrow({ where: { id: p1 } });
    expect(inst.status).toBe("CONFIRMED");
  });

  it("carnê não pode ser quitado pela revisão do pagamento inteiro", async () => {
    const { payment } = await criarCarne(N);
    await expect(reviewPixPayment(payment.id, "confirm", adminId)).rejects.toThrow(
      /carnê/i,
    );
  });
});
