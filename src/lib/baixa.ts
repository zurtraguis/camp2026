/**
 * Baixa manual — regras puras (sem Prisma/storage, para poderem ser testadas).
 *
 * O fluxo normal exige comprovante subido pelo site. Mas dinheiro entra por
 * fora dele: em espécie na igreja, cartão na maquininha, Pix mandado no
 * particular. Nesses casos não existe comprovante no storage, então a NOTA é a
 * única trilha de COMO o dinheiro entrou — por isso a forma é obrigatória.
 */

export const FORMAS_RECEBIMENTO = ["DINHEIRO", "CARTAO", "PIX", "OUTRO"] as const;
export type FormaRecebimento = (typeof FORMAS_RECEBIMENTO)[number];

const FORMA_LABEL: Record<FormaRecebimento, string> = {
  DINHEIRO: "dinheiro",
  CARTAO: "cartão",
  PIX: "Pix",
  OUTRO: "outro",
};

/** Nota padronizada da baixa manual (gravada em reviewNote). */
export function notaBaixaManual(forma: FormaRecebimento, obs?: string): string {
  const base = `Baixa manual — recebido em ${FORMA_LABEL[forma]}`;
  const limpa = obs?.trim();
  return limpa ? `${base}: ${limpa}` : base;
}
