"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { registrationSchema, TRIAGE_FLAGS } from "@/lib/validation";
import { createRegistration } from "@/lib/registration.service";
import {
  createCheckoutSession,
  submitPixReceipt,
} from "@/lib/payment.service";
import { env } from "@/lib/env";

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
