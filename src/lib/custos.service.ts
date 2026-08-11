import "server-only";

import { db } from "@/lib/db";
import type { CategoriaDespesa, FormaPagamentoDespesa } from "@/lib/custos";

/** Despesas com seus pagamentos — a base de tudo na tela de custos. */
export function listarDespesas() {
  return db.expense.findMany({
    include: {
      payments: { orderBy: { paidAt: "asc" } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export interface CriarDespesaInput {
  description: string;
  category: CategoriaDespesa;
  amountCents: number;
  supplier: string | null;
  dueDate: Date | null;
  notes: string | null;
  /** Pagamento já feito no momento do cadastro (ex.: a entrada do aluguel). */
  pagoAgoraCents?: number;
  pagoAgoraEm?: Date;
  pagoAgoraForma?: FormaPagamentoDespesa;
}

/**
 * Cria a despesa e, se informado, já registra o primeiro pagamento — o caso
 * real de cadastrar o aluguel dizendo "a entrada de R$2.000 já foi paga".
 * Tudo numa transação: uma despesa não deve nascer com um pagamento perdido.
 */
export async function criarDespesa(input: CriarDespesaInput, adminId: string) {
  if (input.amountCents <= 0) throw new Error("O valor precisa ser maior que zero.");
  if (input.pagoAgoraCents && input.pagoAgoraCents > input.amountCents) {
    throw new Error(
      "O valor já pago não pode ser maior que o total da despesa. Confira os números.",
    );
  }

  return db.$transaction(async (tx) => {
    const despesa = await tx.expense.create({
      data: {
        description: input.description,
        category: input.category,
        amountCents: input.amountCents,
        supplier: input.supplier,
        dueDate: input.dueDate,
        notes: input.notes,
        createdById: adminId,
      },
    });

    if (input.pagoAgoraCents && input.pagoAgoraCents > 0) {
      await tx.expensePayment.create({
        data: {
          expenseId: despesa.id,
          amountCents: input.pagoAgoraCents,
          paidAt: input.pagoAgoraEm ?? new Date(),
          method: input.pagoAgoraForma ?? "PIX",
          notes: "Registrado junto com o cadastro da despesa.",
          recordedById: adminId,
        },
      });
    }

    return despesa;
  });
}

export interface RegistrarPagamentoInput {
  expenseId: string;
  amountCents: number;
  paidAt: Date;
  method: FormaPagamentoDespesa;
  notes: string | null;
}

/** Registra uma saída de dinheiro referente a uma despesa. */
export async function registrarPagamentoDespesa(
  input: RegistrarPagamentoInput,
  adminId: string,
) {
  if (input.amountCents <= 0) throw new Error("O valor precisa ser maior que zero.");

  const despesa = await db.expense.findUnique({
    where: { id: input.expenseId },
    include: { payments: { select: { amountCents: true } } },
  });
  if (!despesa) throw new Error("Despesa não encontrada.");

  const jaPago = despesa.payments.reduce((s, p) => s + p.amountCents, 0);
  const restante = despesa.amountCents - jaPago;
  if (restante <= 0) {
    throw new Error("Esta despesa já está quitada.");
  }
  // Avisa em vez de aceitar em silêncio: quase sempre é dígito trocado.
  if (input.amountCents > restante) {
    throw new Error(
      `Falta pagar menos do que isso nesta despesa. Se o valor mudou (multa, reajuste), edite o total antes.`,
    );
  }

  await db.expensePayment.create({
    data: {
      expenseId: input.expenseId,
      amountCents: input.amountCents,
      paidAt: input.paidAt,
      method: input.method,
      notes: input.notes,
      recordedById: adminId,
    },
  });
}

/** Edita os dados da despesa (não mexe nos pagamentos já registrados). */
export async function editarDespesa(
  id: string,
  input: {
    description: string;
    category: CategoriaDespesa;
    amountCents: number;
    supplier: string | null;
    dueDate: Date | null;
    notes: string | null;
  },
) {
  if (input.amountCents <= 0) throw new Error("O valor precisa ser maior que zero.");

  const despesa = await db.expense.findUnique({
    where: { id },
    include: { payments: { select: { amountCents: true } } },
  });
  if (!despesa) throw new Error("Despesa não encontrada.");

  const jaPago = despesa.payments.reduce((s, p) => s + p.amountCents, 0);
  if (input.amountCents < jaPago) {
    throw new Error(
      `Esta despesa já teve pagamentos somando mais que o novo valor. Remova um pagamento antes de reduzir o total.`,
    );
  }

  await db.expense.update({ where: { id }, data: input });
}

/** Remove um pagamento lançado por engano. */
export async function removerPagamentoDespesa(id: string) {
  await db.expensePayment.delete({ where: { id } });
}

/** Remove a despesa inteira (com os pagamentos, por cascade). */
export async function removerDespesa(id: string) {
  await db.expense.delete({ where: { id } });
}
