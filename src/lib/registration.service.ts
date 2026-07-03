import "server-only";

import { db } from "@/lib/db";
import {
  chooseTribo,
  emptyCounts,
  applyAssignment,
  type TriboId,
  type Gender,
} from "@/lib/tribos";
import { ageOn, makePublicCode } from "@/lib/format";
import type { RegistrationInput } from "@/lib/validation";
import { env } from "@/lib/env";
import { getActiveLote } from "@/lib/lote.service";
import { isCarne, splitInstallments, installmentDueDates } from "@/lib/carne";

export interface CreatedRegistration {
  id: string;
  publicCode: string;
  tribo: TriboId;
  amountCents: number;
  loteOrder: number;
}

/**
 * Cria a inscrição com atribuição de tribo balanceada (gênero × idade) e o
 * pagamento (PENDING). Tudo numa transação serializável para evitar corridas
 * que desbalanceiem as tribos ou furem a capacidade do lote.
 */
export async function createRegistration(
  input: RegistrationInput,
  meta: { ip?: string; userAgent?: string; isDemo?: boolean } = {},
): Promise<CreatedRegistration> {
  const active = await getActiveLote();
  if (!active) throw new Error("Nenhum lote de inscrição configurado.");
  if (active.soldOut) throw new Error("As inscrições estão esgotadas.");

  const age = ageOn(new Date(input.birthDate));

  return db.$transaction(
    async (tx) => {
      // Reconstrói as contagens atuais por tribo/estrato dentro da transação.
      const grouped = await tx.registration.groupBy({
        by: ["tribo", "gender", "ageAtCamp"],
        where: { status: { not: "CANCELLED" } },
        _count: { _all: true },
      });
      const counts = emptyCounts();
      for (const g of grouped) {
        for (let i = 0; i < g._count._all; i++) {
          applyAssignment(
            g.tribo as TriboId,
            g.gender as Gender,
            g.ageAtCamp,
            counts,
          );
        }
      }
      const tribo = chooseTribo(input.gender, age, counts);
      const publicCode = makePublicCode();

      // Carnê Pix parcelado (2x/3x): monta as parcelas (valor + vencimento).
      // À vista (Pix ou cartão) segue o fluxo de pagamento único.
      const carne = input.paymentMethod === "PIX" && isCarne(input.installments);
      const installmentData = carne
        ? (() => {
            const amounts = splitInstallments(active.priceCents, input.installments);
            const dueDates = installmentDueDates(new Date(), input.installments);
            return amounts.map((amountCents, i) => ({
              number: i + 1,
              amountCents,
              dueDate: dueDates[i],
              status: "PENDING" as const,
              pixTxid: `${publicCode}${i + 1}`,
            }));
          })()
        : null;

      const registration = await tx.registration.create({
        data: {
          publicCode,
          fullName: input.fullName,
          birthDate: new Date(input.birthDate),
          gender: input.gender,
          ageAtCamp: age,
          cpf: input.cpf || null,
          phone: input.phone,
          email: input.email || null,
          shirtSize: input.shirtSize || null,
          church: input.church || null,
          city: input.city || null,
          tribo,
          status: "PENDING_PAYMENT",
          isDemo: meta.isDemo ?? false,
          loteId: active.id,
          guardian: {
            create: {
              name: input.guardianName,
              cpf: input.guardianCpf,
              phone: input.guardianPhone,
              email: input.guardianEmail || null,
              relationship: input.guardianRelationship,
            },
          },
          health: {
            create: {
              allergies: input.allergies || null,
              medications: input.medications || null,
              dietaryRestrictions: input.dietaryRestrictions || null,
              chronicConditions: input.chronicConditions || null,
              healthNotes: input.healthNotes || null,
              triageFlags: input.triageFlags ?? [],
              triageNotes: input.triageNotes || null,
            },
          },
          consent: {
            create: {
              guardianName: input.guardianName,
              guardianCpf: input.guardianCpf,
              consentData: input.consentData,
              consentHealth: input.consentHealth,
              consentActivities: input.consentActivities,
              consentImage: input.consentImage ?? false,
              termVersion: env.NEXT_PUBLIC_CONSENT_TERM_VERSION,
              ip: meta.ip || null,
              userAgent: meta.userAgent || null,
            },
          },
          payment: {
            create: {
              method: input.paymentMethod,
              status: "PENDING",
              amountCents: active.priceCents,
              loteOrder: active.order,
              pixTxid: input.paymentMethod === "PIX" ? publicCode : null,
              installmentsTotal: carne ? input.installments : null,
              ...(installmentData
                ? { installments: { create: installmentData } }
                : {}),
            },
          },
        },
      });

      return {
        id: registration.id,
        publicCode,
        tribo,
        amountCents: active.priceCents,
        loteOrder: active.order,
      };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Busca pública pelo código (página de confirmação / status). */
export async function getRegistrationByCode(publicCode: string) {
  return db.registration.findUnique({
    where: { publicCode },
    include: {
      payment: { include: { installments: { orderBy: { number: "asc" } } } },
      lote: true,
    },
  });
}
