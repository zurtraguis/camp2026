import "server-only";

import { db } from "@/lib/db";
import {
  distribuir,
  nomesDaLista,
  type CampistaParaIntercessao,
  type CoordenadorParaIntercessao,
} from "@/lib/intercessao";
import { ATIVAS } from "@/lib/registration-status";

export function listarCoordenadores() {
  return db.coordinator.findMany({ orderBy: { createdAt: "asc" } });
}

export function listarCampistasParaIntercessao() {
  return db.registration.findMany({
    where: ATIVAS,
    select: { id: true, fullName: true, intercessorId: true, tribo: true },
    orderBy: { fullName: "asc" },
  });
}

/**
 * Cadastra vários coordenadores de uma vez (um nome por linha). Cadastrar 22
 * num formulário de cada vez seria cruel.
 *
 * Ignora quem já está cadastrado com o mesmo nome: colar a lista duas vezes é
 * acidente comum, e duplicar coordenador espalharia os campistas por pessoas
 * que não existem.
 */
export async function adicionarCoordenadores(texto: string): Promise<number> {
  const nomes = nomesDaLista(texto);
  if (nomes.length === 0) throw new Error("Informe ao menos um nome.");

  const existentes = await db.coordinator.findMany({ select: { name: true } });
  const jaTem = new Set(
    existentes.map((c) => c.name.toLocaleLowerCase("pt-BR")),
  );
  const novos = nomes.filter((n) => !jaTem.has(n.toLocaleLowerCase("pt-BR")));
  if (novos.length === 0) return 0;

  await db.coordinator.createMany({ data: novos.map((name) => ({ name })) });
  return novos.length;
}

export async function renomearCoordenador(id: string, name: string) {
  await db.coordinator.update({ where: { id }, data: { name } });
}

/**
 * Remove um coordenador. Os campistas dele voltam para a fila (onDelete:
 * SetNull no schema) e a próxima distribuição os pega.
 */
export async function removerCoordenador(id: string) {
  await db.coordinator.delete({ where: { id } });
}

export interface ResultadoDistribuicao {
  atribuidos: number;
  redistribuiuTudo: boolean;
}

/**
 * Distribui os campistas entre os coordenadores.
 *
 * Por padrão mexe SÓ em quem ainda não tem coordenador — intercessão se
 * constrói ao longo de semanas, e trocar de responsável toda vez esvazia o
 * sentido. `redistribuirTudo` existe para o primeiro sorteio ou para quando a
 * equipe muda de verdade.
 */
export async function distribuirIntercessao(
  opcoes: { redistribuirTudo?: boolean } = {},
): Promise<ResultadoDistribuicao> {
  const [coordenadoresRaw, campistasRaw] = await Promise.all([
    listarCoordenadores(),
    listarCampistasParaIntercessao(),
  ]);

  const coordenadores: CoordenadorParaIntercessao[] = coordenadoresRaw.map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const campistas: CampistaParaIntercessao[] = campistasRaw.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    intercessorId: c.intercessorId,
  }));

  const mudancas = distribuir(campistas, coordenadores, opcoes);
  const entradas = Object.entries(mudancas);
  if (entradas.length === 0) {
    return { atribuidos: 0, redistribuiuTudo: opcoes.redistribuirTudo ?? false };
  }

  // Um UPDATE por coordenador (não por campista): com 59 campistas, dezenas de
  // idas ao banco numa transação estouram o timeout de 5s do Prisma — foi o
  // que derrubou o rebalanceamento das tribos.
  const porCoordenador = new Map<string, string[]>();
  for (const [campistaId, coordenadorId] of entradas) {
    const lista = porCoordenador.get(coordenadorId) ?? [];
    lista.push(campistaId);
    porCoordenador.set(coordenadorId, lista);
  }

  await db.$transaction(
    [...porCoordenador.entries()].map(([coordenadorId, ids]) =>
      db.registration.updateMany({
        where: { id: { in: ids } },
        data: { intercessorId: coordenadorId },
      }),
    ),
  );

  return {
    atribuidos: entradas.length,
    redistribuiuTudo: opcoes.redistribuirTudo ?? false,
  };
}
