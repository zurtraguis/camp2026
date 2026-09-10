import { describe, it, expect } from "vitest";
import {
  snapshotUtilizavel,
  bloqueioRestaurar,
  resumoExclusao,
} from "./lixeira";

const fotoBoa = {
  registration: { id: "reg1", publicCode: "RAIZ-ABC123", fullName: "Fulano" },
  guardian: { name: "Responsável" },
  health: null,
  consent: null,
  payment: null,
};

describe("snapshotUtilizavel", () => {
  it("aceita a fotografia com o essencial para reconstruir", () => {
    expect(snapshotUtilizavel(fotoBoa)).toBe(true);
  });

  it("RECUSA foto sem id ou sem código", () => {
    // Uma foto incompleta é pior que nenhuma: dá a impressão de que há volta
    // quando não há. Melhor falhar alto na hora de restaurar.
    expect(snapshotUtilizavel({ registration: { publicCode: "RAIZ-X" } })).toBe(false);
    expect(snapshotUtilizavel({ registration: { id: "r1" } })).toBe(false);
    expect(snapshotUtilizavel({ registration: { id: "", publicCode: "" } })).toBe(false);
  });

  it("recusa lixo", () => {
    expect(snapshotUtilizavel(null)).toBe(false);
    expect(snapshotUtilizavel("{}")).toBe(false);
    expect(snapshotUtilizavel({})).toBe(false);
  });
});

describe("bloqueioRestaurar", () => {
  const base = {
    jaRestaurada: false,
    idEmUso: false,
    codigoEmUso: false,
    cpfEmUso: false,
  };

  it("libera quando nada conflita", () => {
    expect(bloqueioRestaurar(base)).toBeNull();
  });

  it("não restaura duas vezes", () => {
    expect(bloqueioRestaurar({ ...base, jaRestaurada: true })?.mensagem).toMatch(
      /já foi restaurada/i,
    );
  });

  it("RECUSA se a família refez a inscrição no meio-tempo", () => {
    // O caso que importa: restaurar aqui daria duas vagas ao mesmo adolescente.
    const b = bloqueioRestaurar({ ...base, cpfEmUso: true });
    expect(b?.campo).toBe("cpf");
    expect(b?.mensagem).toMatch(/duplicidade/i);
  });

  it("recusa se o código já pertence a outra inscrição", () => {
    expect(bloqueioRestaurar({ ...base, codigoEmUso: true })?.campo).toBe(
      "publicCode",
    );
  });

  it("recusa se o id já existe", () => {
    expect(bloqueioRestaurar({ ...base, idEmUso: true })?.campo).toBe("id");
  });

  it("a ordem das checagens não esconde o motivo mais específico", () => {
    // "Já restaurada" antes de tudo: é a explicação verdadeira quando os três
    // conflitos aparecem juntos (a própria restauração criou o id e o código).
    const b = bloqueioRestaurar({
      jaRestaurada: true,
      idEmUso: true,
      codigoEmUso: true,
      cpfEmUso: true,
    });
    expect(b?.mensagem).toMatch(/já foi restaurada/i);
  });
});

describe("resumoExclusao", () => {
  it("diz quem, quando e por quê", () => {
    expect(
      resumoExclusao({
        fullName: "Joás do Nascimento",
        publicCode: "RAIZ-UTWHX3",
        deletedAt: new Date("2026-09-09T12:00:00-03:00"),
        deletedByName: "Alexandre",
        reason: "Desistiu; estorno feito.",
      }),
    ).toBe(
      "Joás do Nascimento (RAIZ-UTWHX3), excluída em 09/09/2026 por Alexandre — Desistiu; estorno feito.",
    );
  });

  it("aguenta motivo e autor ausentes", () => {
    expect(
      resumoExclusao({
        fullName: "Fulano",
        publicCode: "RAIZ-X",
        deletedAt: new Date("2026-09-09T12:00:00-03:00"),
        deletedByName: null,
        reason: null,
      }),
    ).toBe("Fulano (RAIZ-X), excluída em 09/09/2026");
  });
});
