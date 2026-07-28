import { describe, it, expect } from "vitest";
import {
  checkReceiptFile,
  MAX_RECEIPT_BYTES,
  RECEIPT_ACCEPT,
} from "./receipt-check";

const file = (over: Partial<{ size: number; type: string; name: string }> = {}) => ({
  size: 500_000,
  type: "image/jpeg",
  name: "comprovante.jpg",
  ...over,
});

describe("checkReceiptFile", () => {
  it("aceita JPG, PNG, WEBP e PDF", () => {
    expect(checkReceiptFile(file())).toBeNull();
    expect(checkReceiptFile(file({ type: "image/png", name: "c.png" }))).toBeNull();
    expect(checkReceiptFile(file({ type: "image/webp", name: "c.webp" }))).toBeNull();
    expect(
      checkReceiptFile(file({ type: "application/pdf", name: "c.pdf" })),
    ).toBeNull();
  });

  it("aceita pelo nome quando o browser não informa o mime", () => {
    expect(checkReceiptFile(file({ type: "", name: "IMG_1234.JPG" }))).toBeNull();
    expect(checkReceiptFile(file({ type: "", name: "doc.pdf" }))).toBeNull();
  });

  it("rejeita HEIC com mensagem específica de iPhone", () => {
    const byName = checkReceiptFile(file({ type: "", name: "IMG_5678.HEIC" }));
    const byMime = checkReceiptFile(file({ type: "image/heic", name: "foto" }));
    expect(byName).toMatch(/HEIC/);
    expect(byName).toMatch(/iPhone/);
    expect(byMime).toMatch(/HEIC/);
  });

  it("rejeita acima de 10 MB dizendo o tamanho", () => {
    const err = checkReceiptFile(file({ size: MAX_RECEIPT_BYTES + 1 }));
    expect(err).toMatch(/10 MB/);
    // No limite exato ainda passa.
    expect(checkReceiptFile(file({ size: MAX_RECEIPT_BYTES }))).toBeNull();
  });

  it("rejeita vazio e tipos desconhecidos", () => {
    expect(checkReceiptFile(file({ size: 0 }))).toMatch(/vazio/);
    expect(
      checkReceiptFile(file({ type: "video/mp4", name: "video.mp4" })),
    ).toMatch(/inválido/);
  });
});

describe("RECEIPT_ACCEPT", () => {
  it("não usa curinga image/* — é isso que faz o iOS converter HEIC→JPEG", () => {
    expect(RECEIPT_ACCEPT).not.toContain("image/*");
    expect(RECEIPT_ACCEPT).toContain("image/jpeg");
    expect(RECEIPT_ACCEPT).toContain("application/pdf");
  });
});
