import { describe, it, expect } from "vitest";
import { formatPhone } from "./format";

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
