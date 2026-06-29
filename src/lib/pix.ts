/**
 * Geração do "Pix Copia e Cola" (BR Code estático, padrão EMV/BACEN).
 *
 * Implementação pura (sem dependência) do payload TLV + CRC-16/CCITT-FALSE.
 * Referência: especificação do Pix (BACEN) e arranjo EMV® QRCPS.
 */

/** Monta um campo TLV: id (2) + tamanho (2, zero-pad) + valor. */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** Remove acentos e limita comprimento (campos do BR Code são ASCII). */
function sanitize(input: string, max: number): string {
  // NFD separa o acento em marca combinante; o filtro ASCII abaixo a remove.
  return input
    .normalize("NFD")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, sobre todo o payload + "6304". */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadInput {
  key: string; // chave Pix (cpf/cnpj/email/telefone/aleatória)
  receiverName: string; // nome do recebedor (máx 25)
  receiverCity: string; // cidade do recebedor (máx 15)
  amount?: number; // valor em reais (ex.: 300.00). Omitir => valor livre.
  txid?: string; // referência (máx 25 alfanum). Default "***".
  description?: string; // info adicional opcional
}

/**
 * Gera a string "copia e cola" do Pix.
 * @throws se a chave estiver ausente.
 */
export function buildPixPayload(input: PixPayloadInput): string {
  if (!input.key) throw new Error("Chave Pix não configurada (NEXT_PUBLIC_PIX_KEY).");

  const gui = tlv("00", "br.gov.bcb.pix");
  const keyField = tlv("01", input.key);
  const descField = input.description
    ? tlv("02", sanitize(input.description, 60))
    : "";
  const merchantAccountInfo = tlv("26", `${gui}${keyField}${descField}`);

  const txid = sanitize(input.txid || "***", 25) || "***";
  const additionalData = tlv("62", tlv("05", txid));

  const amountField =
    input.amount != null && input.amount > 0
      ? tlv("54", input.amount.toFixed(2))
      : "";

  const payloadSemCrc =
    tlv("00", "01") + // payload format indicator
    merchantAccountInfo +
    tlv("52", "0000") + // merchant category code
    tlv("53", "986") + // moeda BRL
    amountField +
    tlv("58", "BR") + // país
    tlv("59", sanitize(input.receiverName, 25)) +
    tlv("60", sanitize(input.receiverCity, 15)) +
    additionalData +
    "6304"; // id + len do CRC (o valor é anexado a seguir)

  return payloadSemCrc + crc16(payloadSemCrc);
}
