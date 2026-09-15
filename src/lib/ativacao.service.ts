import "server-only";

import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
import { bloqueioDesativar, bloqueioReativar } from "@/lib/registration-status";
import {
  chooseTribo,
  applyAssignment,
  emptyCounts,
  type Gender,
  type TriboId,
} from "@/lib/tribos";

/**
 * Desativa uma inscrição: a pessoa sumiu, não responde e não pagou.
 *
 * Três efeitos, e os três importam:
 *   - a VAGA é liberada (o filtro ATIVAS deixa de contá-la no teto de 150);
 *   - sai da TRIBO (tribo = null) — quem não vem não ocupa lugar num time;
 *   - sai da INTERCESSÃO, para o coordenador não orar por quem desistiu sem
 *     saber que aquilo mudou.
 *
 * O que NÃO acontece: nada é apagado. Os dados, o pagamento e o histórico
 * continuam ali, porque a pessoa pode voltar.
 */
export async function desativarInscricao(id: string, motivo?: string) {
  const reg = await db.registration.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      fullName: true,
      adminNotes: true,
      payment: {
        select: {
          status: true,
          installments: { select: { status: true } },
        },
      },
    },
  });
  if (!reg) throw new Error("Inscrição não encontrada.");

  const temPagamentoConfirmado =
    reg.payment?.status === "CONFIRMED" ||
    (reg.payment?.installments ?? []).some((i) => i.status === "CONFIRMED");

  const bloqueio = bloqueioDesativar({ status: reg.status, temPagamentoConfirmado });
  if (bloqueio) throw new Error(bloqueio);

  const carimbo = new Date().toLocaleDateString("pt-BR");
  const nota = motivo?.trim()
    ? `[${carimbo}] Desativada: ${motivo.trim()}`
    : `[${carimbo}] Desativada por falta de pagamento.`;

  await db.registration.update({
    where: { id },
    data: {
      status: "INACTIVE",
      tribo: null,
      intercessorId: null,
      roomId: null, // quem não vem não ocupa cama
      // A observação guarda o porquê — daqui a um mês ninguém lembra.
      adminNotes: reg.adminNotes ? `${reg.adminNotes}\n${nota}` : nota,
    },
  });

  return { fullName: reg.fullName };
}

/**
 * Reativa: a pessoa apareceu e vai pagar.
 *
 * A tribo é escolhida AGORA, com a distribuição de hoje — exatamente como se
 * ela estivesse se inscrevendo neste momento. Devolver a tribo antiga seria o
 * erro: as tribos foram reequilibradas sem ela, e recolocá-la no time de antes
 * desfaz esse equilíbrio de gênero e idade.
 */
export async function reativarInscricao(id: string) {
  return db.$transaction(
    async (tx) => {
      const reg = await tx.registration.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          fullName: true,
          cpf: true,
          gender: true,
          ageAtCamp: true,
          adminNotes: true,
        },
      });
      if (!reg) throw new Error("Inscrição não encontrada.");

      const bloqueio = bloqueioReativar({ status: reg.status });
      if (bloqueio) throw new Error(bloqueio);

      // Enquanto esteve desativada, a família pode ter feito outra inscrição —
      // o CPF só bloqueia inscrições ATIVAS. Reativar aqui criaria duas vagas
      // para o mesmo adolescente.
      if (reg.cpf) {
        const outra = await tx.registration.findFirst({
          where: { cpf: reg.cpf, id: { not: reg.id }, ...ATIVAS },
          select: { publicCode: true },
        });
        if (outra) {
          throw new Error(
            `Este adolescente já tem outra inscrição ativa (${outra.publicCode}). Resolva a duplicidade antes de reativar.`,
          );
        }
      }

      // Contagem ATUAL das tribos — a mesma que a inscrição nova usa.
      const grouped = await tx.registration.groupBy({
        by: ["tribo", "gender", "ageAtCamp"],
        where: ATIVAS,
        _count: { _all: true },
      });
      const counts = emptyCounts();
      for (const g of grouped) {
        if (!g.tribo) continue; // desativados não entram na conta
        for (let i = 0; i < g._count._all; i++) {
          applyAssignment(
            g.tribo as TriboId,
            g.gender as Gender,
            g.ageAtCamp,
            counts,
          );
        }
      }
      const tribo = chooseTribo(reg.gender as Gender, reg.ageAtCamp, counts);

      const carimbo = new Date().toLocaleDateString("pt-BR");
      const nota = `[${carimbo}] Reativada — tribo atribuída de novo pela distribuição do dia.`;

      await tx.registration.update({
        where: { id },
        data: {
          // Volta a dever: o pagamento continua pendente, e é a confirmação
          // dele que leva a inscrição a CONFIRMED pelo caminho normal.
          status: "PENDING_PAYMENT",
          tribo,
          adminNotes: reg.adminNotes ? `${reg.adminNotes}\n${nota}` : nota,
        },
      });

      return { fullName: reg.fullName, tribo };
    },
    { isolationLevel: "Serializable" },
  );
}
