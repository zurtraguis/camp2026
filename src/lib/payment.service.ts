import "server-only";

import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe.service";
import { env } from "@/lib/env";
import { buildPixPayload } from "@/lib/pix";
import { validateReceipt, uploadReceipt, storageConfigured } from "@/lib/storage";
import { notaBaixaManual, type FormaRecebimento } from "@/lib/baixa";
import {
  bloqueioTrocaForma,
  FORMA_ALVO_LABEL,
  type FormaAlvo,
} from "@/lib/forma-pagamento";

const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

/** Stripe Checkout Session (mode=payment, BRL) para pagamento com cartão. */
export async function createCheckoutSession(registrationId: string): Promise<string> {
  const reg = await db.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");

  const stripe = getStripe();
  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    locale: "pt-BR",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: reg.payment.amountCents,
          // Atribui a cobrança ao produto do catálogo quando configurado;
          // senão cria um produto ad-hoc (comportamento anterior).
          ...(env.STRIPE_PRODUCT_ID
            ? { product: env.STRIPE_PRODUCT_ID }
            : {
                product_data: {
                  name: `Inscrição Acampamento RAIZ 2026 — ${reg.fullName}`,
                  description: `Código ${reg.publicCode}`,
                },
              }),
        },
      },
    ],
    client_reference_id: reg.id,
    metadata: { registrationId: reg.id, publicCode: reg.publicCode },
    success_url: `${appUrl}/inscricao/${reg.publicCode}?pago=1`,
    cancel_url: `${appUrl}/inscricao/${reg.publicCode}?cancelado=1`,
  };

  // Habilita o parcelamento no cartão (Brasil/BRL). O número máximo de parcelas
  // (ex.: 3x) é definido no painel da Stripe → Settings → Installments. Se a
  // conta não tiver parcelamento habilitado, recriamos sem a opção para não
  // quebrar o checkout de cartão.
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create({
      ...params,
      payment_method_options: { card: { installments: { enabled: true } } },
    });
  } catch (err) {
    console.warn(
      "[stripe] parcelamento indisponível; criando checkout sem installments:",
      err instanceof Error ? err.message : err,
    );
    session = await stripe.checkout.sessions.create(params);
  }

  await db.payment.update({
    where: { id: reg.payment.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) throw new Error("Stripe não retornou URL de checkout.");
  return session.url;
}

/** Confirma o pagamento de cartão (chamado pelo webhook). Idempotente. */
export async function confirmCardPaymentBySession(
  stripeSessionId: string,
  paymentIntentId?: string,
): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { stripeSessionId },
    include: { registration: true },
  });
  if (!payment || payment.status === "CONFIRMED") return;
  await db.$transaction([
    // updateMany condicional: se outro evento concorrente já confirmou entre a
    // leitura acima e este ponto, o update vira no-op em vez de regravar.
    db.payment.updateMany({
      where: { id: payment.id, status: { not: "CONFIRMED" } },
      data: {
        status: "CONFIRMED",
        stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
      },
    }),
    db.registration.update({
      where: { id: payment.registrationId },
      data: { status: "CONFIRMED" },
    }),
  ]);
}

/** Dados para exibir o Pix "copia e cola" + QR (data URL). */
export interface PixDisplay {
  configured: boolean;
  key: string;
  receiverName: string;
  amountCents: number;
  txid: string;
  payload?: string;
  qrDataUrl?: string;
}

export async function getPixDisplay(publicCode: string): Promise<PixDisplay> {
  const reg = await db.registration.findUnique({
    where: { publicCode },
    include: { payment: true },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");

  const key = env.NEXT_PUBLIC_PIX_KEY;
  const base = {
    configured: Boolean(key),
    key: key ?? "",
    receiverName: env.NEXT_PUBLIC_PIX_RECEIVER_NAME,
    amountCents: reg.payment.amountCents,
    txid: reg.publicCode,
  };
  if (!key) return base;

  const { payload, qrDataUrl } = await buildPixQr(
    reg.payment.amountCents,
    reg.publicCode,
  );
  return { ...base, payload, qrDataUrl };
}

/* O QR é determinístico por (valor, txid, chave) e a página é force-dynamic:
 * sem cache, cada visita regenera o mesmo data URL. */
const pixQrCache = new Map<string, { payload: string; qrDataUrl: string }>();
const PIX_QR_CACHE_MAX = 1000;

/** Monta o "copia e cola" + QR (data URL) do Pix para um valor/txid. */
async function buildPixQr(
  amountCents: number,
  txid: string,
): Promise<{ payload: string; qrDataUrl: string }> {
  const cacheKey = `${env.NEXT_PUBLIC_PIX_KEY}|${amountCents}|${txid}`;
  const cached = pixQrCache.get(cacheKey);
  if (cached) return cached;

  const payload = buildPixPayload({
    key: env.NEXT_PUBLIC_PIX_KEY as string,
    receiverName: env.NEXT_PUBLIC_PIX_RECEIVER_NAME,
    receiverCity: env.NEXT_PUBLIC_PIX_RECEIVER_CITY,
    amount: amountCents / 100,
    txid,
  });
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 280 });

  if (pixQrCache.size >= PIX_QR_CACHE_MAX) pixQrCache.clear();
  const result = { payload, qrDataUrl };
  pixQrCache.set(cacheKey, result);
  return result;
}

/** Uma parcela do carnê, com o Pix pronto para exibir. */
export interface CarneInstallment {
  id: string;
  number: number;
  amountCents: number;
  dueDate: Date;
  status: "PENDING" | "AWAITING_REVIEW" | "CONFIRMED" | "FAILED" | "EXPIRED" | "REFUNDED";
  txid: string;
  payload?: string;
  qrDataUrl?: string;
}

export interface CarneDisplay {
  configured: boolean;
  key: string;
  receiverName: string;
  totalCents: number;
  installmentsTotal: number;
  installments: CarneInstallment[];
}

/** Dados do carnê Pix (todas as parcelas com QR/copia-e-cola). */
export async function getCarneDisplay(publicCode: string): Promise<CarneDisplay> {
  const reg = await db.registration.findUnique({
    where: { publicCode },
    include: {
      payment: { include: { installments: { orderBy: { number: "asc" } } } },
    },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");
  const p = reg.payment;

  const key = env.NEXT_PUBLIC_PIX_KEY;
  const configured = Boolean(key);

  const installments: CarneInstallment[] = await Promise.all(
    p.installments.map(async (inst) => {
      const base: CarneInstallment = {
        id: inst.id,
        number: inst.number,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        status: inst.status,
        txid: inst.pixTxid ?? `${reg.publicCode}${inst.number}`,
      };
      // Só gera QR para parcelas ainda em aberto (não pagas/confirmadas).
      if (!configured || inst.status === "CONFIRMED" || inst.status === "AWAITING_REVIEW") {
        return base;
      }
      const { payload, qrDataUrl } = await buildPixQr(inst.amountCents, base.txid);
      return { ...base, payload, qrDataUrl };
    }),
  );

  return {
    configured,
    key: key ?? "",
    receiverName: env.NEXT_PUBLIC_PIX_RECEIVER_NAME,
    totalCents: p.amountCents,
    installmentsTotal: p.installmentsTotal ?? p.installments.length,
    installments,
  };
}

/** Recebe o comprovante Pix: valida, faz upload e marca AWAITING_REVIEW. */
export async function submitPixReceipt(
  publicCode: string,
  file: File,
): Promise<void> {
  if (!storageConfigured()) {
    throw new Error(
      "Upload indisponível: configure o storage de comprovantes (S3/SeaweedFS: S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY, ou Supabase: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  const reg = await db.registration.findUnique({
    where: { publicCode },
    include: { payment: true },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");
  if (reg.payment.method !== "PIX") throw new Error("Esta inscrição não é via Pix.");

  const validated = await validateReceipt(file);
  const path = await uploadReceipt(reg.id, validated, "avista");

  await db.$transaction([
    db.payment.update({
      where: { id: reg.payment.id },
      data: { status: "AWAITING_REVIEW", pixReceiptPath: path },
    }),
    db.registration.update({
      where: { id: reg.id },
      data: { status: "AWAITING_REVIEW" },
    }),
  ]);
}

/** Recebe o comprovante de UMA parcela do carnê: valida, faz upload e marca
 *  a parcela como AWAITING_REVIEW. */
export async function submitInstallmentReceipt(
  publicCode: string,
  installmentNumber: number,
  file: File,
): Promise<void> {
  if (!storageConfigured()) {
    throw new Error(
      "Upload indisponível: configure o storage de comprovantes (S3/SeaweedFS ou Supabase).",
    );
  }
  const reg = await db.registration.findUnique({
    where: { publicCode },
    include: { payment: { include: { installments: true } } },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");
  if (!reg.payment.installmentsTotal) {
    throw new Error("Esta inscrição não é um carnê parcelado.");
  }
  const inst = reg.payment.installments.find((i) => i.number === installmentNumber);
  if (!inst) throw new Error("Parcela não encontrada.");
  if (inst.status === "CONFIRMED") throw new Error("Esta parcela já foi confirmada.");

  const validated = await validateReceipt(file);
  // Escopo = id da parcela: cada parcela tem sua própria prova.
  const path = await uploadReceipt(reg.id, validated, inst.id);

  await db.installment.update({
    where: { id: inst.id },
    data: { status: "AWAITING_REVIEW", pixReceiptPath: path },
  });
}

/** Admin confirma ou rejeita a parcela de um carnê. Ao confirmar a 1ª parcela,
 *  a inscrição é confirmada (vaga garantida); ao confirmar todas, o pagamento
 *  fica CONFIRMED. */
export async function reviewInstallment(
  installmentId: string,
  decision: "confirm" | "reject",
  adminId: string,
  note?: string,
): Promise<void> {
  const confirmed = decision === "confirm";

  // Transação interativa serializável: o estado das outras parcelas é lido
  // DENTRO da tx — duas confirmações simultâneas não podem mais calcular
  // "todas pagas" sobre dados antigos e deixar o pagamento pendurado.
  await db.$transaction(
    async (tx) => {
      const inst = await tx.installment.findUnique({
        where: { id: installmentId },
        include: { payment: { include: { installments: true } } },
      });
      if (!inst || !inst.payment) throw new Error("Parcela não encontrada.");

      await tx.installment.update({
        where: { id: installmentId },
        data: {
          status: confirmed ? "CONFIRMED" : "FAILED",
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNote: note ?? null,
        },
      });

      if (!confirmed) return;

      // Vaga garantida a partir da 1ª parcela paga.
      await tx.registration.update({
        where: { id: inst.payment.registrationId },
        data: { status: "CONFIRMED" },
      });

      // Pagamento inteiro só quita quando todas as parcelas estão confirmadas.
      const confirmedCount =
        inst.payment.installments.filter(
          (i) => i.id !== installmentId && i.status === "CONFIRMED",
        ).length + 1;
      const total =
        inst.payment.installmentsTotal ?? inst.payment.installments.length;
      if (confirmedCount >= total) {
        await tx.payment.update({
          where: { id: inst.payment.id },
          data: { status: "CONFIRMED" },
        });
      }
    },
    { isolationLevel: "Serializable" },
  );
}

/* ── Baixa manual ──────────────────────────────────────────────────────────
 * A confirmação em si reusa reviewPixPayment/reviewInstallment — mesma
 * transação, mesma regra de vaga garantida na 1ª parcela. O que muda é a
 * origem: não há comprovante no storage, então a nota (montada em @/lib/baixa)
 * é a única trilha de como o dinheiro entrou, junto com o reviewedById que os
 * serviços já gravam.
 */

/** Baixa manual do pagamento inteiro (à vista). */
export async function baixaManualPagamento(
  paymentId: string,
  adminId: string,
  forma: FormaRecebimento,
  obs?: string,
): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { installments: { select: { id: true } } },
  });
  if (!payment) throw new Error("Pagamento não encontrado.");
  if (payment.status === "CONFIRMED") {
    throw new Error("Este pagamento já está confirmado.");
  }
  // Num carnê o valor entra parcela a parcela; quitar o payment inteiro aqui
  // marcaria como pago um dinheiro que não entrou e furaria os totais.
  if (payment.installments.length > 0) {
    throw new Error("Carnê: dê baixa parcela a parcela.");
  }
  await reviewPixPayment(paymentId, "confirm", adminId, notaBaixaManual(forma, obs));
}

/** Baixa manual de UMA parcela do carnê. */
export async function baixaManualParcela(
  installmentId: string,
  adminId: string,
  forma: FormaRecebimento,
  obs?: string,
): Promise<void> {
  const inst = await db.installment.findUnique({ where: { id: installmentId } });
  if (!inst) throw new Error("Parcela não encontrada.");
  if (inst.status === "CONFIRMED") throw new Error("Esta parcela já foi confirmada.");
  await reviewInstallment(
    installmentId,
    "confirm",
    adminId,
    notaBaixaManual(forma, obs),
  );
}

/**
 * Troca manual da forma de pagamento (admin): Pix à vista ↔ cartão, ou
 * carnê → qualquer um dos dois. Só enquanto nada foi confirmado nem há
 * comprovante na fila (regras puras em @/lib/forma-pagamento). Ao sair do
 * carnê, as parcelas são descartadas — o guard garante que nenhuma tinha
 * dinheiro confirmado ou comprovante pendente.
 */
export async function alterarFormaPagamento(
  paymentId: string,
  alvo: FormaAlvo,
  adminId: string,
): Promise<void> {
  await db.$transaction(
    async (tx) => {
      const p = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          installments: { select: { status: true } },
          registration: { select: { publicCode: true } },
        },
      });
      if (!p) throw new Error("Pagamento não encontrado.");

      const bloqueio = bloqueioTrocaForma(p, alvo);
      if (bloqueio) throw new Error(bloqueio);

      if (p.installments.length > 0) {
        await tx.installment.deleteMany({ where: { paymentId: p.id } });
      }

      const antes =
        p.installmentsTotal && p.installments.length > 0
          ? `carnê ${p.installmentsTotal}x`
          : p.method === "PIX"
            ? "Pix à vista"
            : "cartão";
      await tx.payment.update({
        where: { id: p.id },
        data: {
          method: alvo,
          status: "PENDING",
          installmentsTotal: null,
          pixTxid: alvo === "PIX" ? p.registration.publicCode : null,
          pixReceiptPath: null,
          // Trilha de auditoria da troca: quem mexeu e o que era antes.
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNote: `Forma de pagamento alterada de ${antes} para ${FORMA_ALVO_LABEL[alvo]} pelo admin.`,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

/** Admin confirma ou rejeita um comprovante Pix. */
export async function reviewPixPayment(
  paymentId: string,
  decision: "confirm" | "reject",
  adminId: string,
  note?: string,
): Promise<void> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Pagamento não encontrado.");

  const confirmed = decision === "confirm";
  await db.$transaction([
    db.payment.update({
      where: { id: paymentId },
      data: {
        status: confirmed ? "CONFIRMED" : "FAILED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNote: note ?? null,
      },
    }),
    db.registration.update({
      where: { id: payment.registrationId },
      data: { status: confirmed ? "CONFIRMED" : "PENDING_PAYMENT" },
    }),
  ]);
}
