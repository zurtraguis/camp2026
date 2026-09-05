import { describe, it, expect } from "vitest";
import {
  TRIBOS,
  chooseTribo,
  applyAssignment,
  emptyCounts,
  rebalance,
  buildTriboUpdate,
  balanceReport,
  ageBucket,
  type Camper,
  type TriboId,
  type Gender,
} from "./tribos";

describe("ageBucket", () => {
  it("mapeia faixas de 12 a 19 em 4 baldes", () => {
    expect(ageBucket(12)).toBe(0);
    expect(ageBucket(13)).toBe(0);
    expect(ageBucket(14)).toBe(1);
    expect(ageBucket(16)).toBe(2);
    expect(ageBucket(19)).toBe(3);
  });
});

describe("as tribos vigentes", () => {
  it("são exatamente Ágape, Eirene e Chara", () => {
    // Pistis saiu em ago/2026. Este teste é o alarme: mexer na lista muda
    // silenciosamente TODO o balanceamento (online e offline), porque os dois
    // algoritmos derivam a quantidade de tribos de TRIBOS.length.
    expect([...TRIBOS]).toEqual(["AGAPE", "EIRENE", "CHARA"]);
  });
});

describe("trocarTriboSchema (troca manual pelo admin)", () => {
  it("aceita só as tribos VIGENTES", async () => {
    const { trocarTriboSchema } = await import("./validation");
    for (const t of TRIBOS) {
      expect(
        trocarTriboSchema.safeParse({ registrationId: "x", tribo: t }).success,
      ).toBe(true);
    }
  });

  it("recusa uma tribo que não existe mais", async () => {
    // O banco ainda aceita PISTIS no enum até a migração rodar. Validar contra
    // TRIBOS é o que impede a troca manual de recolocar alguém lá dentro.
    const { trocarTriboSchema } = await import("./validation");
    expect(
      trocarTriboSchema.safeParse({ registrationId: "x", tribo: "PISTIS" }).success,
    ).toBe(false);
    expect(
      trocarTriboSchema.safeParse({ registrationId: "x", tribo: "" }).success,
    ).toBe(false);
  });
});

describe("chooseTribo (online)", () => {
  it("distribui os primeiros campistas do mesmo estrato em tribos distintas", () => {
    const counts = emptyCounts();
    const chosen: TriboId[] = [];
    for (let i = 0; i < TRIBOS.length; i++) {
      const t = chooseTribo("MALE", 15, counts);
      applyAssignment(t, "MALE", 15, counts);
      chosen.push(t);
    }
    expect(new Set(chosen).size).toBe(TRIBOS.length); // uma em cada tribo
  });

  it("mantém paridade de gênero e idade ao longo de muitas inscrições", () => {
    const counts = emptyCounts();
    const campers: (Camper & { tribo: TriboId })[] = [];
    // Metade meninos, metade meninas, idades 12..19 ciclando. O total sai de
    // TRIBOS.length para o teste não travar num número de tribos.
    const POR_TRIBO = 40;
    const TOTAL = TRIBOS.length * POR_TRIBO;
    for (let i = 0; i < TOTAL; i++) {
      const gender = i % 2 === 0 ? "MALE" : "FEMALE";
      const age = 12 + (i % 8);
      const tribo = chooseTribo(gender, age, counts);
      applyAssignment(tribo, gender, age, counts);
      campers.push({ id: `c${i}`, gender, age, tribo });
    }
    const rep = balanceReport(campers);
    for (const t of TRIBOS) expect(rep.perTribo[t].total).toBe(POR_TRIBO);
    expect(rep.genderSpread).toBeLessThanOrEqual(1);
    expect(rep.ageSpread).toBeLessThanOrEqual(0.5);
  });

  it("é determinístico para a mesma sequência", () => {
    const run = () => {
      const counts = emptyCounts();
      const out: TriboId[] = [];
      for (let i = 0; i < 20; i++) {
        const g = i % 3 === 0 ? "FEMALE" : "MALE";
        const a = 12 + (i % 8);
        const t = chooseTribo(g, a, counts);
        applyAssignment(t, g, a, counts);
        out.push(t);
      }
      return out.join(",");
    };
    expect(run()).toBe(run());
  });
});

describe("rebalance (offline snake draft)", () => {
  it("equilibra gênero e idade entre as tribos vigentes", () => {
    const POR_TRIBO = 12;
    const TOTAL = TRIBOS.length * POR_TRIBO;
    const campers: Camper[] = [];
    for (let i = 0; i < TOTAL; i++) {
      campers.push({
        id: `id${i}`,
        gender: i < TOTAL / 2 ? "MALE" : "FEMALE",
        age: 12 + (i % 8),
      });
    }
    const map = rebalance(campers);
    const withTribo = campers.map((c) => ({ ...c, tribo: map[c.id] }));
    const rep = balanceReport(withTribo);
    for (const t of TRIBOS) expect(rep.perTribo[t].total).toBe(POR_TRIBO);
    expect(rep.genderSpread).toBeLessThanOrEqual(1);
    expect(rep.ageSpread).toBeLessThanOrEqual(0.5);
  });

  it("grava tudo num único UPDATE, com os ids e tribos como parâmetros", () => {
    // Um update por campista dentro de uma transação estourava o timeout de 5s
    // do Prisma (P2028) e o rebalanceamento inteiro falhava. Aqui garantimos
    // que continua sendo UMA instrução — e que nada entra por concatenação.
    const { sql, params } = buildTriboUpdate({ a: "AGAPE", b: "CHARA" });
    expect(sql).toContain('update "Registration"');
    expect(sql).toContain("($1, $2), ($3, $4)");
    expect(sql).not.toContain("AGAPE"); // valores vão parametrizados
    expect(params).toEqual(["a", "AGAPE", "b", "CHARA"]);
    expect(sql.split(";").length).toBe(1);
  });

  it("recusa mapa vazio em vez de montar SQL inválido", () => {
    expect(() => buildTriboUpdate({})).toThrow();
  });

  it("é estável/determinístico", () => {
    const campers: Camper[] = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      gender: (i % 2 === 0 ? "MALE" : "FEMALE") as Gender,
      age: 12 + (i % 8),
    }));
    expect(rebalance(campers)).toEqual(rebalance(campers));
  });
});
