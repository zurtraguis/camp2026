/**
 * Caminho do comprovante no bucket — puro (sem `server-only`), para ser
 * testável.
 *
 * O ESCOPO é obrigatório: antes, todos os comprovantes de uma inscrição iam
 * para `${registrationId}/comprovante.ext` com upsert — no carnê 3x, a parcela
 * 2 sobrescrevia a evidência da parcela 1, sem erro nenhum. Cada envio agora
 * vira um objeto novo; o histórico É a trilha financeira.
 */
export function receiptPath(
  registrationId: string,
  scope: string,
  ext: string,
  unique: string,
): string {
  // `scope` vem de um id do banco, mas sanitizamos: nada de "../" no caminho.
  const safe = scope.replace(/[^A-Za-z0-9_-]/g, "") || "avista";
  return `${registrationId}/${safe}/${unique}.${ext}`;
}

/**
 * Marcador de backend no caminho gravado no banco.
 *
 * O upload cai para o Supabase quando o S3 está fora. Sem registrar ONDE o
 * arquivo ficou, a leitura procuraria no backend errado e o admin veria um
 * link quebrado. Caminho sem prefixo = S3 (inclusive os antigos).
 */
const PREFIXO_SUPABASE = "sb:";

export function marcarSupabase(path: string): string {
  return `${PREFIXO_SUPABASE}${path}`;
}

export function isSupabasePath(path: string): boolean {
  return path.startsWith(PREFIXO_SUPABASE);
}

/** Caminho real dentro do bucket, sem o marcador. */
export function stripBackendPrefix(path: string): string {
  return isSupabasePath(path) ? path.slice(PREFIXO_SUPABASE.length) : path;
}
