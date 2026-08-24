/**
 * Tribos do Acampamento RAIZ (Gálatas 5.22-23) e algoritmo de balanceamento.
 *
 * Estratégia (validada por pesquisa de soluções consolidadas):
 *  - Online (a cada inscrição): "stratified greedy least-loaded".
 *    Estrato = gênero × faixa etária. Cada novo campista vai para a tribo com
 *    menos membros do MESMO estrato; empate → menos membros no total → menor
 *    índice. Garante paridade de gênero e baixa variância de idade, O(1) amortizado.
 *  - Offline (re-balanceamento pelo admin): "snake draft" por gênero, ordenado
 *    por idade desc., distribuindo em serpentina entre as tribos.
 *
 * Sem dependência externa — ~lógica pura, totalmente testável.
 *
 * Os dois algoritmos derivam a quantidade de tribos de TRIBOS.length — mudar a
 * lista abaixo (como em ago/2026, quando Pistis saiu e o acampamento passou de
 * 4 para 3 tribos) rebalanceia tudo sem tocar na lógica.
 */

export const TRIBOS = ["AGAPE", "EIRENE", "CHARA"] as const;
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

/**
 * Monta UM único UPDATE que grava o mapa `id → tribo` de uma vez.
 *
 * Por que não um update por campista dentro de uma transação: com algumas
 * dezenas de inscritos são dezenas de idas e voltas ao banco, e a transação
 * estoura o timeout de 5s do Prisma (P2028) — o rebalanceamento falhava
 * inteiro. Um `update ... from (values ...)` é uma viagem só e já é atômico
 * por ser uma instrução única.
 *
 * `tribo` é gravada como texto com cast explícito para o enum: durante uma
 * troca de tribos o enum do banco pode ainda ter valores que o código não tem.
 */
export function buildTriboUpdate(map: Record<string, TriboId>): {
  sql: string;
  params: string[];
} {
  const entries = Object.entries(map);
  if (entries.length === 0) throw new Error("Nada a atualizar.");
  const values = entries
    .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    .join(", ");
  return {
    sql:
      `update "Registration" as r set tribo = v.tribo::"Tribo" ` +
      `from (values ${values}) as v(id, tribo) where r.id = v.id`,
    params: entries.flatMap(([id, tribo]) => [id, tribo as string]),
  };
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
