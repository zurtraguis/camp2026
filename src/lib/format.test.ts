import { describe, it, expect } from "vitest";
import { formatPhone, makePublicCode } from "./format";

describe("formatPhone", () => {
  it("formata celular de 11 dígitos sem esconder nada", () => {
    expect(formatPhone("92981734321")).toBe("(92) 98173-4321");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("9232334321")).toBe("(92) 3233-4321");
  });

  it("aceita entrada já formatada e normaliza", () => {
    expect(formatPhone("(92) 98173-4321")).toBe("(92) 98173-4321");
    expect(formatPhone("+55 92 98173-4321")).toBe("+55 92 98173-4321"); // 13 díg. → devolve como veio
  });

  it("devolve a entrada quando o tamanho não bate", () => {
    expect(formatPhone("123")).toBe("123");
    expect(formatPhone("")).toBe("");
  });

  it("nunca mascara — o número sai inteiro", () => {
    expect(formatPhone("92981734321")).not.toContain("*");
  });
});

describe("makePublicCode", () => {
  const CODES = Array.from({ length: 20_000 }, () => makePublicCode());

  it("formato RAIZ- + 8 caracteres do alfabeto seguro", () => {
    for (const c of CODES.slice(0, 200)) {
      expect(c).toMatch(/^RAIZ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("nunca usa caracteres ambíguos (I, O, 0, 1)", () => {
    const nucleos = CODES.map((c) => c.slice(5)).join("");
    expect(nucleos).not.toMatch(/[IO01]/);
  });

  it("usa TODOS os 32 símbolos em cada posição — a regressão dos 24 bits", () => {
    // O gerador antigo derivava de um UUID em hex e só alcançava 16 valores por
    // posição: 24 bits reais em vez de 40. Este teste trava esse retrocesso.
    for (let pos = 0; pos < 8; pos++) {
      const vistos = new Set(CODES.map((c) => c.slice(5)[pos]));
      expect(vistos.size).toBe(32);
    }
  });

  it("não repete em 20 mil gerações", () => {
    expect(new Set(CODES).size).toBe(CODES.length);
  });

  it("não gera código que colida com o prefixo (o alfabeto não tem I)", () => {
    // normalizePublicCode remove o prefixo "RAIZ" do que a pessoa digita; se um
    // núcleo pudesse começar com RAIZ, a normalização o mutilaria.
    expect(CODES.some((c) => c.slice(5).startsWith("RAIZ"))).toBe(false);
  });
});
