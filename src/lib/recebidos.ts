/**
 * Extrato de recebimentos — regras puras, testáveis.
 *
 * Existe porque o dashboard mostrava "R$ 1.800,00 em caixa" sem dizer DE ONDE
 * veio. Aqui cada entrada de dinheiro vira uma linha: quem pagou, quanto,
 * quando, como e quem confirmou.
 *
 * Uma entrada = um pagamento à vista confirmado OU uma parcela de carnê
 * confirmada. Nunca os dois para o mesmo dinheiro (o payment de um carnê só
 * vira CONFIRMED quando todas as parcelas já entraram individualmente).
 */

export type OrigemRecebimento = "PIX" | "CARTAO" | "DINHEIRO" | "OUTRO";

export const ORIGEM_LABEL: Record<OrigemRecebimento, string> = {
  PIX: "Pix",
  CARTAO: "Cartão",
  DINHEIRO: "Dinheiro",
  OUTRO: "Outro",
};

export interface Recebimento {
  /** Chave estável para o React e para conferência. */
  id: string;
  publicCode: string;
  nome: string;
  /** "À vista" ou "2ª parcela". */
  descricao: string;
  valorCents: number;
  /** Quando o admin confirmou (ou o webhook, no cartão online). */
  em: Date | null;
  origem: OrigemRecebimento;
  /** Nome de quem confirmou, quando registrado. */
  confirmadoPor: string | null;
  /** Nota da revisão/baixa — a trilha de "como o dinheiro entrou". */
  nota: string | null;
}

/**
 * Deduz a origem do dinheiro. A baixa manual grava a forma no reviewNote
 * ("Baixa manual — recebido em dinheiro: ..."), que é a única evidência quando
 * não há comprovante no storage. Sem baixa manual, vale o método do pagamento.
 */
export function origemDoRecebimento(
  method: string,
  nota: string | null,
): OrigemRecebimento {
  const n = (nota ?? "").toLowerCase();
  if (n.includes("baixa manual")) {
    if (n.includes("dinheiro")) return "DINHEIRO";
    if (n.includes("cartão") || n.includes("cartao")) return "CARTAO";
    if (n.includes("pix")) return "PIX";
    return "OUTRO";
  }
  return method === "CARD" ? "CARTAO" : "PIX";
}

export interface PagamentoParaExtrato {
  id: string;
  method: string;
  status: string;
  amountCents: number;
  reviewedAt: Date | null;
  reviewNote: string | null;
  reviewedBy: { name: string | null } | null;
  registration: { publicCode: string; fullName: string };
  installments: {
    id: string;
    number: number;
    amountCents: number;
    status: string;
    reviewedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: { name: string | null } | null;
  }[];
}

/** Achata os pagamentos em linhas de dinheiro que REALMENTE entrou. */
export function extrairRecebimentos(
  pagamentos: PagamentoParaExtrato[],
): Recebimento[] {
  const linhas: Recebimento[] = [];

  for (const p of pagamentos) {
    const carne = p.installments.length > 0;

    if (carne) {
      for (const i of p.installments) {
        if (i.status !== "CONFIRMED") continue;
        linhas.push({
          id: i.id,
          publicCode: p.registration.publicCode,
          nome: p.registration.fullName,
          descricao: `${i.number}ª parcela`,
          valorCents: i.amountCents,
          em: i.reviewedAt,
          origem: origemDoRecebimento(p.method, i.reviewNote),
          confirmadoPor: i.reviewedBy?.name ?? null,
          nota: i.reviewNote,
        });
      }
      continue;
    }

    if (p.status === "CONFIRMED") {
      linhas.push({
        id: p.id,
        publicCode: p.registration.publicCode,
        nome: p.registration.fullName,
        descricao: "À vista",
        valorCents: p.amountCents,
        em: p.reviewedAt,
        origem: origemDoRecebimento(p.method, p.reviewNote),
        confirmadoPor: p.reviewedBy?.name ?? null,
        nota: p.reviewNote,
      });
    }
  }

  // Mais recente primeiro; sem data (cartão via webhook) vai para o fim.
  return linhas.sort((a, b) => (b.em?.getTime() ?? 0) - (a.em?.getTime() ?? 0));
}

/** Soma por origem, para o "de onde veio" em uma olhada. */
export function totaisPorOrigem(
  linhas: Recebimento[],
): { origem: OrigemRecebimento; totalCents: number; qtd: number }[] {
  const mapa = new Map<OrigemRecebimento, { totalCents: number; qtd: number }>();
  for (const l of linhas) {
    const atual = mapa.get(l.origem) ?? { totalCents: 0, qtd: 0 };
    mapa.set(l.origem, {
      totalCents: atual.totalCents + l.valorCents,
      qtd: atual.qtd + 1,
    });
  }
  return [...mapa.entries()]
    .map(([origem, v]) => ({ origem, ...v }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/** Total geral — precisa bater com o "em caixa" do dashboard. */
export function totalRecebido(linhas: Recebimento[]): number {
  return linhas.reduce((s, l) => s + l.valorCents, 0);
}
