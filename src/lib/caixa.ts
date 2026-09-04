/**
 * Extrato de caixa: entradas e saídas na mesma linha do tempo, com SALDO
 * CORRENTE — e a pergunta que importa antes de assumir uma despesa: "o dinheiro
 * que está em caixa cobre o que já está combinado?".
 *
 * Por que não bastava o que já existia: "Recebidos" mostrava só o que entrou,
 * "Custos" só o que sai, e os cards davam o saldo de HOJE num número só. Nada
 * respondia "depois de pagar o aluguel dia 10, sobra quanto?" — que é o que
 * decide se dá para fechar um contrato novo.
 *
 * Regras puras, sem Prisma. O dinheiro é sempre inteiro em centavos.
 */

export type TipoMovimento = "ENTRADA" | "SAIDA";

export interface Movimento {
  /** Chave estável para o React. */
  id: string;
  em: Date;
  tipo: TipoMovimento;
  /** "Maria de Souza — 2ª parcela" ou "Aluguel do sítio — entrada". */
  descricao: string;
  /** Pix, Dinheiro, Cartão… */
  meio: string;
  valorCents: number;
}

export interface LinhaExtrato extends Movimento {
  /** Saldo do caixa DEPOIS deste movimento. */
  saldoCents: number;
}

/**
 * Monta o extrato: ordena por data, acumula o saldo e devolve do mais recente
 * para o mais antigo — como extrato de banco, que é onde a pessoa procura.
 *
 * O saldo de cada linha é o saldo NAQUELE momento, não o de hoje: é isso que
 * deixa conferir "quando foi que o caixa ficou negativo".
 *
 * Empate de data resolvido por id, para a ordem não dançar entre dois carregamentos.
 */
export function montarExtrato(movimentos: Movimento[]): LinhaExtrato[] {
  const cronologico = [...movimentos].sort(
    (a, b) => a.em.getTime() - b.em.getTime() || a.id.localeCompare(b.id),
  );

  let saldo = 0;
  const comSaldo = cronologico.map((m) => {
    saldo += m.tipo === "ENTRADA" ? m.valorCents : -m.valorCents;
    return { ...m, saldoCents: saldo };
  });

  return comSaldo.reverse();
}

/** Saldo depois de todos os movimentos (0 se não houver nenhum). */
export function saldoAtual(movimentos: Movimento[]): number {
  return movimentos.reduce(
    (s, m) => s + (m.tipo === "ENTRADA" ? m.valorCents : -m.valorCents),
    0,
  );
}

export interface DespesaEmAberto {
  id: string;
  description: string;
  /** Quanto ainda falta pagar desta despesa. */
  abertoCents: number;
  dueDate: Date | null;
}

export interface Compromisso {
  id: string;
  descricao: string;
  dueDate: Date | null;
  valorCents: number;
  /** Saldo projetado DEPOIS de honrar este compromisso e os anteriores. */
  saldoDepoisCents: number;
  /** O caixa não cobre este compromisso (nem os anteriores). */
  descoberto: boolean;
  /** Já passou da data e continua em aberto. */
  vencido: boolean;
}

/**
 * O que ainda temos de pagar, na ordem em que vence, descontando do dinheiro
 * que JÁ ESTÁ em caixa.
 *
 * Conservador de propósito: não conta o que ainda pode entrar de inscrição.
 * Uma promessa de pagamento não paga fornecedor — se a conta só fecha contando
 * com quem ainda não pagou, isso precisa aparecer como risco, não sumir dentro
 * de um número otimista. A projeção "se todos pagarem" continua nos cards.
 *
 * Sem vencimento vai para o fim da fila: é o que não tem data marcada.
 */
export function compromissos(
  despesas: DespesaEmAberto[],
  saldoEmCaixaCents: number,
  hoje: Date,
): Compromisso[] {
  const emAberto = despesas.filter((d) => d.abertoCents > 0);
  const ordenadas = [...emAberto].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime() || a.id.localeCompare(b.id);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.id.localeCompare(b.id);
  });

  let saldo = saldoEmCaixaCents;
  return ordenadas.map((d) => {
    saldo -= d.abertoCents;
    return {
      id: d.id,
      descricao: d.description,
      dueDate: d.dueDate,
      valorCents: d.abertoCents,
      saldoDepoisCents: saldo,
      descoberto: saldo < 0,
      vencido: d.dueDate !== null && d.dueDate.getTime() < hoje.getTime(),
    };
  });
}

export interface ResumoCaixa {
  saldoCents: number;
  /** Soma de tudo que ainda falta pagar. */
  compromissadoCents: number;
  /** O que sobra depois de honrar todos os compromissos. Pode ser negativo. */
  livreCents: number;
  /** Quanto falta entrar para cobrir os compromissos (0 se o caixa cobre). */
  faltaCents: number;
  /** O primeiro compromisso que o caixa não cobre — onde a corda arrebenta. */
  primeiroDescoberto: Compromisso | null;
}

export function resumoCaixa(
  saldoEmCaixaCents: number,
  lista: Compromisso[],
): ResumoCaixa {
  const compromissadoCents = lista.reduce((s, c) => s + c.valorCents, 0);
  const livreCents = saldoEmCaixaCents - compromissadoCents;
  return {
    saldoCents: saldoEmCaixaCents,
    compromissadoCents,
    livreCents,
    faltaCents: Math.max(0, -livreCents),
    primeiroDescoberto: lista.find((c) => c.descoberto) ?? null,
  };
}
