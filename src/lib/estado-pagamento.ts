/**
 * Máquina de estados do pagamento — regras puras, testáveis.
 *
 * Existe porque o status da inscrição estava sendo reescrito "cego" em vários
 * pontos: rejeitar uma parcela deixava a inscrição CONFIRMED para sempre (vaga
 * ocupada sem dinheiro), e reenviar comprovante rebaixava uma inscrição já
 * confirmada. Aqui o status é DERIVADO do estado real das parcelas.
 */

export type RegistrationStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_REVIEW"
  | "CONFIRMED"
  | "INACTIVE"
  | "CANCELLED";

/**
 * Status da inscrição a partir das parcelas do carnê.
 *
 * Regra do produto: a vaga é garantida quando QUALQUER parcela é confirmada
 * (na prática a 1ª). Se nenhuma está confirmada mas alguma tem comprovante na
 * fila, a inscrição está em revisão. Sem nada disso, volta a aguardar pagamento.
 */
export function statusDaInscricaoPorParcelas(
  installments: { status: string }[],
): RegistrationStatus {
  if (installments.some((i) => i.status === "CONFIRMED")) return "CONFIRMED";
  if (installments.some((i) => i.status === "AWAITING_REVIEW")) {
    return "AWAITING_REVIEW";
  }
  return "PENDING_PAYMENT";
}

/**
 * Pode receber (ou reenviar) comprovante? Bloqueia o que rebaixaria uma
 * inscrição já resolvida ou o que furaria a regra do carnê.
 */
export function bloqueioEnvioComprovante(p: {
  method: string;
  status: string;
  installmentsTotal: number | null;
  temParcelas: boolean;
  registrationStatus: string;
}): string | null {
  if (p.registrationStatus === "CANCELLED") {
    return "Esta inscrição foi cancelada. Fale com a organização.";
  }
  // Desativada: aceitar comprovante aqui daria à família a impressão de que a
  // vaga continua de pé — e ela foi liberada. Precisa passar pela organização.
  if (p.registrationStatus === "INACTIVE") {
    return "Esta inscrição está desativada e a vaga foi liberada. Fale com a organização antes de pagar.";
  }
  if (p.method !== "PIX") return "Esta inscrição não é via Pix.";
  if (p.status === "CONFIRMED") {
    return "Este pagamento já está confirmado — não é preciso enviar comprovante.";
  }
  // Carnê tem comprovante POR PARCELA; aceitar aqui criaria um pagamento
  // inteiro revisável com um clique, furando "carnê: parcela a parcela".
  if (p.temParcelas || p.installmentsTotal) {
    return "Esta inscrição é um carnê — envie o comprovante da parcela correspondente.";
  }
  return null;
}

/** Uma parcela pode receber comprovante? */
export function bloqueioEnvioParcela(p: {
  installmentStatus: string;
  registrationStatus: string;
}): string | null {
  if (p.registrationStatus === "CANCELLED") {
    return "Esta inscrição foi cancelada. Fale com a organização.";
  }
  if (p.registrationStatus === "INACTIVE") {
    return "Esta inscrição está desativada e a vaga foi liberada. Fale com a organização antes de pagar.";
  }
  if (p.installmentStatus === "CONFIRMED") {
    return "Esta parcela já foi confirmada.";
  }
  return null;
}
