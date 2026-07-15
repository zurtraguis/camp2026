/**
 * Saldo devedor de uma inscrição — regras puras, isoladas para teste.
 *
 * O corte entre carnê e à vista é "o pagamento TEM parcelas?", o mesmo usado
 * nos totais do dashboard. Carnê conta parcela a parcela (o `payment` só vira
 * CONFIRMED na última); à vista conta pelo próprio pagamento.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export interface PagamentoParaSaldo {
  amountCents: number;
  status: string;
  installments: { amountCents: number; dueDate: Date; status: string }[];
}

export interface Saldo {
  carne: boolean;
  totalCents: number;
  pagoCents: number;
  abertoCents: number;
  quitado: boolean;
  /** Parcelas (ou o Pix à vista) com comprovante esperando decisão. */
  emRevisao: number;
  /** Parcelas não confirmadas cujo vencimento já passou. */
  vencidas: number;
  /** Dias desde o vencimento mais ANTIGO em aberto. 0 = nada vencido. */
  diasAtraso: number;
}

/** Dias inteiros entre `de` e `ate` (0 se `ate` ainda não passou de `de`). */
function diasEntre(de: Date, ate: Date): number {
  return Math.max(0, Math.floor((ate.getTime() - de.getTime()) / DIA_MS));
}

export function saldoDoPagamento(p: PagamentoParaSaldo, hoje: Date): Saldo {
  const carne = p.installments.length > 0;
  const totalCents = p.amountCents;

  const pagoCents = carne
    ? p.installments
        .filter((i) => i.status === "CONFIRMED")
        .reduce((s, i) => s + i.amountCents, 0)
    : p.status === "CONFIRMED"
      ? p.amountCents
      : 0;

  const emRevisao = carne
    ? p.installments.filter((i) => i.status === "AWAITING_REVIEW").length
    : p.status === "AWAITING_REVIEW"
      ? 1
      : 0;

  // Só o carnê tem vencimento por parcela; à vista não tem data de corte aqui.
  const abertasVencidas = p.installments.filter(
    (i) => i.status !== "CONFIRMED" && i.dueDate.getTime() < hoje.getTime(),
  );
  const maisAntiga = abertasVencidas.reduce<Date | null>(
    (min, i) => (min === null || i.dueDate < min ? i.dueDate : min),
    null,
  );

  const abertoCents = Math.max(0, totalCents - pagoCents);
  return {
    carne,
    totalCents,
    pagoCents,
    abertoCents,
    quitado: abertoCents === 0,
    emRevisao,
    vencidas: abertasVencidas.length,
    diasAtraso: maisAntiga ? diasEntre(maisAntiga, hoje) : 0,
  };
}

/** Mais atrasado primeiro; empate desempata pelo maior valor em aberto. */
export function ordenarPorUrgencia<T extends { saldo: Saldo }>(linhas: T[]): T[] {
  return [...linhas].sort(
    (a, b) =>
      b.saldo.diasAtraso - a.saldo.diasAtraso ||
      b.saldo.abertoCents - a.saldo.abertoCents,
  );
}
