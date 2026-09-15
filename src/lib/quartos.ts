/**
 * Quartos (alojamento) e líder de quarto — regras puras.
 *
 * Três decisões moldam tudo:
 *
 * 1. MENINOS E MENINAS EM QUARTOS SEPARADOS. Acampamento de adolescentes. Não
 *    é opção configurável: um quarto misto por descuido de configuração é o
 *    tipo de erro que não se conserta pedindo desculpas.
 *
 * 2. O LÍDER É O MAIS VELHO DO QUARTO — pela data de nascimento, não pela idade
 *    em anos (há muitos empates em "15 anos"; a data desempata de verdade).
 *
 * 3. CADA QUARTO RECEBE UM DOS MAIS VELHOS, em vez de agrupar por idade. Se os
 *    de 12 anos ficassem juntos, o "líder" daquele quarto teria 12 anos e a
 *    regra perderia o sentido. A distribuição é em serpentina a partir do mais
 *    velho: a primeira pessoa de cada quarto é necessariamente a mais velha
 *    dele, e as idades ficam equilibradas entre os quartos.
 *
 * Os quartos saem com tamanhos parecidos (diferença máxima de 1) e nunca acima
 * da capacidade. Com 13 meninos e 6 por quarto: 5, 4, 4 — e não 6, 6, 1, que
 * deixaria alguém sozinho.
 */

export type Genero = "MALE" | "FEMALE";

export interface CampistaParaQuarto {
  id: string;
  fullName: string;
  gender: Genero;
  birthDate: Date;
}

export interface QuartoGerado {
  gender: Genero;
  numero: number;
  membros: string[];
}

export const GENERO_LABEL: Record<Genero, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
};

/** Mais velho primeiro. Empate de nascimento resolvido pelo nome, depois id. */
function porIdadeDesc(a: CampistaParaQuarto, b: CampistaParaQuarto): number {
  return (
    a.birthDate.getTime() - b.birthDate.getTime() ||
    a.fullName.localeCompare(b.fullName, "pt-BR") ||
    a.id.localeCompare(b.id)
  );
}

export function validarCapacidade(capacidade: number): string | null {
  if (!Number.isInteger(capacidade)) return "A capacidade precisa ser um número inteiro.";
  if (capacidade < 2) return "Um quarto precisa de pelo menos 2 pessoas.";
  if (capacidade > 50) return "Capacidade acima de 50 por quarto — confira o número.";
  return null;
}

/**
 * Gera os quartos do zero, por gênero.
 * Determinístico: a mesma lista produz os mesmos quartos.
 */
export function gerarQuartos(
  campistas: CampistaParaQuarto[],
  capacidade: number,
): QuartoGerado[] {
  const erro = validarCapacidade(capacidade);
  if (erro) throw new Error(erro);

  const resultado: QuartoGerado[] = [];

  for (const gender of ["MALE", "FEMALE"] as const) {
    const grupo = campistas.filter((c) => c.gender === gender).sort(porIdadeDesc);
    if (grupo.length === 0) continue;

    const nQuartos = Math.ceil(grupo.length / capacidade);
    const quartos: string[][] = Array.from({ length: nQuartos }, () => []);

    // Serpentina: rodada par vai do quarto 1 ao último, rodada ímpar volta.
    // Na rodada 0 cada quarto recebe o mais velho que lhe cabe — o líder.
    grupo.forEach((c, i) => {
      const rodada = Math.floor(i / nQuartos);
      const pos = i % nQuartos;
      const idx = rodada % 2 === 0 ? pos : nQuartos - 1 - pos;
      quartos[idx].push(c.id);
    });

    quartos.forEach((membros, i) =>
      resultado.push({ gender, numero: i + 1, membros }),
    );
  }

  return resultado;
}

/** O líder: o mais velho entre os membros. `null` em quarto vazio. */
export function liderDoQuarto<T extends CampistaParaQuarto>(membros: T[]): T | null {
  if (membros.length === 0) return null;
  return [...membros].sort(porIdadeDesc)[0];
}

export interface QuartoExistente {
  id: string;
  gender: Genero;
  numero: number;
  ocupacao: number;
}

export interface Encaixe {
  /** campista → quarto existente */
  emQuartos: Record<string, string>;
  /** quartos novos a criar, com quem vai para eles */
  novos: QuartoGerado[];
}

/**
 * Encaixa quem chegou depois dos quartos já montados, SEM mexer em ninguém.
 *
 * Quarto já anunciado não pode mudar a cada inscrição nova — a família já
 * sabe, a lista já foi pregada na porta. Então o recém-chegado vai para o
 * quarto do mesmo gênero com menos gente, desde que haja vaga; se todos
 * estiverem cheios, abre-se um quarto novo.
 */
export function encaixar(
  semQuarto: CampistaParaQuarto[],
  existentes: QuartoExistente[],
  capacidade: number,
): Encaixe {
  const erro = validarCapacidade(capacidade);
  if (erro) throw new Error(erro);

  const emQuartos: Record<string, string> = {};
  const novos: QuartoGerado[] = [];
  const ocupacao = new Map(existentes.map((q) => [q.id, q.ocupacao]));

  for (const gender of ["MALE", "FEMALE"] as const) {
    const fila = semQuarto.filter((c) => c.gender === gender).sort(porIdadeDesc);
    const quartos = existentes.filter((q) => q.gender === gender);
    let proximoNumero = quartos.reduce((m, q) => Math.max(m, q.numero), 0) + 1;

    for (const c of fila) {
      const comVaga = quartos
        .filter((q) => (ocupacao.get(q.id) ?? 0) < capacidade)
        .sort(
          (a, b) =>
            (ocupacao.get(a.id) ?? 0) - (ocupacao.get(b.id) ?? 0) ||
            a.numero - b.numero,
        )[0];

      if (comVaga) {
        emQuartos[c.id] = comVaga.id;
        ocupacao.set(comVaga.id, (ocupacao.get(comVaga.id) ?? 0) + 1);
        continue;
      }

      const aberto = novos.find(
        (n) => n.gender === gender && n.membros.length < capacidade,
      );
      if (aberto) {
        aberto.membros.push(c.id);
      } else {
        novos.push({ gender, numero: proximoNumero++, membros: [c.id] });
      }
    }
  }

  return { emQuartos, novos };
}
