import { z } from "zod";

/**
 * Validação de ambiente. Secrets de integração são `optional()` para que o
 * build/CI e o `next dev` rodem sem credenciais — cada serviço falha em runtime
 * (fail-closed) com mensagem clara quando a chave correspondente falta.
 */
const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Acampamento RAIZ 2026"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Banco (Supabase Postgres)
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),

  // Storage de comprovantes Pix — backend S3 (SeaweedFS / MinIO / R2). Preferido
  // quando configurado; senão cai no Supabase Storage abaixo.
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("comprovantes"),
  // SeaweedFS/MinIO usam path-style (endpoint/bucket/key). Em "true" (padrão).
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // Supabase Storage (fallback do upload de comprovantes Pix)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_COMPROVANTES_BUCKET: z.string().default("comprovantes"),

  // Pix manual (chave + dados do recebedor para o BR Code "copia e cola")
  NEXT_PUBLIC_PIX_KEY: z.string().optional(),
  NEXT_PUBLIC_PIX_RECEIVER_NAME: z.string().default("ACAMPAMENTO RAIZ"),
  NEXT_PUBLIC_PIX_RECEIVER_CITY: z.string().default("SAO PAULO"),

  // Consentimento — versão do termo exibido (LGPD: rastreabilidade).
  NEXT_PUBLIC_CONSENT_TERM_VERSION: z.string().default("v1-2026-06"),

  // Sessão admin
  AUTH_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Variáveis de ambiente inválidas");
  }
  return parsed.data;
}

export const env = getEnv();
