"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { registrationSchema, TRIAGE_FLAGS } from "@/lib/validation";
import {
  createRegistration,
  getRegistrationByCode,
  findRegistrationsByGuardianCpf,
  findActiveRegistrationByCpf,
} from "@/lib/registration.service";
import {
  createCheckoutSession,
  submitPixReceipt,
  submitInstallmentReceipt,
} from "@/lib/payment.service";
import { previewCoupon } from "@/lib/coupon.service";
import { env } from "@/lib/env";

export interface CouponPreviewState {
  ok: boolean;
  message?: string;
  percentOff?: number;
  finalCents?: number;
}

/**
 * Valida o cupom para o preview ao vivo no formulário (NÃO consome). Recebe o
 * código e o preço do lote; devolve o percentual e o valor já com desconto.
 */
export async function validateCouponAction(
  _prev: CouponPreviewState,
  formData: FormData,
): Promise<CouponPreviewState> {
  const code = String(formData.get("couponCode") ?? "");
  const priceCents = Number(formData.get("priceCents") ?? "0");
  if (!code.trim()) return { ok: false, message: "Digite um código." };
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return { ok: false, message: "Preço indisponível." };
  }
  const preview = await previewCoupon(code, priceCents);
  return {
    ok: preview.ok,
    message: preview.message,
    percentOff: preview.percentOff,
    finalCents: preview.finalCents,
  };
}

export interface RegistrationFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

/** Cria a inscrição e direciona ao pagamento (cartão → Stripe; Pix → status). */
export async function createRegistrationAction(
  _prev: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    shirtSize: String(formData.get("shirtSize") ?? "") || undefined,
    church: String(formData.get("church") ?? ""),
    city: String(formData.get("city") ?? ""),
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianCpf: String(formData.get("guardianCpf") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
    guardianRelationship: String(formData.get("guardianRelationship") ?? ""),
    allergies: String(formData.get("allergies") ?? ""),
    medications: String(formData.get("medications") ?? ""),
    dietaryRestrictions: String(formData.get("dietaryRestrictions") ?? ""),
    chronicConditions: String(formData.get("chronicConditions") ?? ""),
    healthNotes: String(formData.get("healthNotes") ?? ""),
    triageFlags: TRIAGE_FLAGS.filter((f) => formData.getAll("triageFlags").includes(f)),
    triageNotes: String(formData.get("triageNotes") ?? ""),
    consentData: bool(formData.get("consentData")),
    consentHealth: bool(formData.get("consentHealth")),
    consentActivities: bool(formData.get("consentActivities")),
    consentImage: bool(formData.get("consentImage")),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    installments: String(formData.get("installments") ?? "1"),
    couponCode: String(formData.get("couponCode") ?? ""),
  };

  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, message: "Revise os campos destacados." };
  }

  // Bloqueio de duplicata pelo CPF do CAMPISTA (não do responsável): mostra o
  // erro no campo e reabre o Step 0. A checagem autoritativa (contra corrida)
  // fica na transação de createRegistration.
  const existing = await findActiveRegistrationByCpf(parsed.data.cpf);
  if (existing) {
    // Sem PII na resposta: antes devolvíamos código + NOME do adolescente para
    // quem digitasse um CPF qualquer — listas de CPF são commodity, e o código
    // dá acesso à página da inscrição e às ações de envio de comprovante.
    return {
      ok: false,
      errors: {
        cpf: "Já existe uma inscrição ativa para este CPF. Se for seu filho, use “Encontrar inscrição” para acompanhá-la.",
      },
      message: "Este adolescente já tem uma inscrição.",
    };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined;
  const userAgent = h.get("user-agent") ?? undefined;

  let registrationId: string;
  let publicCode: string;
  try {
    const created = await createRegistration(parsed.data, { ip, userAgent });
    registrationId = created.id;
    publicCode = created.publicCode;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao criar a inscrição.";
    return { ok: false, message };
  }

  // Cartão online (Stripe) só quando habilitado. Em standby, o método CARD
  // representa crédito/débito pago presencialmente: apenas registramos e
  // seguimos para a página de status.
  if (parsed.data.paymentMethod === "CARD" && env.NEXT_PUBLIC_CARD_ONLINE_ENABLED) {
    let url: string | null = null;
    try {
      url = await createCheckoutSession(registrationId);
    } catch {
      // Stripe indisponível → página de status oferece nova tentativa.
    }
    if (url) redirect(url);
    redirect(`/inscricao/${publicCode}?stripe_erro=1`);
  }
  redirect(`/inscricao/${publicCode}`);
}

export interface FoundRegistration {
  publicCode: string;
  fullName: string;
  status: string;
}

export interface FindRegistrationState {
  ok: boolean;
  message?: string;
  /** Preenchido quando o CPF do responsável tem mais de uma inscrição. */
  matches?: FoundRegistration[];
}

/**
 * Normaliza o que a pessoa digitou como código: aceita "RAIZ-UVJW47",
 * "raiz uvjw47" ou só "UVJW47" e devolve o formato canônico "RAIZ-XXXXXX".
 */
function normalizePublicCode(input: string): string {
  let core = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Remove o prefixo apenas se sobrar o núcleo (o núcleo tem 6 caracteres e
  // poderia, em tese, começar com "RAIZ").
  if (core.startsWith("RAIZ") && core.length > 6) core = core.slice(4);
  return `RAIZ-${core}`;
}

/** Localiza a inscrição pelo código público ou pelo CPF do responsável. */
export async function findRegistrationAction(
  _prev: FindRegistrationState,
  formData: FormData,
): Promise<FindRegistrationState> {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) {
    return {
      ok: false,
      message: "Informe o código da inscrição ou o CPF do responsável.",
    };
  }

  const notFound: FindRegistrationState = {
    ok: false,
    message:
      "Não encontramos nenhuma inscrição com esse dado. Confira se digitou o código (ex.: RAIZ-UVJW47) ou o CPF do responsável exatamente como na inscrição.",
  };

  // Tem letra → tratamos como código da inscrição.
  if (/[a-zA-Z]/.test(query)) {
    const code = normalizePublicCode(query);
    const reg = await getRegistrationByCode(code);
    if (!reg) return notFound;
    redirect(`/inscricao/${reg.publicCode}`);
  }

  // Só dígitos → CPF do responsável.
  const digits = query.replace(/\D/g, "");
  if (digits.length !== 11) {
    return {
      ok: false,
      message:
        "Digite o código da inscrição (ex.: RAIZ-UVJW47) ou o CPF do responsável com 11 dígitos.",
    };
  }

  const matches = await findRegistrationsByGuardianCpf(digits);
  if (matches.length === 0) return notFound;
  if (matches.length === 1) redirect(`/inscricao/${matches[0].publicCode}`);
  return { ok: true, matches };
}

export interface PixUploadState {
  ok: boolean;
  message?: string;
}

/** Recebe o upload do comprovante Pix. */
export async function submitPixReceiptAction(
  _prev: PixUploadState,
  formData: FormData,
): Promise<PixUploadState> {
  const code = String(formData.get("code") ?? "");
  const file = formData.get("receipt");
  if (!code || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecione um arquivo de comprovante." };
  }
  try {
    await submitPixReceipt(code, file);
    revalidatePath(`/inscricao/${code}`);
    return { ok: true, message: "Comprovante enviado! Aguarde a confirmação." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao enviar comprovante.",
    };
  }
}

/** Recebe o upload do comprovante de uma parcela do carnê. */
export async function submitInstallmentReceiptAction(
  _prev: PixUploadState,
  formData: FormData,
): Promise<PixUploadState> {
  const code = String(formData.get("code") ?? "");
  const number = Number(formData.get("number") ?? "0");
  const file = formData.get("receipt");
  if (!code || !number || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecione um arquivo de comprovante." };
  }
  try {
    await submitInstallmentReceipt(code, number, file);
    revalidatePath(`/inscricao/${code}`);
    return { ok: true, message: "Comprovante da parcela enviado! Aguarde a confirmação." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao enviar comprovante.",
    };
  }
}

/** Reinicia o checkout de cartão a partir da página de status. */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  // Cartão online em standby → sem checkout; volta para a página de status.
  if (!env.NEXT_PUBLIC_CARD_ONLINE_ENABLED) redirect(`/inscricao/${code}`);
  const { getRegistrationByCode } = await import("@/lib/registration.service");
  const reg = await getRegistrationByCode(code);
  if (!reg) redirect(`/inscricao/${code}`);
  const url = await createCheckoutSession(reg.id);
  redirect(url);
}
