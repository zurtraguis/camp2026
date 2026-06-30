import "server-only";

import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe.service";
import { env } from "@/lib/env";
import { buildPixPayload } from "@/lib/pix";
import { validateReceipt, uploadReceipt, storageConfigured } from "@/lib/storage";

const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

/** Stripe Checkout Session (mode=payment, BRL) para pagamento com cartão. */
export async function createCheckoutSession(registrationId: string): Promise<string> {
  const reg = await db.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true },
  });
  if (!reg || !reg.payment) throw new Error("Inscrição não encontrada.");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    locale: "pt-BR",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: reg.payment.amountCents,
          product_data: {
            name: `Inscrição Acampamento RAIZ 2026 — ${reg.fullName}`,
            description: `Código ${reg.publicCode}`,
          },
        },
      },
    ],
    client_reference_id: reg.id,
    metadata: { registrationId: reg.id, publicCode: reg.publicCode },
    success_url: `${appUrl}/inscricao/${reg.publicCode}?pago=1`,
    cancel_url: `${appUrl}/inscricao/${reg.publicCode}?cancelado=1`,
  });

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
    db.payment.update({
      where: { id: payment.id },
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

  const payload = buildPixPayload({
    key,
    receiverName: env.NEXT_PUBLIC_PIX_RECEIVER_NAME,
    receiverCity: env.NEXT_PUBLIC_PIX_RECEIVER_CITY,
    amount: reg.payment.amountCents / 100,
    txid: reg.publicCode,
  });
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 280 });
  return { ...base, payload, qrDataUrl };
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
  const path = await uploadReceipt(reg.id, validated);

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
