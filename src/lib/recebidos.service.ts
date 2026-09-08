import "server-only";

import { db } from "@/lib/db";
import { extrairRecebimentos, type Recebimento } from "@/lib/recebidos";
import { ATIVAS } from "@/lib/registration-status";

/** Include compartilhado: tudo que o extrato precisa para explicar a entrada. */
const INCLUDE = {
  reviewedBy: { select: { name: true } },
  registration: { select: { publicCode: true, fullName: true } },
  installments: {
    orderBy: { number: "asc" },
    include: { reviewedBy: { select: { name: true } } },
  },
} as const;

/**
 * Extrato do dinheiro que entrou — uma linha por pagamento à vista confirmado
 * ou parcela de carnê confirmada. É a resposta para "de onde vieram esses
 * R$ 1.800?" que o total do dashboard não dava.
 */
export async function listarRecebimentos(): Promise<Recebimento[]> {
  const pagamentos = await db.payment.findMany({
    where: { registration: ATIVAS },
    include: INCLUDE,
  });
  return extrairRecebimentos(pagamentos);
}
