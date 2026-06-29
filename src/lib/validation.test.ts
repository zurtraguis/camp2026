import { describe, it, expect } from "vitest";
import { registrationSchema } from "./validation";

// Idade ~15 anos em 2026 (nascido em 2010).
function validInput(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Maria Clara Souza",
    birthDate: "2010-03-10",
    gender: "FEMALE",
    cpf: "",
    phone: "11999998888",
    email: "",
    guardianName: "João Souza",
    guardianCpf: "12345678901",
    guardianPhone: "11988887777",
    guardianRelationship: "pai",
    triageFlags: [],
    consentData: true,
    consentHealth: true,
    consentActivities: true,
    consentImage: false,
    paymentMethod: "PIX",
    ...overrides,
  };
}

describe("registrationSchema", () => {
  it("aceita uma inscrição válida", () => {
    const r = registrationSchema.safeParse(validInput());
    expect(r.success).toBe(true);
  });

  it("rejeita idade fora de 12–19", () => {
    const tooYoung = registrationSchema.safeParse(
      validInput({ birthDate: "2020-01-01" }),
    );
    expect(tooYoung.success).toBe(false);
    const tooOld = registrationSchema.safeParse(
      validInput({ birthDate: "2000-01-01" }),
    );
    expect(tooOld.success).toBe(false);
  });

  it("exige os consentimentos obrigatórios", () => {
    for (const field of ["consentData", "consentHealth", "consentActivities"]) {
      const r = registrationSchema.safeParse(validInput({ [field]: false }));
      expect(r.success, `${field} deve ser obrigatório`).toBe(false);
    }
  });

  it("consentImage é opcional", () => {
    const r = registrationSchema.safeParse(validInput({ consentImage: false }));
    expect(r.success).toBe(true);
  });

  it("normaliza CPF/telefone removendo não-dígitos", () => {
    const r = registrationSchema.safeParse(
      validInput({ guardianCpf: "123.456.789-01", guardianPhone: "(11) 98888-7777" }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.guardianCpf).toBe("12345678901");
      expect(r.data.guardianPhone).toBe("11988887777");
    }
  });

  it("rejeita CPF do responsável inválido", () => {
    const r = registrationSchema.safeParse(validInput({ guardianCpf: "123" }));
    expect(r.success).toBe(false);
  });

  it("rejeita método de pagamento inválido", () => {
    const r = registrationSchema.safeParse(validInput({ paymentMethod: "BOLETO" }));
    expect(r.success).toBe(false);
  });
});
