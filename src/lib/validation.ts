import { z } from "zod";
import { ageOn, MIN_AGE, MAX_AGE } from "./format";
import { maxInstallmentsForDate, MIN_INSTALLMENTS } from "./carne";

/** Flags de triagem confidencial (manual, seção 10). */
export const TRIAGE_FLAGS = [
  "luto",
  "ansiedade_depressao",
  "situacao_familiar",
  "neurodivergencia",
  "primeira_vez",
] as const;

export const TRIAGE_FLAG_LABELS: Record<(typeof TRIAGE_FLAGS)[number], string> = {
  luto: "Luto recente",
  ansiedade_depressao: "Ansiedade/depressão em acompanhamento",
  situacao_familiar: "Situação familiar delicada",
  neurodivergencia: "Neurodivergência",
  primeira_vez: "Primeira vez / visitante",
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const cpf = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 11, "CPF deve ter 11 dígitos");

const phone = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido");

/** Schema completo da inscrição (validação compartilhada cliente + servidor). */
export const registrationSchema = z
  .object({
    // Campista
    fullName: z.string().trim().min(3, "Informe o nome completo").max(120),
    birthDate: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), "Data inválida"),
    gender: z.enum(["MALE", "FEMALE"], { error: "Selecione o gênero" }),
    // CPF do CAMPISTA (não do responsável) — obrigatório e usado para impedir
    // inscrição duplicada da mesma pessoa.
    cpf: cpf,
    phone: phone,
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    shirtSize: z.enum(["PP", "P", "M", "G", "GG", "XG"], {
      error: "Selecione o tamanho da camiseta",
    }),
    church: z.string().trim().min(2, "Informe a igreja").max(120),
    city: z.string().trim().max(80).optional(),

    // Responsável legal
    guardianName: z.string().trim().min(3, "Informe o nome do responsável").max(120),
    guardianCpf: cpf,
    guardianPhone: phone,
    guardianEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
    guardianRelationship: z.enum(["pai", "mae", "responsavel_legal", "outro"], {
      error: "Selecione o grau de parentesco",
    }),

    // Saúde (sensível)
    allergies: z.string().trim().max(500).optional(),
    medications: z.string().trim().max(500).optional(),
    dietaryRestrictions: z.string().trim().max(500).optional(),
    chronicConditions: z.string().trim().max(500).optional(),
    healthNotes: z.string().trim().max(1000).optional(),
    triageFlags: z.array(z.enum(TRIAGE_FLAGS)).default([]),
    triageNotes: z.string().trim().max(1000).optional(),

    // Consentimentos (LGPD: específicos e separados). Devem ser `true`.
    consentData: z
      .boolean()
      .refine((v) => v === true, "É necessário consentir o tratamento de dados"),
    consentHealth: z
      .boolean()
      .refine((v) => v === true, "É necessário consentir os dados de saúde"),
    consentActivities: z
      .boolean()
      .refine((v) => v === true, "É necessário autorizar a participação"),
    consentImage: z.boolean().default(false),

    // Pagamento
    paymentMethod: z.enum(["CARD", "PIX"], {
      error: "Selecione a forma de pagamento",
    }),
    // Parcelas do carnê Pix: 1 = à vista (padrão); 2 ou 3 = carnê parcelado.
    // Só é permitido parcelar no Pix.
    installments: z.coerce.number().int().min(1).max(3).default(1),
    // Cupom de desconto (opcional). "" = sem cupom. A validade/limite do cupom
    // são checados no servidor ao criar a inscrição.
    couponCode: z.string().trim().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    const age = ageOn(new Date(data.birthDate));
    if (age < MIN_AGE || age > MAX_AGE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: `A inscrição é para adolescentes de ${MIN_AGE} a ${MAX_AGE} anos (idade calculada: ${age}).`,
      });
    }
    if (data.installments > 1 && data.paymentMethod !== "PIX") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installments"],
        message: "O parcelamento (carnê) está disponível apenas no Pix.",
      });
    }
    // O teto de parcelas encolhe conforme o acampamento se aproxima (toda
    // parcela precisa vencer antes do evento). Rejeitamos em vez de rebaixar
    // para à vista em silêncio: a pessoa escolheu parcelar e precisa saber.
    if (data.installments > 1) {
      const teto = maxInstallmentsForDate(new Date());
      if (data.installments > teto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installments"],
          message:
            teto < MIN_INSTALLMENTS
              ? "O parcelamento não está mais disponível — falta pouco para o acampamento. Escolha o pagamento à vista."
              : `Neste período o carnê é em até ${teto}x (toda parcela precisa vencer antes do acampamento).`,
        });
      }
    }
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

/** Criação de cupom no admin. Campos vazios de validade/limite viram undefined. */
const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Código muito curto (mín. 3).")
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "Use apenas letras, números ou hífen."),
  percentOff: z.coerce
    .number({ error: "Informe o percentual." })
    .int("Percentual inteiro.")
    .min(1, "Mínimo 1%.")
    .max(100, "Máximo 100%."),
  expiresAt: z.preprocess(emptyToUndef, z.coerce.date().optional()),
  maxUses: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1, "Limite mínimo 1.").optional(),
  ),
});

export type CouponInput = z.infer<typeof couponSchema>;

/**
 * Edição de cupom. O CÓDIGO não entra: os pagamentos guardam um snapshot dele
 * (`Payment.couponCode`), então renomear quebraria a auditoria de quem já usou.
 * Para "trocar o código", desative este e crie outro.
 */
export const couponEditSchema = couponSchema.omit({ code: true }).extend({
  id: z.string().min(1),
});

export type CouponEditInput = z.infer<typeof couponEditSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const pixReviewSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["confirm", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export const installmentReviewSchema = z.object({
  installmentId: z.string().min(1),
  decision: z.enum(["confirm", "reject"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Baixa manual: confirma dinheiro que entrou fora do site (espécie, cartão,
 * Pix no particular). Exatamente UM alvo — pagamento à vista OU parcela.
 * `forma` é obrigatória: sem comprovante no storage, ela é a única trilha de
 * como o dinheiro entrou.
 */
export const baixaManualSchema = z
  .object({
    paymentId: z.string().min(1).optional(),
    installmentId: z.string().min(1).optional(),
    forma: z.enum(["DINHEIRO", "CARTAO", "PIX", "OUTRO"]),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.paymentId) !== Boolean(d.installmentId), {
    message: "Informe o pagamento OU a parcela, nunca os dois.",
  });
