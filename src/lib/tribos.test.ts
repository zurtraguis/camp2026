import { describe, it, expect } from "vitest";
import {
  TRIBOS,
  chooseTribo,
  applyAssignment,
  emptyCounts,
  rebalance,
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

describe("chooseTribo (online)", () => {
  it("distribui os 4 primeiros do mesmo estrato em tribos distintas", () => {
    const counts = emptyCounts();
    const chosen: TriboId[] = [];
    for (let i = 0; i < 4; i++) {
      const t = chooseTribo("MALE", 15, counts);
      applyAssignment(t, "MALE", 15, counts);
      chosen.push(t);
    }
    expect(new Set(chosen).size).toBe(4); // uma em cada tribo
  });

  it("mantém paridade de gênero e idade ao longo de muitas inscrições", () => {
    const counts = emptyCounts();
    const campers: (Camper & { tribo: TriboId })[] = [];
    // 80 meninos e 80 meninas, idades 12..19 ciclando
    for (let i = 0; i < 160; i++) {
      const gender = i % 2 === 0 ? "MALE" : "FEMALE";
      const age = 12 + (i % 8);
      const tribo = chooseTribo(gender, age, counts);
      applyAssignment(tribo, gender, age, counts);
      campers.push({ id: `c${i}`, gender, age, tribo });
    }
    const rep = balanceReport(campers);
    // 160 / 4 = 40 por tribo
    for (const t of TRIBOS) expect(rep.perTribo[t].total).toBe(40);
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
  it("equilibra gênero e idade entre as 4 tribos", () => {
    const campers: Camper[] = [];
    for (let i = 0; i < 48; i++) {
      campers.push({
        id: `id${i}`,
        gender: i < 24 ? "MALE" : "FEMALE",
        age: 12 + (i % 8),
      });
    }
    const map = rebalance(campers);
    const withTribo = campers.map((c) => ({ ...c, tribo: map[c.id] }));
    const rep = balanceReport(withTribo);
    for (const t of TRIBOS) expect(rep.perTribo[t].total).toBe(12);
    expect(rep.genderSpread).toBeLessThanOrEqual(1);
    expect(rep.ageSpread).toBeLessThanOrEqual(0.5);
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
