import { describe, it, expect } from "vitest";
import { crc16, buildPixPayload } from "./pix";
import { formatBRL, ageOn, makePublicCode } from "./format";

describe("crc16 (CCITT-FALSE)", () => {
  it("calcula o checksum conhecido para vetor de referência", () => {
    // Vetor clássico "123456789" => 0x29B1
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("buildPixPayload", () => {
  const base = {
    key: "raiz@igreja.org",
    receiverName: "Acampamento Raiz",
    receiverCity: "São Paulo",
    amount: 300,
    txid: "RAIZ-ABC123",
  };

  it("gera string com formato EMV e termina com CRC válido", () => {
    const payload = buildPixPayload(base);
    expect(payload.startsWith("000201")).toBe(true);
    expect(payload).toContain("br.gov.bcb.pix");
    expect(payload).toContain("5303986"); // moeda BRL
    expect(payload).toContain("5406300.00"); // valor
    // últimos 4 chars = CRC do restante
    const semCrc = payload.slice(0, -4);
    expect(crc16(semCrc)).toBe(payload.slice(-4));
  });

  it("remove acentos do nome/cidade (ASCII apenas)", () => {
    const payload = buildPixPayload(base);
    expect(payload).toContain("SAO PAULO");
    expect(payload).not.toMatch(/[^\x20-\x7e]/);
  });

  it("aceita valor livre quando amount é omitido", () => {
    const payload = buildPixPayload({ ...base, amount: undefined });
    expect(payload).not.toContain("5406");
  });

  it("lança erro sem chave", () => {
    expect(() => buildPixPayload({ ...base, key: "" })).toThrow();
  });
});

describe("format", () => {
  it("formata centavos em BRL", () => {
    expect(formatBRL(30000).replace(/\s/g, " ")).toContain("300,00");
    expect(formatBRL(45000)).toContain("450,00");
  });

  it("calcula idade em anos completos", () => {
    const ref = new Date("2026-07-15");
    expect(ageOn(new Date("2010-07-14"), ref)).toBe(16);
    expect(ageOn(new Date("2010-07-16"), ref)).toBe(15); // ainda não fez aniversário
  });

  it("gera código público no formato RAIZ-XXXXXX sem caracteres ambíguos", () => {
    const code = makePublicCode("abcdef0123456789abcdef0123456789");
    expect(code).toMatch(/^RAIZ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
