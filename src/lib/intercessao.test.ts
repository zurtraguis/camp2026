import { describe, it, expect } from "vitest";
import {
  distribuir,
  listasPorCoordenador,
  resumoIntercessao,
  nomesDaLista,
  type CampistaParaIntercessao,
  type CoordenadorParaIntercessao,
} from "./intercessao";

const coord = (n: number): CoordenadorParaIntercessao => ({
  id: `co${n}`,
  name: `Coordenador ${n}`,
});

const campista = (
  n: number,
  intercessorId: string | null = null,
): CampistaParaIntercessao => ({
  id: `ca${String(n).padStart(3, "0")}`,
  fullName: `Campista ${String(n).padStart(3, "0")}`,
  intercessorId,
});

describe("distribuir", () => {
  it("divide o mais igualmente possível — 59 campistas em 22 coordenadores", () => {
    // O caso real do acampamento. 59/22 = 2 para todos, 15 com 3.
    const coordenadores = Array.from({ length: 22 }, (_, i) => coord(i + 1));
    const campistas = Array.from({ length: 59 }, (_, i) => campista(i + 1));

    const mudancas = distribuir(campistas, coordenadores);
    expect(Object.keys(mudancas)).toHaveLength(59);

    const porCoordenador = new Map<string, number>();
    for (const id of Object.values(mudancas)) {
      porCoordenador.set(id, (porCoordenador.get(id) ?? 0) + 1);
    }
    const tamanhos = [...porCoordenador.values()];
    expect(porCoordenador.size).toBe(22); // ninguém ficou de fora
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(1);
    expect(tamanhos.reduce((a, b) => a + b, 0)).toBe(59);
  });

  it("NÃO mexe em quem já tem coordenador", () => {
    // A regra que sustenta a intercessão: quem já está sendo coberto por
    // alguém continua com a mesma pessoa. Trocar toda semana esvazia o sentido.
    const coordenadores = [coord(1), coord(2)];
    const campistas = [
      campista(1, "co1"),
      campista(2, "co1"),
      campista(3), // só este entra na distribuição
    ];
    const mudancas = distribuir(campistas, coordenadores);
    expect(Object.keys(mudancas)).toEqual(["ca003"]);
    expect(mudancas["ca003"]).toBe("co2"); // co1 já tinha 2, co2 tinha 0
  });

  it("campistas novos vão para quem tem menos", () => {
    const coordenadores = [coord(1), coord(2), coord(3)];
    const campistas = [
      campista(1, "co1"),
      campista(2, "co1"),
      campista(3, "co2"),
      campista(4),
      campista(5),
    ];
    const mudancas = distribuir(campistas, coordenadores);
    // co3 (0) e co2 (1) antes de co1 (2).
    expect(mudancas["ca004"]).toBe("co3");
    expect(mudancas["ca005"]).toBe("co2");
  });

  it("redistribuirTudo ignora as atribuições anteriores", () => {
    const coordenadores = [coord(1), coord(2)];
    const campistas = [campista(1, "co1"), campista(2, "co1"), campista(3, "co1")];
    const mudancas = distribuir(campistas, coordenadores, { redistribuirTudo: true });
    expect(Object.keys(mudancas)).toHaveLength(3);
    const co1 = Object.values(mudancas).filter((v) => v === "co1").length;
    const co2 = Object.values(mudancas).filter((v) => v === "co2").length;
    expect(Math.abs(co1 - co2)).toBeLessThanOrEqual(1);
  });

  it("campista apontando para coordenador removido é redistribuído", () => {
    // Se ele continuasse "atribuído" a alguém que não existe mais, sumiria da
    // conta e ninguém oraria por ele — o pior desfecho possível aqui.
    const coordenadores = [coord(1)];
    const campistas = [campista(1, "co-que-saiu")];
    const mudancas = distribuir(campistas, coordenadores);
    expect(mudancas["ca001"]).toBe("co1");
  });

  it("é determinístico e não depende da ordem vinda do banco", () => {
    const coordenadores = [coord(1), coord(2), coord(3)];
    const campistas = [campista(1), campista(2), campista(3), campista(4)];
    const a = distribuir(campistas, coordenadores);
    const b = distribuir([...campistas].reverse(), coordenadores);
    expect(a).toEqual(b);
  });

  it("sem coordenador cadastrado, recusa em vez de perder os campistas", () => {
    expect(() => distribuir([campista(1)], [])).toThrow(/coordenador/i);
  });

  it("mais coordenadores que campistas: ninguém recebe dois, alguns ficam vazios", () => {
    const coordenadores = Array.from({ length: 5 }, (_, i) => coord(i + 1));
    const mudancas = distribuir([campista(1), campista(2)], coordenadores);
    expect(new Set(Object.values(mudancas)).size).toBe(2);
  });
});

describe("listasPorCoordenador", () => {
  it("agrupa e ordena os nomes alfabeticamente", () => {
    const coordenadores = [coord(1), coord(2)];
    const campistas: CampistaParaIntercessao[] = [
      { id: "x", fullName: "Zuleica", intercessorId: "co1" },
      { id: "y", fullName: "Ana", intercessorId: "co1" },
      { id: "z", fullName: "Bruno", intercessorId: "co2" },
    ];
    const listas = listasPorCoordenador(campistas, coordenadores);
    expect(listas[0].campistas.map((c) => c.fullName)).toEqual(["Ana", "Zuleica"]);
    expect(listas[1].campistas.map((c) => c.fullName)).toEqual(["Bruno"]);
  });

  it("coordenador sem ninguém aparece com a lista vazia, não some", () => {
    const listas = listasPorCoordenador([], [coord(1)]);
    expect(listas).toHaveLength(1);
    expect(listas[0].campistas).toEqual([]);
  });

  it("ordena por nome respeitando acentos", () => {
    const campistas: CampistaParaIntercessao[] = [
      { id: "1", fullName: "Zoe", intercessorId: "co1" },
      { id: "2", fullName: "Ácila", intercessorId: "co1" },
      { id: "3", fullName: "Bruna", intercessorId: "co1" },
    ];
    const [lista] = listasPorCoordenador(campistas, [coord(1)]);
    expect(lista.campistas.map((c) => c.fullName)).toEqual(["Ácila", "Bruna", "Zoe"]);
  });
});

describe("resumoIntercessao", () => {
  it("mostra o menor e o maior grupo, e quem ficou sem", () => {
    const coordenadores = [coord(1), coord(2)];
    const campistas: CampistaParaIntercessao[] = [
      { id: "a", fullName: "A", intercessorId: "co1" },
      { id: "b", fullName: "B", intercessorId: "co1" },
      { id: "c", fullName: "C", intercessorId: "co2" },
      { id: "d", fullName: "D", intercessorId: null },
    ];
    const listas = listasPorCoordenador(campistas, coordenadores);
    const r = resumoIntercessao(listas, 4, 1);
    expect(r).toEqual({
      totalCampistas: 4,
      totalCoordenadores: 2,
      semCoordenador: 1,
      minPorCoordenador: 1,
      maxPorCoordenador: 2,
      coordenadoresVazios: 0,
    });
  });
});

describe("nomesDaLista", () => {
  it("lê um nome por linha, aparando espaços", () => {
    expect(nomesDaLista("  Ana Paula \n Bruno  \n\n  Carla\n")).toEqual([
      "Ana Paula",
      "Bruno",
      "Carla",
    ]);
  });

  it("colapsa espaços internos e descarta repetidos, ignorando maiúsculas", () => {
    expect(nomesDaLista("Ana   Paula\nANA PAULA\nBruno")).toEqual([
      "Ana Paula",
      "Bruno",
    ]);
  });

  it("texto vazio devolve lista vazia", () => {
    expect(nomesDaLista("   \n\n ")).toEqual([]);
  });
});
