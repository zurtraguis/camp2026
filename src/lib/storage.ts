import "server-only";

import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt-check";
import {
  receiptPath,
  marcarSupabase,
  isSupabasePath,
  stripBackendPrefix,
} from "@/lib/receipt-path";

// Reexportados: ambos vivem em módulos puros (este arquivo é server-only e
// nada aqui dentro é importável em teste ou no cliente).
export { MAX_RECEIPT_BYTES, receiptPath };

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

function supabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function storageConfigured(): boolean {
  return s3Configured() || supabaseConfigured();
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

/** Mensagem única para o público. O detalhe técnico vai só para o log. */
const ERRO_UPLOAD_PUBLICO =
  "Não conseguimos guardar seu comprovante agora — o problema é do nosso lado, não do seu arquivo. Tente novamente em alguns minutos; se persistir, envie o comprovante para a organização pelo WhatsApp que confirmamos manualmente.";

/** Sobe para o S3. Devolve o path, ou null se o backend falhou. */
async function tentarS3(
  path: string,
  receipt: ValidatedReceipt,
): Promise<string | null> {
  try {
    const res = await s3Client().fetch(s3ObjectUrl(path), {
      method: "PUT",
      body: new Blob([receipt.buffer as BlobPart], { type: receipt.contentType }),
      headers: { "content-type": receipt.contentType },
    });
    if (res.ok) return path;
    // O corpo é lido só para o LOG. Nunca vai para a tela: quando o endpoint
    // está atrás de um proxy, ele devolve uma página HTML inteira de erro —
    // foi exatamente isso que apareceu para uma família (Cloudflare 502).
    const detail = (await res.text().catch(() => "")).slice(0, 500);
    console.error(
      `[storage] S3 recusou o upload (${res.status}). Trecho: ${detail}`,
    );
    return null;
  } catch (err) {
    console.error("[storage] S3 inacessível:", err);
    return null;
  }
}

/** Sobe para o Supabase Storage. Devolve o path, ou null se falhou. */
async function tentarSupabase(
  path: string,
  receipt: ValidatedReceipt,
): Promise<string | null> {
  try {
    const { error } = await adminClient()
      .storage.from(env.SUPABASE_COMPROVANTES_BUCKET)
      // upsert:false — o path é único por envio; sobrescrever seria perder prova.
      .upload(path, receipt.buffer, {
        contentType: receipt.contentType,
        upsert: false,
      });
    // Marca o backend no caminho: a leitura precisa saber onde procurar.
    if (!error) return marcarSupabase(path);
    console.error("[storage] Supabase recusou o upload:", error.message);
    return null;
  } catch (err) {
    console.error("[storage] Supabase inacessível:", err);
    return null;
  }
}

/**
 * Faz o upload e retorna o caminho salvo. `scope`: "avista" ou o id da parcela.
 *
 * RESILIÊNCIA: tenta o S3 e, se ele falhar, cai para o Supabase Storage quando
 * também estiver configurado. Antes, um S3 fora do ar (502) simplesmente
 * derrubava o envio — a família não conseguia mandar o comprovante de um
 * pagamento que ela já tinha feito, mesmo havendo um segundo backend pronto.
 *
 * O caminho é o mesmo nos dois backends, então `signedReceiptUrl` continua
 * achando o arquivo — desde que o backend usado siga configurado.
 */
export async function uploadReceipt(
  registrationId: string,
  receipt: ValidatedReceipt,
  scope: string,
): Promise<string> {
  const path = receiptPath(
    registrationId,
    scope,
    receipt.ext,
    `${Date.now()}-${randomUUID().slice(0, 8)}`,
  );

  if (s3Configured()) {
    const ok = await tentarS3(path, receipt);
    if (ok) return ok;
    if (supabaseConfigured()) {
      console.warn("[storage] S3 falhou; tentando o Supabase Storage.");
      const alt = await tentarSupabase(path, receipt);
      if (alt) return alt;
    }
    throw new Error(ERRO_UPLOAD_PUBLICO);
  }

  const ok = await tentarSupabase(path, receipt);
  if (ok) return ok;
  throw new Error(ERRO_UPLOAD_PUBLICO);
}

/** URL assinada de curta duração para o admin visualizar (default 15 min). */
export async function signedReceiptUrl(
  path: string,
  expiresInSeconds = 900,
): Promise<string> {
  const real = stripBackendPrefix(path);

  // O marcador manda: um arquivo que caiu no Supabase (fallback) tem que ser
  // lido lá, mesmo com o S3 configurado — senão o link vem quebrado.
  if (!isSupabasePath(path) && s3Configured()) {
    const signed = await s3Client().sign(
      new Request(`${s3ObjectUrl(real)}?X-Amz-Expires=${expiresInSeconds}`),
      { aws: { signQuery: true } },
    );
    return signed.url;
  }

  const { data, error } = await adminClient()
    .storage.from(env.SUPABASE_COMPROVANTES_BUCKET)
    .createSignedUrl(real, expiresInSeconds);
  if (error || !data) throw new Error(`Falha ao gerar URL: ${error?.message}`);
  return data.signedUrl;
}
