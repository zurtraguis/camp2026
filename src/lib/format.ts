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

/** Código público curto e legível (sem caracteres ambíguos). */
export function makePublicCode(seed?: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1
  let s = "";
  const src =
    seed ??
    (globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2));
  for (let i = 0; i < 6; i++) {
    const code = src.charCodeAt(i % src.length) + i;
    s += alphabet[code % alphabet.length];
  }
  return `RAIZ-${s}`;
}
