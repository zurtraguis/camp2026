/**
 * Custos do acampamento — regras puras, testáveis.
 *
 * Uma despesa tem um valor combinado e pode ser paga em partes (a entrada do
 * aluguel, depois o restante). O que importa para o controle é sempre a mesma
 * pergunta: quanto já saiu e quanto ainda falta.
 */

export type CategoriaDespesa =
  | "LOCAL"
  | "ALIMENTACAO"
  | "TRANSPORTE"
  | "MATERIAL"
  | "EQUIPE"
  | "ESTRUTURA"
  | "OUTRO";

export const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  LOCAL: "Local / aluguel",
  ALIMENTACAO: "Alimentação",
  TRANSPORTE: "Transporte",
  MATERIAL: "Material",
  EQUIPE: "Equipe",
  ESTRUTURA: "Estrutura",
  OUTRO: "Outro",
};

export const CATEGORIAS: CategoriaDespesa[] = [
  "LOCAL",
  "ALIMENTACAO",
  "TRANSPORTE",
  "MATERIAL",
  "EQUIPE",
  "ESTRUTURA",
  "OUTRO",
];

export type FormaPagamentoDespesa =
  | "PIX"
  | "DINHEIRO"
  | "CARTAO"
  | "TRANSFERENCIA"
  | "BOLETO"
  | "OUTRO";

export const FORMA_DESPESA_LABEL: Record<FormaPagamentoDespesa, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
  BOLETO: "Boleto",
  OUTRO: "Outro",
};

export const FORMAS_DESPESA: FormaPagamentoDespesa[] = [
  "PIX",
  "DINHEIRO",
  "CARTAO",
  "TRANSFERENCIA",
  "BOLETO",
  "OUTRO",
];

export interface DespesaParaSaldo {
  amountCents: number;
  dueDate: Date | null;
  payments: { amountCents: number; paidAt: Date }[];
}

export interface SaldoDespesa {
  totalCents: number;
  pagoCents: number;
  abertoCents: number;
  quitada: boolean;
  /** Pagou mais do que o combinado — sinaliza erro de digitação. */
  excedeu: boolean;
  /** Vencida e ainda com saldo. */
  vencida: boolean;
  /** Data do último pagamento, para ordenar/exibir. */
  ultimoPagamentoEm: Date | null;
}

/** Situação financeira de UMA despesa. */
export function saldoDaDespesa(d: DespesaParaSaldo, hoje: Date): SaldoDespesa {
  const pagoCents = d.payments.reduce((s, p) => s + p.amountCents, 0);
  const abertoCents = Math.max(0, d.amountCents - pagoCents);
  const ultimo = d.payments.reduce<Date | null>(
    (max, p) => (max === null || p.paidAt > max ? p.paidAt : max),
    null,
  );
  return {
    totalCents: d.amountCents,
    pagoCents,
    abertoCents,
    quitada: abertoCents === 0,
    // Não corrigimos automaticamente: pode ser multa/reajuste legítimo, e
    // esconder o excesso atrapalharia a conferência.
    excedeu: pagoCents > d.amountCents,
    vencida:
      abertoCents > 0 && d.dueDate !== null && d.dueDate.getTime() < hoje.getTime(),
    ultimoPagamentoEm: ultimo,
  };
}

export interface TotaisCustos {
  previstoCents: number;
  pagoCents: number;
  abertoCents: number;
  vencidoCents: number;
  quantidade: number;
}

/** Somatório de todas as despesas. */
export function totaisDosCustos(
  despesas: DespesaParaSaldo[],
  hoje: Date,
): TotaisCustos {
  return despesas.reduce<TotaisCustos>(
    (acc, d) => {
      const s = saldoDaDespesa(d, hoje);
      return {
        previstoCents: acc.previstoCents + s.totalCents,
        pagoCents: acc.pagoCents + s.pagoCents,
        abertoCents: acc.abertoCents + s.abertoCents,
        vencidoCents: acc.vencidoCents + (s.vencida ? s.abertoCents : 0),
        quantidade: acc.quantidade + 1,
      };
    },
    {
      previstoCents: 0,
      pagoCents: 0,
      abertoCents: 0,
      vencidoCents: 0,
      quantidade: 0,
    },
  );
}

/** Total por categoria, do maior para o menor — onde o dinheiro está indo. */
export function totaisPorCategoria(
  despesas: (DespesaParaSaldo & { category: string })[],
  hoje: Date,
): { categoria: CategoriaDespesa; previstoCents: number; pagoCents: number }[] {
  const mapa = new Map<string, { previstoCents: number; pagoCents: number }>();
  for (const d of despesas) {
    const s = saldoDaDespesa(d, hoje);
    const atual = mapa.get(d.category) ?? { previstoCents: 0, pagoCents: 0 };
    mapa.set(d.category, {
      previstoCents: atual.previstoCents + s.totalCents,
      pagoCents: atual.pagoCents + s.pagoCents,
    });
  }
  return [...mapa.entries()]
    .map(([categoria, v]) => ({ categoria: categoria as CategoriaDespesa, ...v }))
    .sort((a, b) => b.previstoCents - a.previstoCents);
}

export interface Balanco {
  entrouCents: number;
  saiuCents: number;
  /** O que sobra hoje: dinheiro recebido menos o já pago. */
  saldoCents: number;
  /** Projeção: se todos pagarem e todas as despesas forem quitadas. */
  projetadoCents: number;
}

/**
 * Balanço do acampamento. `saldo` é a foto de agora (dinheiro que entrou menos
 * o que já saiu). `projetado` é o cenário final: tudo que se espera receber
 * menos tudo que se espera gastar — é ele que diz se o acampamento fecha no
 * azul.
 */
export function balanco(
  recebidoCents: number,
  aReceberCents: number,
  custos: TotaisCustos,
): Balanco {
  return {
    entrouCents: recebidoCents,
    saiuCents: custos.pagoCents,
    saldoCents: recebidoCents - custos.pagoCents,
    projetadoCents:
      recebidoCents + aReceberCents - custos.previstoCents,
  };
}
