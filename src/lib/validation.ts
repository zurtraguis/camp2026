import { z } from "zod";
import { ageOn, MIN_AGE, MAX_AGE } from "./format";

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
    cpf: cpf.optional().or(z.literal("").transform(() => undefined)),
    phone: phone,
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    shirtSize: z.enum(["PP", "P", "M", "G", "GG", "XG"], {
      error: "Selecione o tamanho da camiseta",
    }),
    church: z.string().trim().max(120).optional(),
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
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

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
