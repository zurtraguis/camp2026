import { describe, it, expect } from "vitest";
import {
  receiptPath,
  marcarSupabase,
  isSupabasePath,
  stripBackendPrefix,
} from "./receipt-path";

describe("receiptPath", () => {
  const reg = "reg_abc123";

  it("separa por escopo: à vista e cada parcela têm pastas distintas", () => {
    const avista = receiptPath(reg, "avista", "jpg", "u1");
    const p1 = receiptPath(reg, "inst_111", "jpg", "u1");
    const p2 = receiptPath(reg, "inst_222", "jpg", "u1");
    expect(new Set([avista, p1, p2]).size).toBe(3);
    expect(p1.startsWith(`${reg}/`)).toBe(true);
  });

  it("dois envios da MESMA parcela não colidem — o bug que apagava a prova", () => {
    const a = receiptPath(reg, "inst_111", "jpg", "1700000000-aaaa1111");
    const b = receiptPath(reg, "inst_111", "jpg", "1700000009-bbbb2222");
    expect(a).not.toBe(b);
  });

  it("mantém o prefixo da inscrição (isolamento entre inscrições)", () => {
    const a = receiptPath("reg_A", "avista", "pdf", "u1");
    const b = receiptPath("reg_B", "avista", "pdf", "u1");
    expect(a.startsWith("reg_A/")).toBe(true);
    expect(b.startsWith("reg_B/")).toBe(true);
  });

  it("sanitiza o escopo (nada de path traversal vindo de id)", () => {
    const p = receiptPath(reg, "../../etc/passwd", "jpg", "u1");
    expect(p).not.toContain("..");
    expect(p.split("/").length).toBe(3);
  });

  it("escopo vazio vira 'avista' em vez de path quebrado", () => {
    expect(receiptPath(reg, "", "jpg", "u1")).toBe(`${reg}/avista/u1.jpg`);
  });

  it("preserva a extensão real do arquivo", () => {
    expect(receiptPath(reg, "avista", "pdf", "u1").endsWith(".pdf")).toBe(true);
    expect(receiptPath(reg, "avista", "webp", "u1").endsWith(".webp")).toBe(true);
  });
});

describe("marcador de backend", () => {
  const p = receiptPath("reg_1", "avista", "jpg", "u1");

  it("caminho sem prefixo é S3 (inclui os já gravados antes deste fix)", () => {
    expect(isSupabasePath(p)).toBe(false);
    expect(stripBackendPrefix(p)).toBe(p);
  });

  it("marcarSupabase sinaliza o fallback sem perder o caminho real", () => {
    const m = marcarSupabase(p);
    expect(isSupabasePath(m)).toBe(true);
    expect(stripBackendPrefix(m)).toBe(p);
  });

  it("marcar é idempotente na leitura (strip devolve sempre o mesmo)", () => {
    expect(stripBackendPrefix(stripBackendPrefix(marcarSupabase(p)))).toBe(p);
  });

  it("o marcador não colide com um caminho legítimo", () => {
    // Ids do Prisma são cuid/uuid — nunca começam com "sb:".
    expect(isSupabasePath("cmrihoxst001x/avista/1-a.jpg")).toBe(false);
  });
});
