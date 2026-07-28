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

  it("remove caracteres não alfanuméricos do txid (spec BACEN: [A-Za-z0-9])", () => {
    // O publicCode do site tem hífen (RAIZ-XXXXXX); no payload ele precisa
    // sair sem o hífen, senão os apps de banco recusam o QR como inválido.
    const payload = buildPixPayload(base); // txid: "RAIZ-ABC123"
    expect(payload).toContain("0510RAIZABC123");
    expect(payload).not.toContain("RAIZ-ABC123");
  });

  it('usa "***" quando o txid fica vazio após a sanitização', () => {
    const payload = buildPixPayload({ ...base, txid: "--- ---" });
    expect(payload).toContain("0503***");
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

  it("gera código público sem caracteres ambíguos", () => {
    // Cobertura detalhada (entropia, unicidade, alfabeto) vive em format.test.ts.
    const code = makePublicCode();
    expect(code).toMatch(/^RAIZ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });
});
