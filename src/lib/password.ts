/**
 * Hash de senha com PBKDF2 via Web Crypto (SubtleCrypto).
 * Puro — sem `server-only`, sem dependência nativa — roda em Node, tsx (seed)
 * e Cloudflare Workers. Formato: `pbkdf2$<iter>$<saltB64>$<hashB64>`.
 */

const ITERATIONS = 120_000;
const KEYLEN = 32;

function b64(buf: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buf)).toString("base64");
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
    },
    key,
    KEYLEN * 8,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${ITERATIONS}$${b64(salt.buffer)}$${b64(hash)}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, , saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
  const salt = new Uint8Array(Buffer.from(saltB64, "base64"));
  const hash = await pbkdf2(password, salt);
  return timingSafeEqual(b64(hash), hashB64);
}
