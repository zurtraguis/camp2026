/**
 * Pix à vista e baixa manual — os fluxos do admin que mexem em dinheiro e nunca
 * tinham teste tocando o banco.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { db, resetDb, seedLotes, seedAdmin, inscricaoValida } from "./helpers";
import { createRegistration } from "@/lib/registration.service";
import {
  reviewPixPayment,
  baixaManualPagamento,
  baixaManualParcela,
} from "@/lib/payment.service";
// NOTA: os testes de `alterarFormaPagamento` (troca Pix ↔ cartão) ficam de fora
// deste arquivo porque a função vive no PR #29 (em-aberto consolidado), que não
// está nesta pilha. Adicionar assim que o #29 mergear.

let adminId: string;

beforeAll(async () => {
  await seedLotes();
  adminId = await seedAdmin();
});
beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function criar(over: Parameters<typeof inscricaoValida>[0] = {}) {
  const criada = await createRegistration(inscricaoValida(over));
  const payment = await db.payment.findUniqueOrThrow({
    where: { registrationId: criada.id },
    include: { installments: { orderBy: { number: "asc" } } },
  });
  return { registrationId: criada.id, payment };
}

describe("Pix à vista — revisão", () => {
  it("confirmar quita o pagamento e confirma a inscrição", async () => {
    const { registrationId, payment } = await criar();
    await reviewPixPayment(payment.id, "confirm", adminId, "ok");

    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    const pg = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(reg.status).toBe("CONFIRMED");
    expect(pg.status).toBe("CONFIRMED");
    expect(pg.reviewedById).toBe(adminId);
  });

  it("rejeitar devolve a inscrição para aguardando pagamento", async () => {
    const { registrationId, payment } = await criar();
    await reviewPixPayment(payment.id, "reject", adminId, "valor errado");

    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    expect(reg.status).toBe("PENDING_PAYMENT");
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
    ).toBe("FAILED");
  });

  it("confirmação dupla é recusada (dois voluntários no mesmo comprovante)", async () => {
    const { registrationId, payment } = await criar();
    await reviewPixPayment(payment.id, "confirm", adminId);

    await expect(reviewPixPayment(payment.id, "confirm", adminId)).rejects.toThrow(
      /já está confirmado/i,
    );

    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    expect(reg.status).toBe("CONFIRMED");
  });

  it("rejeitar um pagamento confirmado é PERMITIDO — desfaz comprovante falso", async () => {
    // Sem este caminho, uma confirmação por engano ficaria presa para sempre.
    const { registrationId, payment } = await criar();
    await reviewPixPayment(payment.id, "confirm", adminId);
    await reviewPixPayment(payment.id, "reject", adminId, "comprovante falso");

    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    expect(reg.status).toBe("PENDING_PAYMENT");
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status,
    ).toBe("FAILED");
  });
});

describe("baixa manual", () => {
  it("à vista: registra a forma e quem deu a baixa", async () => {
    const { registrationId, payment } = await criar();
    await baixaManualPagamento(payment.id, adminId, "DINHEIRO", "pagou na igreja");

    const pg = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(pg.status).toBe("CONFIRMED");
    expect(pg.reviewedById).toBe(adminId);
    expect(pg.reviewNote).toMatch(/Baixa manual/);
    expect(pg.reviewNote).toMatch(/dinheiro/);
    expect(pg.reviewNote).toMatch(/pagou na igreja/);
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registrationId } })).status,
    ).toBe("CONFIRMED");
  });

  it("carnê: baixa do pagamento inteiro é bloqueada", async () => {
    const { payment } = await criar({ installments: 3 });
    await expect(
      baixaManualPagamento(payment.id, adminId, "DINHEIRO"),
    ).rejects.toThrow(/parcela a parcela/i);
  });

  it("carnê: baixa por parcela funciona mesmo sem comprovante (dinheiro)", async () => {
    const { registrationId, payment } = await criar({ installments: 3 });
    const p1 = payment.installments[0];
    expect(p1.status).toBe("PENDING"); // nunca passou pela fila de revisão

    await baixaManualParcela(p1.id, adminId, "CARTAO", "maquininha na igreja");

    const inst = await db.installment.findUniqueOrThrow({ where: { id: p1.id } });
    expect(inst.status).toBe("CONFIRMED");
    expect(inst.reviewNote).toMatch(/cartão/);
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registrationId } })).status,
    ).toBe("CONFIRMED"); // vaga garantida pela 1ª parcela
  });

  it("baixa em pagamento já confirmado é recusada", async () => {
    const { payment } = await criar();
    await baixaManualPagamento(payment.id, adminId, "PIX");
    await expect(baixaManualPagamento(payment.id, adminId, "PIX")).rejects.toThrow(
      /já está confirmado/i,
    );
  });
});
