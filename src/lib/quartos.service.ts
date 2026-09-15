import "server-only";

import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
import {
  gerarQuartos,
  encaixar,
  validarCapacidade,
  type CampistaParaQuarto,
  type Genero,
} from "@/lib/quartos";

export function listarQuartos() {
  return db.room.findMany({
    orderBy: [{ gender: "asc" }, { number: "asc" }],
    include: {
      campers: {
        where: ATIVAS,
        select: {
          id: true,
          fullName: true,
          gender: true,
          birthDate: true,
          ageAtCamp: true,
          tribo: true,
        },
      },
    },
  });
}

export function listarSemQuarto() {
  return db.registration.findMany({
    where: { ...ATIVAS, roomId: null },
    select: { id: true, fullName: true, gender: true, birthDate: true },
    orderBy: { fullName: "asc" },
  });
}

function paraQuarto(r: {
  id: string;
  fullName: string;
  gender: string;
  birthDate: Date;
}): CampistaParaQuarto {
  return {
    id: r.id,
    fullName: r.fullName,
    gender: r.gender as Genero,
    birthDate: r.birthDate,
  };
}

/**
 * Gera TODOS os quartos do zero: apaga os existentes e redistribui todo mundo.
 *
 * Numa transação só: ou os quartos novos ficam inteiros, ou os antigos
 * continuam como estavam. Metade dos adolescentes sem quarto no meio do
 * caminho seria pior que não ter mexido.
 */
export async function gerarTodosOsQuartos(capacidade: number) {
  const erro = validarCapacidade(capacidade);
  if (erro) throw new Error(erro);

  const campistas = await db.registration.findMany({
    where: ATIVAS,
    select: { id: true, fullName: true, gender: true, birthDate: true },
  });
  const quartos = gerarQuartos(campistas.map(paraQuarto), capacidade);

  await db.$transaction(
    async (tx) => {
      // SetNull no schema: apagar os quartos devolve todos para "sem quarto".
      await tx.room.deleteMany({});

      for (const q of quartos) {
        const criado = await tx.room.create({
          data: { gender: q.gender, number: q.numero, capacity: capacidade },
          select: { id: true },
        });
        // Um UPDATE por quarto, nunca um por campista: dezenas de updates numa
        // transação estouram o timeout do Prisma.
        await tx.registration.updateMany({
          where: { id: { in: q.membros } },
          data: { roomId: criado.id },
        });
      }
    },
    { timeout: 20000 },
  );

  return { quartos: quartos.length, campistas: campistas.length };
}

/**
 * Encaixa só quem ainda não tem quarto, sem mexer em ninguém. É o que se usa
 * depois que os quartos já foram anunciados e chega inscrição nova.
 */
export async function encaixarSemQuarto(capacidade: number) {
  const erro = validarCapacidade(capacidade);
  if (erro) throw new Error(erro);

  const [semQuarto, quartos] = await Promise.all([
    listarSemQuarto(),
    db.room.findMany({
      select: {
        id: true,
        gender: true,
        number: true,
        _count: { select: { campers: { where: ATIVAS } } },
      },
    }),
  ]);
  if (semQuarto.length === 0) return { encaixados: 0, quartosNovos: 0 };

  const plano = encaixar(
    semQuarto.map(paraQuarto),
    quartos.map((q) => ({
      id: q.id,
      gender: q.gender as Genero,
      numero: q.number,
      ocupacao: q._count.campers,
    })),
    capacidade,
  );

  await db.$transaction(
    async (tx) => {
      const porQuarto = new Map<string, string[]>();
      for (const [campista, quarto] of Object.entries(plano.emQuartos)) {
        porQuarto.set(quarto, [...(porQuarto.get(quarto) ?? []), campista]);
      }
      for (const [quarto, ids] of porQuarto) {
        await tx.registration.updateMany({
          where: { id: { in: ids } },
          data: { roomId: quarto },
        });
      }
      for (const n of plano.novos) {
        const criado = await tx.room.create({
          data: { gender: n.gender, number: n.numero, capacity: capacidade },
          select: { id: true },
        });
        await tx.registration.updateMany({
          where: { id: { in: n.membros } },
          data: { roomId: criado.id },
        });
      }
    },
    { timeout: 20000 },
  );

  return { encaixados: semQuarto.length, quartosNovos: plano.novos.length };
}
