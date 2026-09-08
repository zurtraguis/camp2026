/**
 * Intercessão: cada campista fica sob a oração de um coordenador.
 *
 * Duas decisões que moldam tudo aqui:
 *
 * 1. A atribuição é PERSISTIDA e ESTÁVEL. Intercessão se constrói ao longo de
 *    semanas — se a lista mudasse a cada carregamento, o coordenador rezaria
 *    por adolescentes diferentes toda vez, e ninguém seria coberto de fato.
 *    Por isso o padrão é distribuir só quem ainda não tem coordenador;
 *    redistribuir tudo existe, mas é decisão consciente.
 *
 * 2. O critério é só a CARGA. Nada de equilibrar por tribo, gênero ou idade:
 *    orar não depende disso, e cada regra a mais é uma chance a mais de a
 *    distribuição virar uma caixa-preta que ninguém confere.
 *
 * Lógica pura, sem Prisma.
 */

export interface CampistaParaIntercessao {
  id: string;
  fullName: string;
  /** Coordenador atual, quando já houver. */
  intercessorId: string | null;
}

export interface CoordenadorParaIntercessao {
  id: string;
  name: string;
}

/**
 * Distribui campistas entre coordenadores, sempre para o que tem menos gente.
 *
 * Devolve APENAS as mudanças (id do campista → id do coordenador) — quem já
 * tinha coordenador não aparece, a menos que `redistribuirTudo` seja pedido.
 *
 * Determinístico: mesma entrada, mesmo resultado. Empate de carga resolvido
 * pela ordem dos coordenadores, e a fila de campistas é ordenada por nome para
 * a divisão não depender da ordem em que o banco devolveu as linhas.
 */
export function distribuir(
  campistas: CampistaParaIntercessao[],
  coordenadores: CoordenadorParaIntercessao[],
  opcoes: { redistribuirTudo?: boolean } = {},
): Record<string, string> {
  if (coordenadores.length === 0) {
    throw new Error("Cadastre ao menos um coordenador antes de distribuir.");
  }

  const validos = new Set(coordenadores.map((c) => c.id));

  // Carga inicial: só conta quem fica onde está. Um campista apontando para um
  // coordenador que foi removido conta como sem coordenador — senão ele sumiria
  // da distribuição e ninguém oraria por ele.
  const carga = new Map<string, number>(coordenadores.map((c) => [c.id, 0]));
  const semCoordenador: CampistaParaIntercessao[] = [];

  for (const c of campistas) {
    const mantem =
      !opcoes.redistribuirTudo &&
      c.intercessorId !== null &&
      validos.has(c.intercessorId);
    if (mantem) {
      carga.set(c.intercessorId!, (carga.get(c.intercessorId!) ?? 0) + 1);
    } else {
      semCoordenador.push(c);
    }
  }

  const fila = [...semCoordenador].sort(
    (a, b) => a.fullName.localeCompare(b.fullName, "pt-BR") || a.id.localeCompare(b.id),
  );

  const mudancas: Record<string, string> = {};
  for (const campista of fila) {
    let escolhido = coordenadores[0];
    for (const c of coordenadores) {
      if ((carga.get(c.id) ?? 0) < (carga.get(escolhido.id) ?? 0)) escolhido = c;
    }
    mudancas[campista.id] = escolhido.id;
    carga.set(escolhido.id, (carga.get(escolhido.id) ?? 0) + 1);
  }
  return mudancas;
}

export interface ListaDoCoordenador {
  coordenador: CoordenadorParaIntercessao;
  campistas: { id: string; fullName: string }[];
}

/**
 * Agrupa por coordenador, com os campistas em ordem alfabética — é assim que
 * a folha é lida e conferida.
 */
export function listasPorCoordenador(
  campistas: CampistaParaIntercessao[],
  coordenadores: CoordenadorParaIntercessao[],
): ListaDoCoordenador[] {
  return coordenadores.map((coordenador) => ({
    coordenador,
    campistas: campistas
      .filter((c) => c.intercessorId === coordenador.id)
      .map((c) => ({ id: c.id, fullName: c.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR")),
  }));
}

export interface ResumoIntercessao {
  totalCampistas: number;
  totalCoordenadores: number;
  semCoordenador: number;
  /** Menor e maior número de campistas por coordenador. */
  minPorCoordenador: number;
  maxPorCoordenador: number;
  /** Coordenadores que ficaram sem ninguém (mais coordenadores que campistas). */
  coordenadoresVazios: number;
}

export function resumoIntercessao(
  listas: ListaDoCoordenador[],
  totalCampistas: number,
  semCoordenador: number,
): ResumoIntercessao {
  const tamanhos = listas.map((l) => l.campistas.length);
  return {
    totalCampistas,
    totalCoordenadores: listas.length,
    semCoordenador,
    minPorCoordenador: tamanhos.length ? Math.min(...tamanhos) : 0,
    maxPorCoordenador: tamanhos.length ? Math.max(...tamanhos) : 0,
    coordenadoresVazios: tamanhos.filter((t) => t === 0).length,
  };
}

/**
 * Nomes colados de uma vez (um por linha) — cadastrar 22 coordenadores num
 * formulário de cada vez seria cruel. Apara espaços, descarta linhas vazias e
 * remove repetidos preservando a ordem digitada.
 */
export function nomesDaLista(texto: string): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const linha of texto.split(/\r?\n/)) {
    const nome = linha.trim().replace(/\s+/g, " ");
    if (!nome) continue;
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes;
}
