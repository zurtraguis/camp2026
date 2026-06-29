import Stripe from "stripe";

type CryptoProvider = ReturnType<typeof Stripe.createSubtleCryptoProvider>;

let client: Stripe | null = null;
let cryptoProvider: CryptoProvider | null = null;

/**
 * Cliente Stripe inicializado sob demanda (lazy).
 *
 * `createFetchHttpClient()` torna o SDK compatível com Cloudflare Workers
 * (sem o http nativo do Node). Em Node funciona igualmente.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    client = new Stripe(key, {
      typescript: true,
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return client;
}

/**
 * Provider de cripto assíncrono (Web Crypto) para verificar a assinatura do
 * webhook em runtimes sem o crypto síncrono do Node (ex.: Workers).
 */
export function getCryptoProvider(): CryptoProvider {
  if (!cryptoProvider) {
    cryptoProvider = Stripe.createSubtleCryptoProvider();
  }
  return cryptoProvider;
}
