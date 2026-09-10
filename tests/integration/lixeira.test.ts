/**
 * Lixeira: excluir guarda a cópia, restaurar reconstrói.
 *
 * Este arquivo existe por causa de um prejuízo real: uma inscrição foi
 * excluída, não havia histórico nem backup, e o dado não voltou — o Supabase
 * não deixa ler a linha morta e não há PITR. Se algum dia o backup parar de
 * acontecer, é aqui que tem de falhar, e não na hora do aperto.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { db, resetDb, seedLotes, inscricaoValida } from "./helpers";
import { createRegistration } from "@/lib/registration.service";
import { excluirComBackup, restaurarInscricao } from "@/lib/lixeira.service";

const ADMIN = { id: "admin-teste", name: "Alexandre" };

beforeAll(seedLotes);
beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function criar() {
  const criada = await createRegistration(inscricaoValida());
  return criada.id;
}

describe("excluirComBackup", () => {
  it("apaga a inscrição E guarda a fotografia completa", async () => {
    const id = await criar();

    await excluirComBackup(id, ADMIN, "desistiu; estorno feito");

    expect(await db.registration.findUnique({ where: { id } })).toBeNull();

    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: id },
    });
    expect(copia.deletedByName).toBe("Alexandre");
    expect(copia.reason).toBe("desistiu; estorno feito");

    // A cópia precisa ter o suficiente para reconstruir tudo — não só o nome.
    const snap = copia.snapshot as Record<string, unknown>;
    expect(snap.registration).toBeTruthy();
    expect(snap.guardian).toBeTruthy();
    expect(snap.health).toBeTruthy();
    expect(snap.consent).toBeTruthy();
    expect(snap.payment).toBeTruthy();
  });

  it("se não há o que excluir, não inventa registro na lixeira", async () => {
    await expect(excluirComBackup("nao-existe", ADMIN)).rejects.toThrow();
    expect(await db.deletedRegistration.count()).toBe(0);
  });
});

describe("restaurarInscricao", () => {
  it("reconstrói campista, responsável, saúde, consentimento e pagamento", async () => {
    const id = await criar();
    const antes = await db.registration.findUniqueOrThrow({
      where: { id },
      include: { guardian: true, health: true, consent: true, payment: true },
    });

    await excluirComBackup(id, ADMIN);
    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: id },
    });
    await restaurarInscricao(copia.id);

    const depois = await db.registration.findUniqueOrThrow({
      where: { id },
      include: { guardian: true, health: true, consent: true, payment: true },
    });

    // MESMO id: o comprovante no storage fica numa pasta nomeada pelo id, e
    // recriar com id novo deixaria o arquivo órfão.
    expect(depois.id).toBe(antes.id);
    expect(depois.publicCode).toBe(antes.publicCode);
    expect(depois.fullName).toBe(antes.fullName);
    expect(depois.cpf).toBe(antes.cpf);
    expect(depois.guardian?.name).toBe(antes.guardian?.name);
    expect(depois.guardian?.cpf).toBe(antes.guardian?.cpf);
    expect(depois.health?.allergies).toBe(antes.health?.allergies);
    expect(depois.consent?.termVersion).toBe(antes.consent?.termVersion);
    expect(depois.payment?.amountCents).toBe(antes.payment?.amountCents);
  });

  it("restaura as parcelas do carnê junto", async () => {
    const criada = await createRegistration(inscricaoValida());
    const pagamento = await db.payment.findUniqueOrThrow({
      where: { registrationId: criada.id },
      select: { id: true },
    });
    await db.installment.createMany({
      data: [1, 2].map((number) => ({
        paymentId: pagamento.id,
        number,
        amountCents: 15000,
        dueDate: new Date(),
      })),
    });

    await excluirComBackup(criada.id, ADMIN);
    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: criada.id },
    });
    await restaurarInscricao(copia.id);

    const pg = await db.payment.findUniqueOrThrow({
      where: { registrationId: criada.id },
      include: { installments: true },
    });
    expect(pg.installments).toHaveLength(2);
  });

  it("marca a cópia como restaurada e RECUSA restaurar de novo", async () => {
    const id = await criar();
    await excluirComBackup(id, ADMIN);
    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: id },
    });

    await restaurarInscricao(copia.id);
    const depois = await db.deletedRegistration.findUniqueOrThrow({
      where: { id: copia.id },
    });
    expect(depois.restoredAt).not.toBeNull();

    await expect(restaurarInscricao(copia.id)).rejects.toThrow(/restaurada/i);
  });

  it("RECUSA quando a família refez a inscrição no meio-tempo", async () => {
    // O conflito que importa: restaurar aqui daria duas vagas ao mesmo
    // adolescente. Melhor recusar e deixar a decisão com quem organiza.
    const id = await criar();
    const original = await db.registration.findUniqueOrThrow({ where: { id } });

    await excluirComBackup(id, ADMIN);
    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: id },
    });

    // mesma pessoa se inscreve de novo (mesmo CPF)
    await createRegistration(inscricaoValida({ cpf: original.cpf ?? undefined }));

    await expect(restaurarInscricao(copia.id)).rejects.toThrow(/duplicidade/i);
  });

  it("a inscrição restaurada volta com tribo — nunca sem time", async () => {
    const id = await criar();
    await excluirComBackup(id, ADMIN);
    const copia = await db.deletedRegistration.findUniqueOrThrow({
      where: { registrationId: id },
    });
    const r = await restaurarInscricao(copia.id);
    expect(r.tribo).toBeTruthy();

    const volta = await db.registration.findUniqueOrThrow({ where: { id } });
    expect(volta.tribo).not.toBeNull();
  });
});
