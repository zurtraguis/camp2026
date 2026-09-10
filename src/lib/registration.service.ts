import "server-only";

import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
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
import { applyPercentOff, nadaAPagar } from "@/lib/coupon";
import { resolveAndConsumeCoupon } from "@/lib/coupon.service";

export interface CreatedRegistration {
  id: string;
  publicCode: string;
  tribo: TriboId;
  amountCents: number;
  loteOrder: number;
  /** Valor zerado (cupom de 100%): já nasceu CONFIRMED, sem nada a cobrar. */
  gratuita: boolean;
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
      // Impede inscrição duplicada da MESMA pessoa (CPF do campista). É pelo CPF
      // do adolescente, não do responsável — o pai pode ter mais de um filho. A
      // checagem roda dentro da tx serializável: dois envios simultâneos com o
      // mesmo CPF não passam os dois (o segundo aborta). O action faz um
      // pré-check para a mensagem amigável no campo; este é o backstop.
      const dup = await tx.registration.findFirst({
        where: { cpf: input.cpf, ...ATIVAS },
        select: { id: true },
      });
      if (dup) {
        // Sem código/nome na mensagem: ela chega ao formulário público.
        throw new Error("Já existe uma inscrição ativa para este CPF.");
      }

      // Reconstrói as contagens atuais por tribo/estrato dentro da transação.
      const grouped = await tx.registration.groupBy({
        by: ["tribo", "gender", "ageAtCamp"],
        where: ATIVAS,
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

      // Cupom (opcional): valida e CONSOME dentro da tx. O desconto incide sobre
      // o preço do lote e vale tanto à vista quanto nas parcelas do carnê. Se o
      // código foi informado mas não é utilizável, resolveAndConsumeCoupon lança
      // e a inscrição inteira falha — a pessoa remove o cupom e reenvia.
      const coupon = await resolveAndConsumeCoupon(
        tx,
        input.couponCode ?? "",
        new Date(),
      );
      const originalPriceCents = active.priceCents;
      const finalPriceCents = coupon
        ? applyPercentOff(originalPriceCents, coupon.percentOff)
        : originalPriceCents;

      // Carnê Pix parcelado (2x/3x): monta as parcelas (valor + vencimento).
      // À vista (Pix ou cartão) segue o fluxo de pagamento único.
      // isCarne com a data: o teto de parcelas encolhe conforme o acampamento
      // se aproxima. O schema já rejeita antes; isto é o backstop.
      // Cupom de 100% (bolsa) zera o valor: não há pagamento a cobrar, nem
      // parcela, nem comprovante. A inscrição já nasce confirmada — deixá-la
      // "aguardando pagamento" prenderia a família num estado sem saída.
      const gratuita = nadaAPagar(finalPriceCents);

      const carne =
        !gratuita &&
        input.paymentMethod === "PIX" &&
        isCarne(input.installments, new Date());
      const installmentData = carne
        ? (() => {
            const amounts = splitInstallments(finalPriceCents, input.installments);
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
          status: gratuita ? "CONFIRMED" : "PENDING_PAYMENT",
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
              status: gratuita ? "CONFIRMED" : "PENDING",
              amountCents: finalPriceCents,
              loteOrder: active.order,
              // Sem valor a pagar não existe cobrança Pix: gerar txid daria à
              // família uma chave que nunca deve ser paga.
              pixTxid:
                !gratuita && input.paymentMethod === "PIX" ? publicCode : null,
              reviewedAt: gratuita ? new Date() : null,
              reviewNote: gratuita
                ? `Inscrição sem custo${coupon ? ` (cupom ${coupon.code}, -${coupon.percentOff}%)` : ""} — nada a pagar.`
                : null,
              installmentsTotal: carne ? input.installments : null,
              // Auditoria do desconto (null quando não houve cupom).
              couponId: coupon?.couponId ?? null,
              couponCode: coupon?.code ?? null,
              discountPercent: coupon?.percentOff ?? null,
              originalAmountCents: coupon ? originalPriceCents : null,
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
        amountCents: finalPriceCents,
        loteOrder: active.order,
        gratuita,
      };
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * Existe inscrição não-cancelada com este CPF de CAMPISTA? Devolve só o `id` —
 * nunca nome ou código: quem chama é o pré-check público do formulário, e
 * devolver PII ali transformaria "digite um CPF" em consulta de nome de menor.
 */
export async function findActiveRegistrationByCpf(cpfDigits: string) {
  return db.registration.findFirst({
    where: { cpf: cpfDigits, ...ATIVAS },
    select: { id: true },
  });
}

/**
 * Exclui uma inscrição PERMANENTEMENTE, sem backup. O cascade remove
 * responsável, saúde, consentimento, pagamento e parcelas.
 *
 * NÃO use isto no painel: o admin passa por `excluirComBackup`
 * (lib/lixeira.service), que guarda a fotografia antes de apagar. Uma exclusão
 * sem backup já custou uma inscrição irrecuperável (set/2026) — o Postgres do
 * Supabase não deixa ler a linha morta, e não há PITR.
 *
 * Fica exportada só para os testes de integração, que precisam limpar sem
 * encher a lixeira.
 */
export async function deleteRegistration(id: string) {
  await db.registration.delete({ where: { id } });
}

/**
 * Busca pública: inscrições ativas pelo CPF do responsável (dígitos apenas,
 * como o cadastro armazena). Permite ao pai reencontrar a página da inscrição
 * para enviar os comprovantes das parcelas do carnê.
 */
export async function findRegistrationsByGuardianCpf(cpfDigits: string) {
  return db.registration.findMany({
    where: { guardian: { cpf: cpfDigits }, ...ATIVAS },
    select: { publicCode: true, fullName: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
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
