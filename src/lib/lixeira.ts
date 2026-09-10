/**
 * Lixeira de inscrições — regras puras.
 *
 * Nasceu de um prejuízo real: uma inscrição foi excluída, e não havia nem
 * histórico do que sumiu nem como trazer de volta. A extensão do Postgres que
 * leria a linha morta no disco é negada pelo Supabase, e não há PITR. O dado
 * simplesmente acabou.
 *
 * Aqui a fotografia é tirada ANTES de apagar, e a restauração é possível.
 */

/** O que a fotografia precisa ter para reconstruir a inscrição. */
export interface Snapshot {
  registration: Record<string, unknown> & { id: string; publicCode: string };
  guardian: Record<string, unknown> | null;
  health: Record<string, unknown> | null;
  consent: Record<string, unknown> | null;
  payment: (Record<string, unknown> & { installments?: unknown[] }) | null;
}

/**
 * A fotografia serve para restaurar?
 *
 * Uma foto sem o essencial é pior que não ter foto: dá a impressão de que há
 * volta quando não há. Falhar aqui, alto, é melhor.
 */
export function snapshotUtilizavel(s: unknown): s is Snapshot {
  if (!s || typeof s !== "object") return false;
  const reg = (s as Snapshot).registration;
  return Boolean(
    reg &&
      typeof reg === "object" &&
      typeof reg.id === "string" &&
      reg.id.length > 0 &&
      typeof reg.publicCode === "string" &&
      reg.publicCode.length > 0,
  );
}

export interface ConflitoRestauracao {
  campo: "id" | "publicCode" | "cpf";
  mensagem: string;
}

/**
 * O que impede de restaurar agora.
 *
 * Restaurar não pode criar duplicidade: se a família refez a inscrição no
 * meio-tempo, trazer a antiga de volta daria duas vagas ao mesmo adolescente.
 */
export function bloqueioRestaurar(opcoes: {
  jaRestaurada: boolean;
  idEmUso: boolean;
  codigoEmUso: boolean;
  cpfEmUso: boolean;
}): ConflitoRestauracao | null {
  if (opcoes.jaRestaurada) {
    return {
      campo: "id",
      mensagem: "Esta inscrição já foi restaurada.",
    };
  }
  if (opcoes.idEmUso) {
    return {
      campo: "id",
      mensagem: "Já existe uma inscrição com este id — nada a restaurar.",
    };
  }
  if (opcoes.codigoEmUso) {
    return {
      campo: "publicCode",
      mensagem:
        "O código desta inscrição já pertence a outra. Restaurar criaria duplicidade.",
    };
  }
  if (opcoes.cpfEmUso) {
    return {
      campo: "cpf",
      mensagem:
        "Este adolescente já tem outra inscrição ativa — a família provavelmente refez. Resolva a duplicidade antes de restaurar.",
    };
  }
  return null;
}

/** Resumo legível de uma exclusão, para a lista da lixeira. */
export function resumoExclusao(d: {
  fullName: string;
  publicCode: string;
  deletedAt: Date;
  deletedByName: string | null;
  reason: string | null;
}): string {
  const quando = d.deletedAt.toLocaleDateString("pt-BR");
  const quem = d.deletedByName ? ` por ${d.deletedByName}` : "";
  const porque = d.reason ? ` — ${d.reason}` : "";
  return `${d.fullName} (${d.publicCode}), excluída em ${quando}${quem}${porque}`;
}
