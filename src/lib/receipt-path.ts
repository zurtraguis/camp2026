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
