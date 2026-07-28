/**
 * Cupom sob concorrência e regras de criação de inscrição — os caminhos onde
 * "duas famílias enviam ao mesmo tempo" decide se o desconto estoura o limite.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { db, resetDb, seedLotes, inscricaoValida } from "./helpers";
import {
  createRegistration,
  deleteRegistration,
} from "@/lib/registration.service";

beforeAll(seedLotes);
beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function criarCupom(over: Record<string, unknown> = {}) {
  return db.coupon.create({
    data: {
      code: "RAIZ10",
      percentOff: 10,
      active: true,
      expiresAt: null,
      maxUses: null,
      ...over,
    },
  });
}

describe("cupom aplicado na inscrição", () => {
  it("desconta o valor e guarda a auditoria do preço cheio", async () => {
    await criarCupom({ percentOff: 10 });
    const criada = await createRegistration(
      inscricaoValida({ couponCode: "RAIZ10" }),
    );

    const pg = await db.payment.findUniqueOrThrow({
      where: { registrationId: criada.id },
    });
    expect(pg.amountCents).toBe(27000); // 300 - 10%
    expect(pg.originalAmountCents).toBe(30000);
    expect(pg.discountPercent).toBe(10);
    expect(pg.couponCode).toBe("RAIZ10");

    const cupom = await db.coupon.findUniqueOrThrow({ where: { code: "RAIZ10" } });
    expect(cupom.uses).toBe(1);
  });

  it("desconto vale também nas parcelas do carnê", async () => {
    await criarCupom({ percentOff: 10 });
    const criada = await createRegistration(
      inscricaoValida({ couponCode: "RAIZ10", installments: 3 }),
    );
    const pg = await db.payment.findUniqueOrThrow({
      where: { registrationId: criada.id },
      include: { installments: true },
    });
    const soma = pg.installments.reduce((s, i) => s + i.amountCents, 0);
    expect(soma).toBe(27000);
  });

  it("cupom inativo/expirado derruba a inscrição com mensagem clara", async () => {
    await criarCupom({ code: "OFF", active: false });
    await expect(
      createRegistration(inscricaoValida({ couponCode: "OFF" })),
    ).rejects.toThrow(/não está mais ativo/i);

    await criarCupom({
      code: "VELHO",
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });
    await expect(
      createRegistration(inscricaoValida({ couponCode: "VELHO" })),
    ).rejects.toThrow(/expirou/i);
  });

  it("código inexistente não cria inscrição fantasma", async () => {
    await expect(
      createRegistration(inscricaoValida({ couponCode: "NAOEXISTE" })),
    ).rejects.toThrow(/não encontrado/i);
    expect(await db.registration.count()).toBe(0);
  });

  it("maxUses=1 com DUAS inscrições simultâneas: exatamente 1 passa", async () => {
    await criarCupom({ maxUses: 1 });

    const r = await Promise.allSettled([
      createRegistration(inscricaoValida({ couponCode: "RAIZ10", cpf: "11111111111" })),
      createRegistration(inscricaoValida({ couponCode: "RAIZ10", cpf: "22222222222" })),
    ]);
    const ok = r.filter((x) => x.status === "fulfilled").length;
    expect(ok).toBe(1);

    const cupom = await db.coupon.findUniqueOrThrow({ where: { code: "RAIZ10" } });
    expect(cupom.uses).toBe(1); // não estourou o limite
  });

  it("excluir a inscrição NÃO devolve o uso do cupom (limitação conhecida)", async () => {
    // Documenta o comportamento atual: cada duplicata limpa queima um uso.
    // Está no plano de revisão como P2.10.
    await criarCupom({ maxUses: 5 });
    const criada = await createRegistration(
      inscricaoValida({ couponCode: "RAIZ10" }),
    );
    await deleteRegistration(criada.id);

    const cupom = await db.coupon.findUniqueOrThrow({ where: { code: "RAIZ10" } });
    expect(cupom.uses).toBe(1); // ainda 1 — o uso não voltou
  });
});

describe("criação de inscrição", () => {
  it("bloqueia CPF de campista duplicado", async () => {
    await createRegistration(inscricaoValida({ cpf: "98765432100" }));
    await expect(
      createRegistration(
        inscricaoValida({ cpf: "98765432100", fullName: "Outro Nome" }),
      ),
    ).rejects.toThrow(/já existe uma inscrição/i);
    expect(await db.registration.count()).toBe(1);
  });

  it("permite irmãos: mesmo CPF de RESPONSÁVEL, campistas diferentes", async () => {
    await createRegistration(
      inscricaoValida({ cpf: "11111111111", guardianCpf: "12345678901" }),
    );
    await createRegistration(
      inscricaoValida({
        cpf: "22222222222",
        guardianCpf: "12345678901",
        fullName: "Irmão do Campista",
      }),
    );
    expect(await db.registration.count()).toBe(2);
  });

  it("exclusão leva junto responsável, saúde, consentimento e pagamento", async () => {
    const criada = await createRegistration(inscricaoValida({ installments: 3 }));
    await deleteRegistration(criada.id);

    expect(await db.registration.count()).toBe(0);
    expect(await db.guardian.count()).toBe(0);
    expect(await db.healthProfile.count()).toBe(0);
    expect(await db.consentRecord.count()).toBe(0);
    expect(await db.payment.count()).toBe(0);
    expect(await db.installment.count()).toBe(0); // cascade em dois níveis
  });

  it("cada inscrição recebe um código público único", async () => {
    const a = await createRegistration(inscricaoValida({ cpf: "11111111111" }));
    const b = await createRegistration(inscricaoValida({ cpf: "22222222222" }));
    expect(a.publicCode).not.toBe(b.publicCode);
    expect(a.publicCode).toMatch(/^RAIZ-/);
  });
});
