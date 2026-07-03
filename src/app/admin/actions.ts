"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
} from "@/lib/validation";
import { reviewPixPayment, reviewInstallment } from "@/lib/payment.service";
import { rebalance, type Camper, type Gender } from "@/lib/tribos";

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
    revalidatePath("/admin/pagamentos");
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
    revalidatePath("/admin/pagamentos");
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

/** Re-balanceia todas as tribos (snake draft offline). Reatribui todos. */
export async function rebalanceAction(): Promise<void> {
  await requireAdmin();
  const regs = await db.registration.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { id: true, gender: true, ageAtCamp: true },
  });
  const campers: Camper[] = regs.map((r) => ({
    id: r.id,
    gender: r.gender as Gender,
    age: r.ageAtCamp,
  }));
  const map = rebalance(campers);
  await db.$transaction(
    Object.entries(map).map(([id, tribo]) =>
      db.registration.update({ where: { id }, data: { tribo } }),
    ),
  );
  revalidatePath("/admin/tribos");
}
