/** Formatação e utilidades de domínio (puras). */

/** Centavos → "R$ 300,00". */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Telefone → "(92) 98173-4321". Devolve a entrada se não tiver 10/11 dígitos. */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/** Idade em anos completos numa data de referência (default: hoje). */
export function ageOn(birthDate: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) age--;
  return age;
}

export const MIN_AGE = 12;
export const MAX_AGE = 19;

/** Alfabeto do código público: sem I, O, 0 e 1 (ambíguos ao ditar/digitar). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 símbolos
const CODE_LENGTH = 8;

/**
 * Código público curto e legível.
 *
 * O gerador anterior derivava os caracteres de um UUID em hex
 * (`src.charCodeAt(i) + i`), o que produzia apenas 16 dos 32 símbolos por
 * posição: 24 bits reais (16,7 M) em vez dos 30 aparentes — medido, não
 * estimado. Com ~150 inscrições e sem rate limit, varrer esse espaço é questão
 * de minutos, e o código dá acesso a nome do menor, valor e às ações de envio
 * de comprovante.
 *
 * Agora: bytes de CSPRNG com rejection sampling (descarta valores ≥ 256 - 256%32
 * para não enviesar o módulo) e 8 caracteres → 40 bits (~1,1 trilhão).
 * Códigos já emitidos continuam válidos — só o gerador mudou.
 */
export function makePublicCode(): string {
  const n = CODE_ALPHABET.length; // 32
  const limite = 256 - (256 % n); // 256 → sem viés, mas mantemos a guarda
  let s = "";
  const buf = new Uint8Array(CODE_LENGTH * 2);
  while (s.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b >= limite) continue; // descarta para não enviesar
      s += CODE_ALPHABET[b % n];
      if (s.length === CODE_LENGTH) break;
    }
  }
  return `RAIZ-${s}`;
}
