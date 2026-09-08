/**
 * O que conta como inscrição "viva" — regras puras.
 *
 * Existia como `{ status: { not: "CANCELLED" } }` copiado em doze arquivos. Ao
 * introduzir DESATIVADA (set/2026) isso vira uma armadilha: esquecer um lugar
 * significa uma pessoa desativada continuar ocupando vaga, aparecendo na fila
 * de cobrança ou no relatório de saúde. Aqui a definição é uma só.
 *
 * DESATIVADA é diferente de CANCELADA:
 *   - CANCELLED  → acabou. Não volta.
 *   - INACTIVE   → sumiu, não responde, não pagou. A vaga é liberada e a
 *                  pessoa sai da tribo; se aparecer e pagar, volta — e volta
 *                  como quem se inscreveu NAQUELE dia, para não desequilibrar
 *                  as tribos que já foram montadas sem ela.
 */

export const STATUS_INSCRICAO = [
  "PENDING_PAYMENT",
  "AWAITING_REVIEW",
  "CONFIRMED",
  "INACTIVE",
  "CANCELLED",
] as const;

export type StatusInscricao = (typeof STATUS_INSCRICAO)[number];

/**
 * Status que ocupam vaga, entram nas tribos, na cobrança e nos relatórios.
 * Tudo que NÃO está aqui está fora do acampamento.
 */
export const STATUS_ATIVOS: StatusInscricao[] = [
  "PENDING_PAYMENT",
  "AWAITING_REVIEW",
  "CONFIRMED",
];

/** Filtro Prisma de inscrições vivas. Use SEMPRE este, nunca `not: CANCELLED`. */
export const ATIVAS = { status: { in: STATUS_ATIVOS } } as const;

/** Fora do acampamento: desativada ou cancelada. */
export function estaAtiva(status: string): boolean {
  return (STATUS_ATIVOS as string[]).includes(status);
}

/**
 * Pode ser desativada? Só faz sentido para quem não pagou nada.
 *
 * Com dinheiro confirmado em caixa, desativar criaria um valor a devolver sem
 * nenhum registro disso — a decisão passa a ser humana (cancelar e acertar a
 * devolução por fora), não um clique.
 */
export function bloqueioDesativar(reg: {
  status: string;
  temPagamentoConfirmado: boolean;
}): string | null {
  if (reg.status === "INACTIVE") return "Esta inscrição já está desativada.";
  if (reg.status === "CANCELLED") return "Esta inscrição está cancelada.";
  if (reg.temPagamentoConfirmado) {
    return "Há pagamento confirmado nesta inscrição — desativar deixaria um valor a devolver sem registro. Trate como cancelamento e acerte a devolução por fora.";
  }
  return null;
}

/** Pode ser reativada? Só quem está desativada. */
export function bloqueioReativar(reg: { status: string }): string | null {
  if (reg.status === "CANCELLED") {
    return "Inscrição cancelada não é reativada — faça uma inscrição nova.";
  }
  if (reg.status !== "INACTIVE") return "Esta inscrição já está ativa.";
  return null;
}
