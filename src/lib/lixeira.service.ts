import "server-only";

import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
import { snapshotUtilizavel, bloqueioRestaurar, type Snapshot } from "@/lib/lixeira";
import {
  chooseTribo,
  applyAssignment,
  emptyCounts,
  type Gender,
  type TriboId,
} from "@/lib/tribos";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Exclui a inscrição DEPOIS de guardar a fotografia completa.
 *
 * A foto é tirada e gravada na MESMA transação da exclusão: se o backup
 * falhar, nada é apagado. Um backup que às vezes não acontece é pior que
 * nenhum, porque cria confiança falsa.
 */
export async function excluirComBackup(
  registrationId: string,
  admin: { id: string; name: string | null },
  motivo?: string,
) {
  return db.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        guardian: true,
        health: true,
        consent: true,
        payment: { include: { installments: { orderBy: { number: "asc" } } } },
      },
    });
    if (!reg) throw new Error("Inscrição não encontrada.");

    const { guardian, health, consent, payment, ...registration } = reg;
    const snapshot: Snapshot = {
      registration,
      guardian,
      health,
      consent,
      payment,
    };

    await tx.deletedRegistration.create({
      data: {
        registrationId: reg.id,
        publicCode: reg.publicCode,
        fullName: reg.fullName,
        deletedById: admin.id,
        deletedByName: admin.name,
        reason: motivo?.trim() || null,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.registration.delete({ where: { id: reg.id } });

    return { fullName: reg.fullName, publicCode: reg.publicCode };
  });
}

export function listarExcluidas() {
  return db.deletedRegistration.findMany({ orderBy: { deletedAt: "desc" } });
}

/**
 * Reconstrói a inscrição a partir da fotografia.
 *
 * Mantém o id original de propósito: o comprovante no storage fica numa pasta
 * nomeada pelo id, e recriar com id novo deixaria o arquivo órfão.
 *
 * A TRIBO é sorteada de novo pela distribuição de hoje, não a antiga: os times
 * seguiram sem esta pessoa, e devolvê-la ao time de antes desfaz o equilíbrio
 * de gênero e idade — a mesma regra da reativação.
 */
export async function restaurarInscricao(deletedId: string) {
  return db.$transaction(
    async (tx) => {
      const registro = await tx.deletedRegistration.findUnique({
        where: { id: deletedId },
      });
      if (!registro) throw new Error("Registro de exclusão não encontrado.");

      const snap = registro.snapshot as unknown;
      if (!snapshotUtilizavel(snap)) {
        throw new Error(
          "A fotografia desta exclusão está incompleta — não dá para restaurar com segurança.",
        );
      }
      const s = snap as Snapshot;
      const reg = s.registration as Record<string, unknown> & {
        id: string;
        publicCode: string;
        cpf?: string | null;
        gender: string;
        ageAtCamp: number;
      };

      const [idEmUso, codigoEmUso, cpfEmUso] = await Promise.all([
        tx.registration.findUnique({ where: { id: reg.id }, select: { id: true } }),
        tx.registration.findUnique({
          where: { publicCode: reg.publicCode },
          select: { id: true },
        }),
        reg.cpf
          ? tx.registration.findFirst({
              where: { cpf: reg.cpf, ...ATIVAS },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      const bloqueio = bloqueioRestaurar({
        jaRestaurada: registro.restoredAt !== null,
        idEmUso: Boolean(idEmUso),
        codigoEmUso: Boolean(codigoEmUso),
        cpfEmUso: Boolean(cpfEmUso),
      });
      if (bloqueio) throw new Error(bloqueio.mensagem);

      // Tribo pela distribuição de HOJE.
      const grouped = await tx.registration.groupBy({
        by: ["tribo", "gender", "ageAtCamp"],
        where: ATIVAS,
        _count: { _all: true },
      });
      const counts = emptyCounts();
      for (const g of grouped) {
        if (!g.tribo) continue;
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

      const dados = { ...reg } as Record<string, unknown>;
      delete dados.intercessorId; // volta para a fila da intercessão
      delete dados.roomId; // o quarto antigo pode nem existir mais
      dados.tribo = tribo;

      await tx.registration.create({
        data: dados as unknown as Prisma.RegistrationUncheckedCreateInput,
      });

      if (s.guardian) {
        await tx.guardian.create({
          data: s.guardian as unknown as Prisma.GuardianUncheckedCreateInput,
        });
      }
      if (s.health) {
        await tx.healthProfile.create({
          data: s.health as unknown as Prisma.HealthProfileUncheckedCreateInput,
        });
      }
      if (s.consent) {
        await tx.consentRecord.create({
          data: s.consent as unknown as Prisma.ConsentRecordUncheckedCreateInput,
        });
      }
      if (s.payment) {
        const { installments, ...pagamento } = s.payment as Record<
          string,
          unknown
        > & { installments?: unknown[] };
        await tx.payment.create({
          data: pagamento as unknown as Prisma.PaymentUncheckedCreateInput,
        });
        if (installments?.length) {
          await tx.installment.createMany({
            data: installments as unknown as Prisma.InstallmentCreateManyInput[],
          });
        }
      }

      await tx.deletedRegistration.update({
        where: { id: deletedId },
        data: { restoredAt: new Date() },
      });

      return { fullName: registro.fullName, publicCode: registro.publicCode, tribo };
    },
    { isolationLevel: "Serializable" },
  );
}
