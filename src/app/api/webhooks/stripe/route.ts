import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getCryptoProvider } from "@/lib/stripe.service";
import { db } from "@/lib/db";
import { confirmCardPaymentBySession } from "@/lib/payment.service";

// Stripe exige o corpo bruto; a verificação de assinatura roda no runtime Node.
export const runtime = "nodejs";

/** Detecta violação de unicidade do Prisma (P2002) sem acoplar ao namespace gerado. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function POST(req: Request) {
  // IMPORTANTE: usar req.text() (corpo bruto). req.json() quebra a verificação 100% das vezes.
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    // constructEventAsync + Web Crypto: funciona em Node e em Cloudflare Workers.
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      getCryptoProvider(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotência: o Stripe pode reentregar o mesmo evento por até 3 dias.
  // O insert na PK (event.id) falha em duplicata → não reprocessa.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { received: true, duplicate: true },
        { status: 200 }
      );
    }
    // Outro erro (ex.: DB indisponível) → 500 para o Stripe reentregar.
    console.error("Failed to record Stripe event:", err);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          await confirmCardPaymentBySession(
            session.id,
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? undefined),
          );
        }
        break;
      }
      case "checkout.session.expired":
        // Pagamento não concluído — inscrição segue PENDING_PAYMENT.
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Falha ao processar → 500 para o Stripe reentregar (a idempotência já
    // registrou o evento; ver nota abaixo).
    console.error("Erro ao processar evento Stripe:", err);
    // Remove o registro de idempotência para permitir o reprocessamento. Se o
    // delete falhar, a reentrega do Stripe cairia na guarda de duplicata e o
    // evento nunca seria reprocessado — por isso a falha precisa ficar visível.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch((delErr) => {
      console.error(
        `[stripe] FALHA ao liberar idempotência do evento ${event.id} — ` +
          "reentregas serão ignoradas como duplicata; intervenção manual necessária:",
        delErr,
      );
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
