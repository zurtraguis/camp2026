"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ATIVAS } from "@/lib/registration-status";
import {
  verifyPassword,
  createSession,
  destroySession,
  requireAdmin,
} from "@/lib/auth";
import {
  adminLoginSchema,
  pixReviewSchema,
  installmentReviewSchema,
  baixaManualSchema,
  couponSchema,
  couponEditSchema,
  despesaSchema,
  despesaEditSchema,
  pagamentoDespesaSchema,
  observacaoSchema,
  trocarTriboSchema,
  coordenadoresSchema,
  coordenadorIdSchema,
  renomearCoordenadorSchema,
  desativarSchema,
  registrationIdSchema,
} from "@/lib/validation";
import {
  createCoupon,
  setCouponActive,
  editCoupon,
  aplicarCupomRetroativo,
} from "@/lib/coupon.service";
import { formatBRL } from "@/lib/format";
import { deleteRegistration } from "@/lib/registration.service";
import {
  reviewPixPayment,
  reviewInstallment,
  baixaManualPagamento,
  baixaManualParcela,
  alterarFormaPagamento,
} from "@/lib/payment.service";
import {
  criarDespesa,
  editarDespesa,
  registrarPagamentoDespesa,
  removerPagamentoDespesa,
  removerDespesa,
} from "@/lib/custos.service";
import {
  adicionarCoordenadores,
  renomearCoordenador,
  removerCoordenador,
  distribuirIntercessao,
} from "@/lib/intercessao.service";
import {
  desativarInscricao,
  reativarInscricao,
} from "@/lib/ativacao.service";
import {
  rebalance,
  buildTriboUpdate,
  TRIBO_META,
  type Camper,
  type Gender,
} from "@/lib/tribos";

export interface LoginState {
  ok: boolean;
  message?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, message: "E-mail ou senha inválidos." };

  const user = await db.user
    .findUnique({ where: { email: parsed.data.email } })
    .catch(() => null);

  // Mensagem genérica (não revela se o e-mail existe).
  const genericError: LoginState = { ok: false, message: "Credenciais inválidas." };
  if (!user || !user.passwordHash) return genericError;
  if (user.role !== "ADMIN" && user.role !== "STAFF") return genericError;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return genericError;

  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

export interface ReviewState {
  ok: boolean;
  message?: string;
}

export async function reviewPixAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = pixReviewSchema.safeParse({
    paymentId: formData.get("paymentId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };

  try {
    await reviewPixPayment(
      parsed.data.paymentId,
      parsed.data.decision,
      admin.id,
      parsed.data.note,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/em-aberto");
    return {
      ok: true,
      message:
        parsed.data.decision === "confirm"
          ? "Pagamento confirmado."
          : "Pagamento rejeitado.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao revisar.",
    };
  }
}

export async function reviewInstallmentAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = installmentReviewSchema.safeParse({
    installmentId: formData.get("installmentId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };

  try {
    await reviewInstallment(
      parsed.data.installmentId,
      parsed.data.decision,
      admin.id,
      parsed.data.note,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/em-aberto");
    return {
      ok: true,
      message:
        parsed.data.decision === "confirm"
          ? "Parcela confirmada."
          : "Parcela rejeitada.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao revisar parcela.",
    };
  }
}

/**
 * Baixa manual — confirma dinheiro que entrou fora do site (espécie na igreja,
 * cartão, Pix no particular). Não há comprovante para conferir: quem clica é a
 * evidência, então o admin fica gravado em reviewedById e a forma no reviewNote.
 */
export async function baixaManualAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = baixaManualSchema.safeParse({
    paymentId: formData.get("paymentId") || undefined,
    installmentId: formData.get("installmentId") || undefined,
    forma: formData.get("forma"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };

  try {
    if (parsed.data.installmentId) {
      await baixaManualParcela(
        parsed.data.installmentId,
        admin.id,
        parsed.data.forma,
        parsed.data.note,
      );
    } else {
      await baixaManualPagamento(
        parsed.data.paymentId!,
        admin.id,
        parsed.data.forma,
        parsed.data.note,
      );
    }
    revalidatePath("/admin");
    revalidatePath("/admin/em-aberto");
    return { ok: true, message: "Baixa registrada." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao dar baixa.",
    };
  }
}

/**
 * Troca a forma de pagamento (Pix à vista / cartão). As guardas de estado
 * (nada confirmado, nada em revisão) ficam no serviço/regra pura.
 */
export async function alterarFormaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const alvo = String(formData.get("alvo") ?? "");
  if (!paymentId || (alvo !== "PIX" && alvo !== "CARD")) {
    return { ok: false, message: "Dados inválidos." };
  }
  try {
    await alterarFormaPagamento(paymentId, alvo, admin.id);
    revalidatePath("/admin");
    revalidatePath("/admin/em-aberto");
    return {
      ok: true,
      message: alvo === "PIX" ? "Forma alterada para Pix à vista." : "Forma alterada para cartão.",
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao alterar a forma.",
    };
  }
}

/** Cria um cupom de desconto. */
export async function createCouponAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    percentOff: formData.get("percentOff"),
    expiresAt: formData.get("expiresAt"),
    maxUses: formData.get("maxUses"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  try {
    await createCoupon({
      code: parsed.data.code,
      percentOff: parsed.data.percentOff,
      expiresAt: parsed.data.expiresAt ?? null,
      maxUses: parsed.data.maxUses ?? null,
    });
    revalidatePath("/admin/cupons");
    return { ok: true, message: "Cupom criado." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao criar o cupom.",
    };
  }
}

/**
 * Aplica um cupom a uma inscrição já criada (a família esqueceu na hora).
 * Recalcula o valor devido; no carnê, redivide as parcelas. Só enquanto nada
 * foi pago — as guardas ficam no serviço.
 */
export async function aplicarCupomAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!paymentId) return { ok: false, message: "Pagamento inválido." };
  if (!code.trim()) return { ok: false, message: "Informe o código do cupom." };

  try {
    const r = await aplicarCupomRetroativo(paymentId, code, admin.id);
    revalidatePath("/admin");
    revalidatePath("/admin/em-aberto");
    return {
      ok: true,
      message: r.gratuita
        ? `Cupom aplicado (−${r.percentOff}%): de ${formatBRL(r.antesCents)} para ${formatBRL(r.depoisCents)}. Não sobrou nada a pagar — a inscrição já está confirmada.`
        : `Cupom aplicado (−${r.percentOff}%): de ${formatBRL(r.antesCents)} para ${formatBRL(r.depoisCents)}.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao aplicar o cupom.",
    };
  }
}

/**
 * Salva a observação interna da organização sobre uma inscrição. Texto vazio
 * apaga a anotação (vira null) — apagar é uma decisão legítima, não um erro.
 */
export async function salvarObservacaoAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = observacaoSchema.safeParse({
    registrationId: formData.get("registrationId"),
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  try {
    await db.registration.update({
      where: { id: parsed.data.registrationId },
      data: { adminNotes: parsed.data.adminNotes },
    });
    revalidatePath(`/admin/inscricao/${parsed.data.registrationId}`);
    revalidatePath("/admin");
    return {
      ok: true,
      message: parsed.data.adminNotes ? "Observação salva." : "Observação apagada.",
    };
  } catch {
    return { ok: false, message: "Falha ao salvar a observação." };
  }
}

/**
 * Move um campista de tribo na mão. O balanceamento não sabe de irmãos que
 * precisam ficar juntos nem do que a família pediu — isso é decisão humana.
 *
 * Não reequilibra nada em seguida: quem move sabe o que está fazendo, e a tela
 * de Tribos continua mostrando a dispersão para conferir o efeito.
 */
export async function trocarTriboAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = trocarTriboSchema.safeParse({
    registrationId: formData.get("registrationId"),
    tribo: formData.get("tribo"),
  });
  if (!parsed.success) return { ok: false, message: "Tribo inválida." };

  try {
    const reg = await db.registration.update({
      where: { id: parsed.data.registrationId },
      data: { tribo: parsed.data.tribo },
      select: { fullName: true },
    });
    revalidatePath(`/admin/inscricao/${parsed.data.registrationId}`);
    revalidatePath("/admin/tribos");
    revalidatePath("/admin");
    return {
      ok: true,
      message: `${reg.fullName} agora é da tribo ${TRIBO_META[parsed.data.tribo].nome}.`,
    };
  } catch {
    return { ok: false, message: "Falha ao trocar a tribo." };
  }
}

/* ── Ativar / desativar inscrição ─────────────────────────────── */

/**
 * Desativa quem sumiu e não pagou: libera a vaga e tira da tribo. Nada é
 * apagado — a pessoa pode voltar.
 */
export async function desativarInscricaoAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = desativarSchema.safeParse({
    id: formData.get("id"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const r = await desativarInscricao(parsed.data.id, parsed.data.motivo);
    revalidatePath(`/admin/inscricao/${parsed.data.id}`);
    revalidatePath("/admin");
    revalidatePath("/admin/tribos");
    revalidatePath("/admin/em-aberto");
    revalidatePath("/admin/intercessao");
    return {
      ok: true,
      message: `${r.fullName} foi desativado(a): vaga liberada e fora da tribo.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao desativar.",
    };
  }
}

/**
 * Reativa: a tribo é sorteada AGORA, com a distribuição do dia — devolver a
 * tribo antiga desfaria o equilíbrio que foi refeito sem essa pessoa.
 */
export async function reativarInscricaoAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = registrationIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  try {
    const r = await reativarInscricao(parsed.data.id);
    revalidatePath(`/admin/inscricao/${parsed.data.id}`);
    revalidatePath("/admin");
    revalidatePath("/admin/tribos");
    revalidatePath("/admin/em-aberto");
    revalidatePath("/admin/intercessao");
    return {
      ok: true,
      message: `${r.fullName} voltou — tribo ${TRIBO_META[r.tribo].nome}, pela distribuição de hoje.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao reativar.",
    };
  }
}

/* ── Intercessão ───────────────────────────────────────── */

/** Cadastra coordenadores colados de uma vez (um nome por linha). */
export async function adicionarCoordenadoresAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = coordenadoresSchema.safeParse({ nomes: formData.get("nomes") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const criados = await adicionarCoordenadores(parsed.data.nomes);
    revalidatePath("/admin/intercessao");
    return {
      ok: true,
      message:
        criados === 0
          ? "Esses coordenadores já estavam cadastrados."
          : `${criados} coordenador(es) cadastrado(s).`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao cadastrar.",
    };
  }
}

export async function renomearCoordenadorAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = renomearCoordenadorSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await renomearCoordenador(parsed.data.id, parsed.data.name);
    revalidatePath("/admin/intercessao");
    return { ok: true, message: "Nome atualizado." };
  } catch {
    return { ok: false, message: "Falha ao renomear." };
  }
}

/** Remove um coordenador; os campistas dele voltam para a fila. */
export async function removerCoordenadorAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = coordenadorIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  try {
    await removerCoordenador(parsed.data.id);
    revalidatePath("/admin/intercessao");
    return {
      ok: true,
      message: "Coordenador removido. Os campistas dele voltaram para a fila.",
    };
  } catch {
    return { ok: false, message: "Falha ao remover." };
  }
}

/**
 * Distribui os campistas. Por padrão só os que ainda não têm coordenador —
 * trocar de intercessor toda semana esvazia o sentido da intercessão.
 */
export async function distribuirIntercessaoAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const redistribuirTudo = formData.get("redistribuirTudo") === "1";
  try {
    const r = await distribuirIntercessao({ redistribuirTudo });
    revalidatePath("/admin/intercessao");
    if (r.atribuidos === 0) {
      return { ok: true, message: "Todo mundo já tem coordenador — nada a fazer." };
    }
    return {
      ok: true,
      message: r.redistribuiuTudo
        ? `Tudo redistribuído: ${r.atribuidos} campista(s).`
        : `${r.atribuidos} campista(s) distribuído(s) entre os coordenadores.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao distribuir.",
    };
  }
}

/** Edita %, validade e limite de usos de um cupom (o código é imutável). */
export async function editCouponAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = couponEditSchema.safeParse({
    id: formData.get("id"),
    percentOff: formData.get("percentOff"),
    expiresAt: formData.get("expiresAt"),
    maxUses: formData.get("maxUses"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  try {
    await editCoupon({
      id: parsed.data.id,
      percentOff: parsed.data.percentOff,
      expiresAt: parsed.data.expiresAt ?? null,
      maxUses: parsed.data.maxUses ?? null,
    });
    revalidatePath("/admin/cupons");
    return { ok: true, message: "Cupom atualizado." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao atualizar o cupom.",
    };
  }
}

/** Liga/desliga um cupom. */
export async function toggleCouponAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return { ok: false, message: "Cupom inválido." };
  try {
    await setCouponActive(id, active);
    revalidatePath("/admin/cupons");
    return { ok: true, message: active ? "Cupom ativado." : "Cupom desativado." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao atualizar.",
    };
  }
}

/**
 * Exclui uma inscrição PERMANENTEMENTE (cascade: responsável, saúde,
 * consentimento, pagamento, parcelas). Usada para limpar duplicatas. Em sucesso
 * redireciona para a lista; por isso o redirect fica fora do try (ele "lança"
 * o NEXT_REDIRECT, que o catch não deve engolir).
 */
export async function deleteRegistrationAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Inscrição inválida." };
  try {
    await deleteRegistration(id);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao excluir.",
    };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

/* ── Custos do acampamento ───────────────────────────────────────────────── */

/** Cadastra uma despesa; opcionalmente já registra o que foi pago. */
export async function criarDespesaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = despesaSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    amountCents: formData.get("amountCents"),
    supplier: formData.get("supplier"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    pagoAgora: formData.get("pagoAgora"),
    pagoAgoraEm: formData.get("pagoAgoraEm"),
    pagoAgoraForma: formData.get("pagoAgoraForma") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await criarDespesa(
      {
        description: parsed.data.description,
        category: parsed.data.category,
        amountCents: parsed.data.amountCents,
        supplier: parsed.data.supplier ?? null,
        dueDate: parsed.data.dueDate ?? null,
        notes: parsed.data.notes ?? null,
        pagoAgoraCents: parsed.data.pagoAgora,
        pagoAgoraEm: parsed.data.pagoAgoraEm,
        pagoAgoraForma: parsed.data.pagoAgoraForma,
      },
      admin.id,
    );
    revalidatePath("/admin/custos");
    return { ok: true, message: "Despesa cadastrada." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao cadastrar.",
    };
  }
}

/** Registra um pagamento (total ou parcial) de uma despesa. */
export async function pagarDespesaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const admin = await requireAdmin();
  const parsed = pagamentoDespesaSchema.safeParse({
    expenseId: formData.get("expenseId"),
    amountCents: formData.get("amountCents"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await registrarPagamentoDespesa(
      {
        expenseId: parsed.data.expenseId,
        amountCents: parsed.data.amountCents,
        paidAt: parsed.data.paidAt,
        method: parsed.data.method,
        notes: parsed.data.notes ?? null,
      },
      admin.id,
    );
    revalidatePath("/admin/custos");
    return {
      ok: true,
      message: `Pagamento de ${formatBRL(parsed.data.amountCents)} registrado.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao registrar.",
    };
  }
}

/** Edita a despesa (não mexe nos pagamentos já lançados). */
export async function editarDespesaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const parsed = despesaEditSchema.safeParse({
    id: formData.get("id"),
    description: formData.get("description"),
    category: formData.get("category"),
    amountCents: formData.get("amountCents"),
    supplier: formData.get("supplier"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  try {
    await editarDespesa(parsed.data.id, {
      description: parsed.data.description,
      category: parsed.data.category,
      amountCents: parsed.data.amountCents,
      supplier: parsed.data.supplier ?? null,
      dueDate: parsed.data.dueDate ?? null,
      notes: parsed.data.notes ?? null,
    });
    revalidatePath("/admin/custos");
    return { ok: true, message: "Despesa atualizada." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao atualizar.",
    };
  }
}

/** Remove um pagamento lançado por engano. */
export async function removerPagamentoDespesaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Pagamento inválido." };
  try {
    await removerPagamentoDespesa(id);
    revalidatePath("/admin/custos");
    return { ok: true, message: "Pagamento removido." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao remover.",
    };
  }
}

/** Remove a despesa e os pagamentos dela. */
export async function removerDespesaAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Despesa inválida." };
  try {
    await removerDespesa(id);
    revalidatePath("/admin/custos");
    return { ok: true, message: "Despesa removida." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao remover.",
    };
  }
}

/** Re-balanceia todas as tribos (snake draft offline). Reatribui todos. */
export async function rebalanceAction(): Promise<void> {
  await requireAdmin();
  const regs = await db.registration.findMany({
    where: ATIVAS,
    select: { id: true, gender: true, ageAtCamp: true },
  });
  const campers: Camper[] = regs.map((r) => ({
    id: r.id,
    gender: r.gender as Gender,
    age: r.ageAtCamp,
  }));
  const map = rebalance(campers);
  if (Object.keys(map).length === 0) return;
  // Um único UPDATE: dezenas de updates numa transação estouram o timeout de
  // 5s do Prisma e o rebalanceamento falhava inteiro. Ver buildTriboUpdate.
  const { sql, params } = buildTriboUpdate(map);
  await db.$executeRawUnsafe(sql, ...params);
  revalidatePath("/admin/tribos");
}
