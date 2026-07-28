/**
 * Troca manual da forma de pagamento (admin) — regras puras, testáveis.
 *
 * O admin pode trocar Pix ↔ cartão (ou carnê → Pix à vista / cartão) enquanto
 * NENHUM dinheiro entrou nem há comprovante esperando decisão. Depois disso a
 * troca é bloqueada: mexeria em valores já confirmados ou descartaria um
 * comprovante sem ninguém decidir sobre ele.
 */

export type FormaAlvo = "PIX" | "CARD";

export const FORMA_ALVO_LABEL: Record<FormaAlvo, string> = {
  PIX: "Pix à vista",
  CARD: "cartão",
};

export interface PagamentoParaTroca {
  method: string;
  status: string;
  installmentsTotal: number | null;
  installments: { status: string }[];
}

/**
 * Motivo pelo qual a troca NÃO pode acontecer, ou null se pode.
 * A ordem das checagens dá a mensagem mais útil primeiro.
 */
export function bloqueioTrocaForma(
  p: PagamentoParaTroca,
  alvo: FormaAlvo,
): string | null {
  const isCarne = p.installments.length > 0;

  // Mesmo estado → não é uma troca. (Carnê → PIX é válido: vira à vista.)
  if (p.method === alvo && !(alvo === "PIX" && isCarne)) {
    return "O pagamento já está nessa forma.";
  }
  if (p.status === "CONFIRMED") {
    return "Pagamento já confirmado — não é possível trocar a forma.";
  }
  if (p.status === "AWAITING_REVIEW") {
    return "Há um comprovante aguardando revisão — confirme ou rejeite antes de trocar a forma.";
  }
  if (p.installments.some((i) => i.status === "CONFIRMED")) {
    return "Este carnê já tem parcela confirmada — não é possível trocar a forma.";
  }
  if (p.installments.some((i) => i.status === "AWAITING_REVIEW")) {
    return "Há parcela com comprovante aguardando revisão — decida antes de trocar a forma.";
  }
  return null;
}

/** Alvos de troca que fazem sentido para o estado atual do pagamento. */
export function alvosDisponiveis(p: PagamentoParaTroca): FormaAlvo[] {
  const isCarne = p.installments.length > 0;
  const alvos: FormaAlvo[] = [];
  if (p.method !== "PIX" || isCarne) alvos.push("PIX");
  if (p.method !== "CARD") alvos.push("CARD");
  return alvos.filter((a) => bloqueioTrocaForma(p, a) === null);
}
