/**
 * Colunas e montagem de linha da aba "Inscrições" da planilha.
 *
 * Vive fora da route porque route handler não se testa direito: a camisa (e
 * metade do que a família preenche) ficou de fora da exportação por meses sem
 * nada acusar. Aqui é função pura — um teste confere campo a campo.
 *
 * LGPD — minimização: saúde e triagem NÃO entram nesta exportação geral; para
 * isso existe o relatório de saúde, com acesso próprio. O CPF também fica fora:
 * a ficha individual já o mostra parcial de propósito, e uma planilha circula.
 */

export const STATUS_PT: Record<string, string> = {
  PENDING_PAYMENT: "Aguard. pagamento",
  AWAITING_REVIEW: "Em revisão",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

export const METHOD_PT: Record<string, string> = {
  CARD: "Cartão",
  PIX: "Pix",
};

export const GENDER_PT: Record<string, string> = {
  MALE: "M",
  FEMALE: "F",
};

/** Formato de moeda BRL na célula: soma e filtro funcionam no Excel. */
export const BRL = "R$ #,##0.00";

export interface InscricaoParaExport {
  publicCode: string;
  fullName: string;
  birthDate: Date;
  ageAtCamp: number;
  gender: string;
  phone: string | null;
  email: string | null;
  shirtSize: string | null;
  church: string | null;
  city: string | null;
  tribo: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
  guardian: {
    name: string;
    phone: string;
    email: string | null;
    relationship: string;
  } | null;
  payment: {
    method: string;
    amountCents: number;
    status: string;
    installmentsTotal: number | null;
    couponCode: string | null;
    discountPercent: number | null;
    originalAmountCents: number | null;
    /** Como o dinheiro entrou: baixa manual, cupom, cartão da igreja… */
    reviewNote: string | null;
    installments: { number: number; status: string; reviewNote: string | null }[];
  } | null;
}

export interface ColunaExport {
  header: string;
  key: string;
  width: number;
  moeda?: boolean;
}

export const COLUNAS_INSCRICOES: ColunaExport[] = [
  { header: "Código", key: "codigo", width: 16 },
  { header: "Nome", key: "nome", width: 32 },
  { header: "Nascimento", key: "nascimento", width: 13 },
  { header: "Idade", key: "idade", width: 7 },
  { header: "Gênero", key: "genero", width: 8 },
  { header: "Camisa", key: "camisa", width: 9 },
  { header: "Tribo", key: "tribo", width: 12 },
  { header: "Status", key: "status", width: 18 },
  { header: "Forma", key: "forma", width: 14 },
  { header: "Parcelas pagas", key: "parcelasPagas", width: 15 },
  { header: "Valor", key: "valor", width: 12, moeda: true },
  { header: "Cupom", key: "cupom", width: 16 },
  { header: "Valor cheio", key: "cheio", width: 12, moeda: true },
  { header: "Lote", key: "lote", width: 12 },
  { header: "Igreja", key: "igreja", width: 26 },
  { header: "Cidade", key: "cidade", width: 18 },
  { header: "Telefone", key: "tel", width: 18 },
  { header: "E-mail", key: "email", width: 28 },
  { header: "Responsável", key: "resp", width: 28 },
  { header: "Parentesco", key: "parentesco", width: 14 },
  { header: "Telefone responsável", key: "respTel", width: 20 },
  { header: "E-mail responsável", key: "respEmail", width: 28 },
  { header: "Obs. pagamento", key: "obsPagamento", width: 46 },
  { header: "Observação interna", key: "obs", width: 40 },
  { header: "Inscrito em", key: "criado", width: 14 },
];

const dataBR = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Junta as observações de pagamento numa célula só.
 *
 * No carnê cada parcela tem a sua, e sem o rótulo "1ª/2ª" as notas viram uma
 * sopa — ainda mais quando duas parcelas foram pagas de formas diferentes.
 */
function notasDoPagamento(
  p: InscricaoParaExport["payment"],
): string {
  if (!p) return "";
  const partes: string[] = [];
  if (p.reviewNote?.trim()) partes.push(p.reviewNote.trim());
  for (const i of p.installments) {
    if (i.reviewNote?.trim()) partes.push(`${i.number}ª: ${i.reviewNote.trim()}`);
  }
  return partes.join(" | ");
}

/** Uma linha da aba "Inscrições" — as chaves batem com COLUNAS_INSCRICOES. */
export function linhaInscricao(
  r: InscricaoParaExport,
  loteNome: string | null,
): Record<string, string | number | null> {
  const p = r.payment;
  const parcelas = p?.installmentsTotal ?? null;
  const pagas = p?.installments.filter((i) => i.status === "CONFIRMED").length ?? 0;

  return {
    codigo: r.publicCode,
    nome: r.fullName,
    nascimento: dataBR(r.birthDate),
    idade: r.ageAtCamp,
    genero: GENDER_PT[r.gender] ?? r.gender,
    // O que a família escolheu no formulário — é com isto que se encomenda a
    // camisa, e era justamente o que não vinha na planilha.
    camisa: r.shirtSize ?? "",
    tribo: r.tribo ?? "",
    status: STATUS_PT[r.status] ?? r.status,
    forma: p
      ? parcelas
        ? `Carnê ${parcelas}x`
        : (METHOD_PT[p.method] ?? p.method)
      : "",
    // Só faz sentido no carnê; à vista fica em branco em vez de "0/0".
    parcelasPagas: parcelas ? `${pagas}/${parcelas}` : "",
    valor: p ? p.amountCents / 100 : null,
    cupom: p?.couponCode ? `${p.couponCode} (−${p.discountPercent ?? 0}%)` : "",
    cheio: p?.originalAmountCents ? p.originalAmountCents / 100 : null,
    lote: loteNome ?? "",
    igreja: r.church ?? "",
    cidade: r.city ?? "",
    tel: r.phone ?? "",
    email: r.email ?? "",
    resp: r.guardian?.name ?? "",
    parentesco: r.guardian?.relationship ?? "",
    respTel: r.guardian?.phone ?? "",
    respEmail: r.guardian?.email ?? "",
    // A trilha de COMO o dinheiro entrou: baixa manual em espécie, cupom que
    // zerou, cartão da igreja. Estava só na ficha e na aba Recebidos; quem
    // conferia o caixa pela planilha de inscritos não via nada.
    obsPagamento: notasDoPagamento(p),
    obs: r.adminNotes ?? "",
    criado: dataBR(r.createdAt),
  };
}
