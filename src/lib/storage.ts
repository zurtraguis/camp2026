import "server-only";

import { AwsClient } from "aws4fetch";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Upload de comprovantes Pix para um bucket PRIVADO.
 *
 * Backends suportados (nesta ordem de preferência):
 *  1. S3 compatível (SeaweedFS / MinIO / R2) — via `aws4fetch` (assinatura v4).
 *  2. Supabase Storage — fallback.
 *
 * Decisões (best practices):
 *  - bucket privado; nunca público.
 *  - upload server-side com credenciais de serviço.
 *  - validação por magic bytes (file.type é falsificável).
 *  - admin acessa via signed URL de curta duração (gerada sob demanda).
 *  - caminho prefixado por registrationId para isolamento.
 */

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_RECEIPT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/* ─── Backend S3 (SeaweedFS / MinIO / R2) ─── */

function s3Configured(): boolean {
  return Boolean(
    env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY,
  );
}

let _s3: AwsClient | null = null;
function s3Client(): AwsClient {
  if (!_s3) {
    _s3 = new AwsClient({
      accessKeyId: env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
      region: env.S3_REGION,
      service: "s3",
    });
  }
  return _s3;
}

/** Monta a URL do objeto (path-style para SeaweedFS/MinIO; virtual-host opcional). */
function s3ObjectUrl(path: string): string {
  const base = (env.S3_ENDPOINT as string).replace(/\/$/, "");
  const key = path.split("/").map(encodeURIComponent).join("/");
  return env.S3_FORCE_PATH_STYLE
    ? `${base}/${env.S3_BUCKET}/${key}`
    : `${base.replace("://", `://${env.S3_BUCKET}.`)}/${key}`;
}

/* ─── Backend Supabase (fallback) ─── */

let _admin: SupabaseClient | null = null;
function adminClient(): SupabaseClient {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  if (!_admin) {
    _admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}

export function storageConfigured(): boolean {
  return (
    s3Configured() ||
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Verifica os primeiros bytes contra assinaturas conhecidas. */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  )
    return "application/pdf";
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export interface ValidatedReceipt {
  buffer: Uint8Array;
  contentType: string;
  ext: string;
}

/** Valida tamanho e tipo real (magic bytes) do comprovante. */
export async function validateReceipt(file: File): Promise<ValidatedReceipt> {
  if (file.size === 0) throw new Error("Arquivo vazio.");
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Arquivo muito grande (máx 10MB).");
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  const real = sniffMime(buffer);
  if (!real || !ALLOWED_RECEIPT_MIME.includes(real as never)) {
    throw new Error("Tipo de arquivo inválido (use JPG, PNG, WEBP ou PDF).");
  }
  const ext =
    real === "application/pdf"
      ? "pdf"
      : real === "image/png"
        ? "png"
        : real === "image/webp"
          ? "webp"
          : "jpg";
  return { buffer, contentType: real, ext };
}

/** Faz o upload e retorna o caminho salvo. */
export async function uploadReceipt(
  registrationId: string,
  receipt: ValidatedReceipt,
): Promise<string> {
  const path = `${registrationId}/comprovante.${receipt.ext}`;

  if (s3Configured()) {
    const res = await s3Client().fetch(s3ObjectUrl(path), {
      method: "PUT",
      body: new Blob([receipt.buffer as BlobPart], {
        type: receipt.contentType,
      }),
      headers: { "content-type": receipt.contentType },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Falha no upload do comprovante (S3 ${res.status}). ${detail}`.trim(),
      );
    }
    return path;
  }

  const { error } = await adminClient()
    .storage.from(env.SUPABASE_COMPROVANTES_BUCKET)
    .upload(path, receipt.buffer, {
      contentType: receipt.contentType,
      upsert: true,
    });
  if (error) throw new Error(`Falha no upload do comprovante: ${error.message}`);
  return path;
}

/** URL assinada de curta duração para o admin visualizar (default 15 min). */
export async function signedReceiptUrl(
  path: string,
  expiresInSeconds = 900,
): Promise<string> {
  if (s3Configured()) {
    const signed = await s3Client().sign(
      new Request(`${s3ObjectUrl(path)}?X-Amz-Expires=${expiresInSeconds}`),
      { aws: { signQuery: true } },
    );
    return signed.url;
  }

  const { data, error } = await adminClient()
    .storage.from(env.SUPABASE_COMPROVANTES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Falha ao gerar URL: ${error?.message}`);
  return data.signedUrl;
}
