import { describe, it, expect } from "vitest";
import {
  gerarQuartos,
  liderDoQuarto,
  encaixar,
  validarCapacidade,
  type CampistaParaQuarto,
  type Genero,
} from "./quartos";

/** Nascido no ano `ano` — quanto menor o ano, mais velho. */
const c = (
  id: string,
  gender: Genero,
  ano: number,
  mesDia = "06-15",
): CampistaParaQuarto => ({
  id,
  fullName: `Campista ${id}`,
  gender,
  birthDate: new Date(`${ano}-${mesDia}T12:00:00-03:00`),
});

describe("gerarQuartos", () => {
  it("NUNCA mistura meninos e meninas no mesmo quarto", () => {
    const campistas = [
      c("m1", "MALE", 2008),
      c("f1", "FEMALE", 2008),
      c("m2", "MALE", 2010),
      c("f2", "FEMALE", 2010),
    ];
    const quartos = gerarQuartos(campistas, 10);
    const genero = new Map(campistas.map((x) => [x.id, x.gender]));
    for (const q of quartos) {
      for (const id of q.membros) expect(genero.get(id)).toBe(q.gender);
    }
    expect(quartos.filter((q) => q.gender === "MALE")).toHaveLength(1);
    expect(quartos.filter((q) => q.gender === "FEMALE")).toHaveLength(1);
  });

  it("respeita a capacidade e cria quantos quartos forem precisos", () => {
    const meninos = Array.from({ length: 13 }, (_, i) => c(`m${i}`, "MALE", 2007 + (i % 7)));
    const quartos = gerarQuartos(meninos, 6);
    expect(quartos).toHaveLength(3); // ceil(13/6)
    for (const q of quartos) expect(q.membros.length).toBeLessThanOrEqual(6);
    expect(quartos.reduce((s, q) => s + q.membros.length, 0)).toBe(13);
  });

  it("equilibra os tamanhos — ninguém fica sozinho no último quarto", () => {
    // 13 com 6 por quarto: 5/4/4, e não 6/6/1.
    const meninos = Array.from({ length: 13 }, (_, i) => c(`m${i}`, "MALE", 2007 + (i % 7)));
    const tamanhos = gerarQuartos(meninos, 6).map((q) => q.membros.length);
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
    expect(Math.min(...tamanhos)).toBeGreaterThan(1);
  });

  it("cada quarto recebe um dos MAIS VELHOS — não agrupa por idade", () => {
    // Se agrupasse por idade, o quarto dos mais novos teria um líder de 12 anos.
    // Aqui os 3 mais velhos caem um em cada quarto.
    const meninas = [
      c("velha1", "FEMALE", 2007),
      c("velha2", "FEMALE", 2007, "09-01"),
      c("velha3", "FEMALE", 2008),
      c("n1", "FEMALE", 2013),
      c("n2", "FEMALE", 2013),
      c("n3", "FEMALE", 2013),
      c("n4", "FEMALE", 2014),
      c("n5", "FEMALE", 2014),
      c("n6", "FEMALE", 2014),
    ];
    const quartos = gerarQuartos(meninas, 3);
    expect(quartos).toHaveLength(3);
    const lideres = quartos.map((q) =>
      liderDoQuarto(meninas.filter((m) => q.membros.includes(m.id)))?.id,
    );
    expect(lideres.sort()).toEqual(["velha1", "velha2", "velha3"]);
  });

  it("é determinístico e não depende da ordem vinda do banco", () => {
    const lista = [c("a", "MALE", 2009), c("b", "MALE", 2011), c("x", "MALE", 2010)];
    expect(gerarQuartos(lista, 2)).toEqual(gerarQuartos([...lista].reverse(), 2));
  });

  it("recusa capacidade absurda em vez de gerar quarto de 1 pessoa", () => {
    expect(() => gerarQuartos([c("a", "MALE", 2009)], 1)).toThrow(/pelo menos 2/i);
    expect(() => gerarQuartos([c("a", "MALE", 2009)], 0)).toThrow();
    expect(() => gerarQuartos([c("a", "MALE", 2009)], 2.5)).toThrow(/inteiro/i);
  });

  it("sem campistas, sem quartos", () => {
    expect(gerarQuartos([], 6)).toEqual([]);
  });
});

describe("liderDoQuarto", () => {
  it("é o mais velho pela DATA de nascimento, não pela idade em anos", () => {
    // Dois com "16 anos": quem nasceu primeiro no ano é o mais velho.
    const membros = [
      c("marco", "MALE", 2010, "11-20"),
      c("janeiro", "MALE", 2010, "01-05"),
      c("novo", "MALE", 2012),
    ];
    expect(liderDoQuarto(membros)?.id).toBe("janeiro");
  });

  it("empate exato de nascimento resolvido pelo nome, sem sorteio", () => {
    const a = { ...c("2", "MALE", 2010), fullName: "Bruno" };
    const b = { ...c("1", "MALE", 2010), fullName: "Arthur" };
    expect(liderDoQuarto([a, b])?.fullName).toBe("Arthur");
  });

  it("quarto vazio não tem líder", () => {
    expect(liderDoQuarto([])).toBeNull();
  });
});

describe("encaixar (quem chegou depois)", () => {
  it("põe o recém-chegado no quarto do mesmo gênero com menos gente", () => {
    const r = encaixar(
      [c("novo", "MALE", 2011)],
      [
        { id: "q1", gender: "MALE", numero: 1, ocupacao: 5 },
        { id: "q2", gender: "MALE", numero: 2, ocupacao: 3 },
        { id: "q3", gender: "FEMALE", numero: 1, ocupacao: 0 },
      ],
      6,
    );
    expect(r.emQuartos).toEqual({ novo: "q2" });
    expect(r.novos).toEqual([]);
  });

  it("NUNCA encaixa num quarto do outro gênero, mesmo vazio", () => {
    const r = encaixar(
      [c("menina", "FEMALE", 2011)],
      [{ id: "qm", gender: "MALE", numero: 1, ocupacao: 0 }],
      6,
    );
    expect(r.emQuartos).toEqual({});
    expect(r.novos).toEqual([{ gender: "FEMALE", numero: 1, membros: ["menina"] }]);
  });

  it("abre quarto novo quando os existentes estão cheios, com o próximo número", () => {
    const r = encaixar(
      [c("a", "MALE", 2010), c("b", "MALE", 2011)],
      [
        { id: "q1", gender: "MALE", numero: 1, ocupacao: 2 },
        { id: "q2", gender: "MALE", numero: 2, ocupacao: 2 },
      ],
      2,
    );
    expect(r.emQuartos).toEqual({});
    expect(r.novos).toEqual([{ gender: "MALE", numero: 3, membros: ["a", "b"] }]);
  });

  it("não mexe em quem já tem quarto — só devolve os recém-chegados", () => {
    const r = encaixar(
      [c("novo", "MALE", 2011)],
      [{ id: "q1", gender: "MALE", numero: 1, ocupacao: 1 }],
      6,
    );
    expect(Object.keys(r.emQuartos)).toEqual(["novo"]);
  });
});

describe("validarCapacidade", () => {
  it("aceita números razoáveis", () => {
    expect(validarCapacidade(2)).toBeNull();
    expect(validarCapacidade(8)).toBeNull();
    expect(validarCapacidade(50)).toBeNull();
  });

  it("recusa o que certamente é erro de digitação", () => {
    expect(validarCapacidade(80)).toMatch(/confira/i);
  });
});
