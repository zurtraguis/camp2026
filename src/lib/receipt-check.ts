/**
 * Checagem de comprovante no CLIENTE — pura, sem `server-only`, para rodar no
 * onChange do input antes do envio.
 *
 * Por que existe: o servidor valida por magic bytes (storage.ts), mas o erro só
 * chega DEPOIS do upload — e um arquivo acima do bodySizeLimit das Server
 * Actions nem chega lá (a pessoa vê um erro genérico). Validar na seleção dá a
 * mensagem certa na hora, principalmente para os dois casos reais:
 *  - foto de iPhone em HEIC (não aceitamos; o accept explícito faz o iOS
 *    converter para JPEG sozinho, mas arquivos HEIC vindos de galeria/WhatsApp
 *    ainda aparecem);
 *  - foto maior que o limite.
 */

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/**
 * Lista EXPLÍCITA de tipos no accept — nada de `image/*`. Com os tipos
 * nomeados, o iOS converte HEIC→JPEG na hora de escolher a foto; com
 * `image/*` ele entrega o HEIC cru, que o servidor rejeita.
 */
export const RECEIPT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

const OK_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const OK_EXT = /\.(jpe?g|png|webp|pdf)$/i;
const HEIC = /(\.heic|\.heif)$/i;

/** Mensagem de erro para o arquivo escolhido, ou null se está ok. */
export function checkReceiptFile(file: {
  size: number;
  type: string;
  name: string;
}): string | null {
  if (file.size === 0) return "O arquivo está vazio. Escolha outro.";
  if (file.size > MAX_RECEIPT_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Arquivo muito grande (${mb} MB) — o máximo é 10 MB. Dica: tire um print do comprovante, que fica bem menor.`;
  }
  if (HEIC.test(file.name) || /hei[cf]/i.test(file.type)) {
    return "Formato HEIC (foto de iPhone) não é aceito. Tire um print do comprovante ou envie em JPEG/PDF.";
  }
  if (!OK_MIME.includes(file.type) && !OK_EXT.test(file.name)) {
    return "Tipo de arquivo inválido — use JPG, PNG, WEBP ou PDF.";
  }
  return null;
}
