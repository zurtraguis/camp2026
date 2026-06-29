/**
 * Tribos do Acampamento RAIZ (Gálatas 5.22-23) e algoritmo de balanceamento.
 *
 * Estratégia (validada por pesquisa de soluções consolidadas):
 *  - Online (a cada inscrição): "stratified greedy least-loaded".
 *    Estrato = gênero × faixa etária. Cada novo campista vai para a tribo com
 *    menos membros do MESMO estrato; empate → menos membros no total → menor
 *    índice. Garante paridade de gênero e baixa variância de idade, O(1) amortizado.
 *  - Offline (re-balanceamento pelo admin): "snake draft" por gênero, ordenado
 *    por idade desc., distribuindo em serpentina nas 4 tribos.
 *
 * Sem dependência externa — ~lógica pura, totalmente testável.
 */

export const TRIBOS = ["AGAPE", "EIRENE", "PISTIS", "CHARA"] as const;
export type TriboId = (typeof TRIBOS)[number];

export type Gender = "MALE" | "FEMALE";

export interface TriboMeta {
  id: TriboId;
  nome: string;
  significado: string;
  /** Cor de destaque derivada da identidade RAIZ. */
  cor: string;
}

export const TRIBO_META: Record<TriboId, TriboMeta> = {
  AGAPE: { id: "AGAPE", nome: "Ágape", significado: "amor", cor: "#C8FF50" },
  EIRENE: { id: "EIRENE", nome: "Eirene", significado: "paz", cor: "#A8B92B" },
  PISTIS: { id: "PISTIS", nome: "Pistis", significado: "fidelidade", cor: "#FFD533" },
  CHARA: { id: "CHARA", nome: "Chara", significado: "alegria", cor: "#9C6B2E" },
};

/**
 * Faixa etária para o estrato. Ajustada à inscrição de 12 a 19 anos.
 * 12-13 = 0 · 14-15 = 1 · 16-17 = 2 · 18-19 = 3
 */
export function ageBucket(age: number): number {
  if (age <= 13) return 0;
  if (age <= 15) return 1;
  if (age <= 17) return 2;
  return 3;
}

/** Contagem por tribo usada pelo balanceamento online. */
export interface TriboCounts {
  /** total de membros por tribo */
  total: Record<TriboId, number>;
  /** membros por estrato `${gender}_${bucket}` por tribo */
  byStratum: Record<TriboId, Record<string, number>>;
}

export function emptyCounts(): TriboCounts {
  const total = {} as Record<TriboId, number>;
  const byStratum = {} as Record<TriboId, Record<string, number>>;
  for (const t of TRIBOS) {
    total[t] = 0;
    byStratum[t] = {};
  }
  return { total, byStratum };
}

function stratumKey(gender: Gender, age: number): string {
  return `${gender}_${ageBucket(age)}`;
}

/**
 * Escolhe a melhor tribo para um novo campista (online).
 * Determinístico: empates resolvidos por menor total e depois ordem das TRIBOS.
 */
export function chooseTribo(
  gender: Gender,
  age: number,
  counts: TriboCounts,
): TriboId {
  const key = stratumKey(gender, age);
  let best: TriboId = TRIBOS[0];
  for (const t of TRIBOS) {
    const tStratum = counts.byStratum[t][key] ?? 0;
    const bStratum = counts.byStratum[best][key] ?? 0;
    if (
      tStratum < bStratum ||
      (tStratum === bStratum && counts.total[t] < counts.total[best])
    ) {
      best = t;
    }
  }
  return best;
}

/** Aplica a escolha às contagens (mutação controlada, para uso incremental). */
export function applyAssignment(
  tribo: TriboId,
  gender: Gender,
  age: number,
  counts: TriboCounts,
): void {
  const key = stratumKey(gender, age);
  counts.total[tribo] += 1;
  counts.byStratum[tribo][key] = (counts.byStratum[tribo][key] ?? 0) + 1;
}

export interface Camper {
  id: string;
  gender: Gender;
  age: number;
}

/**
 * Re-balanceamento offline (snake draft por gênero, idade desc.).
 * Retorna um mapa id → tribo. Determinístico para a mesma entrada.
 */
export function rebalance(campers: Camper[]): Record<string, TriboId> {
  const result: Record<string, TriboId> = {};
  const byGender: Record<Gender, Camper[]> = {
    MALE: campers.filter((c) => c.gender === "MALE"),
    FEMALE: campers.filter((c) => c.gender === "FEMALE"),
  };

  for (const gender of ["MALE", "FEMALE"] as const) {
    // idade desc.; empate por id para estabilidade
    const sorted = [...byGender[gender]].sort(
      (a, b) => b.age - a.age || a.id.localeCompare(b.id),
    );
    const n = TRIBOS.length;
    sorted.forEach((camper, i) => {
      const round = Math.floor(i / n);
      const pos = i % n;
      // serpentina: rodadas pares L→R, ímpares R→L
      const idx = round % 2 === 0 ? pos : n - 1 - pos;
      result[camper.id] = TRIBOS[idx];
    });
  }
  return result;
}

/** Métrica de qualidade do balanceamento (para o painel admin). */
export interface BalanceReport {
  perTribo: Record<
    TriboId,
    { total: number; male: number; female: number; avgAge: number }
  >;
  genderSpread: number; // diferença máx-mín de meninos (ou meninas) entre tribos
  ageSpread: number; // diferença entre maior e menor média de idade
}

export function balanceReport(campers: (Camper & { tribo: TriboId })[]): BalanceReport {
  const perTribo = {} as BalanceReport["perTribo"];
  for (const t of TRIBOS) {
    const members = campers.filter((c) => c.tribo === t);
    const male = members.filter((m) => m.gender === "MALE").length;
    const female = members.filter((m) => m.gender === "FEMALE").length;
    const avgAge =
      members.length === 0
        ? 0
        : members.reduce((s, m) => s + m.age, 0) / members.length;
    perTribo[t] = { total: members.length, male, female, avgAge };
  }
  const males = TRIBOS.map((t) => perTribo[t].male);
  const females = TRIBOS.map((t) => perTribo[t].female);
  const avgAges = TRIBOS.map((t) => perTribo[t].avgAge).filter((_, i) =>
    perTribo[TRIBOS[i]].total > 0 ? true : false,
  );
  const spread = (xs: number[]) =>
    xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  return {
    perTribo,
    genderSpread: Math.max(spread(males), spread(females)),
    ageSpread: avgAges.length ? Number(spread(avgAges).toFixed(2)) : 0,
  };
}
