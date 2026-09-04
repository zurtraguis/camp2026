import { describe, it, expect } from "vitest";
import {
  montarExtrato,
  saldoAtual,
  compromissos,
  resumoCaixa,
  type Movimento,
  type DespesaEmAberto,
} from "./caixa";

const HOJE = new Date("2026-09-01T12:00:00-03:00");
const dia = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

const entrada = (id: string, iso: string, valorCents: number): Movimento => ({
  id,
  em: dia(iso),
  tipo: "ENTRADA",
  descricao: `Inscrição ${id}`,
  meio: "Pix",
  valorCents,
});

const saida = (id: string, iso: string, valorCents: number): Movimento => ({
  id,
  em: dia(iso),
  tipo: "SAIDA",
  descricao: `Despesa ${id}`,
  meio: "Pix",
  valorCents,
});

describe("montarExtrato", () => {
  it("acumula o saldo na ordem do tempo e devolve do mais recente ao mais antigo", () => {
    const linhas = montarExtrato([
      saida("s1", "2026-08-10", 200000), // fora de ordem de propósito
      entrada("e1", "2026-08-01", 30000),
      entrada("e2", "2026-08-05", 40000),
    ]);

    // Mais recente primeiro (como extrato de banco).
    expect(linhas.map((l) => l.id)).toEqual(["s1", "e2", "e1"]);
    // O saldo de cada linha é o do MOMENTO dela, não o de hoje.
    expect(linhas[2].saldoCents).toBe(30000); // após e1
    expect(linhas[1].saldoCents).toBe(70000); // após e2
    expect(linhas[0].saldoCents).toBe(-130000); // após s1 — ficou negativo aqui
  });

  it("mostra em que linha o caixa ficou negativo", () => {
    // É para isso que serve o saldo por linha: o número de hoje pode estar
    // positivo e ainda assim ter havido um buraco no meio do caminho.
    const linhas = montarExtrato([
      entrada("e1", "2026-08-01", 10000),
      saida("s1", "2026-08-02", 50000),
      entrada("e2", "2026-08-03", 90000),
    ]);
    const negativas = linhas.filter((l) => l.saldoCents < 0);
    expect(negativas.map((l) => l.id)).toEqual(["s1"]);
    expect(linhas[0].saldoCents).toBe(50000); // hoje está positivo
  });

  it("empate de data não faz a ordem dançar entre carregamentos", () => {
    const a = montarExtrato([entrada("b", "2026-08-01", 100), entrada("a", "2026-08-01", 200)]);
    const b = montarExtrato([entrada("a", "2026-08-01", 200), entrada("b", "2026-08-01", 100)]);
    expect(a.map((l) => l.id)).toEqual(b.map((l) => l.id));
  });

  it("lista vazia devolve vazio", () => {
    expect(montarExtrato([])).toEqual([]);
    expect(saldoAtual([])).toBe(0);
  });
});

describe("compromissos", () => {
  const d = (
    id: string,
    abertoCents: number,
    dueDate: Date | null,
  ): DespesaEmAberto => ({ id, description: `Despesa ${id}`, abertoCents, dueDate });

  it("desconta na ordem de vencimento e diz o que sobra depois de cada um", () => {
    const lista = compromissos(
      [d("b", 300000, dia("2026-09-20")), d("a", 200000, dia("2026-09-10"))],
      600000,
      HOJE,
    );
    expect(lista.map((c) => c.id)).toEqual(["a", "b"]); // por vencimento
    expect(lista[0].saldoDepoisCents).toBe(400000);
    expect(lista[1].saldoDepoisCents).toBe(100000);
    expect(lista.some((c) => c.descoberto)).toBe(false);
  });

  it("aponta EXATAMENTE onde o caixa não cobre mais", () => {
    // O ponto da tela: não é "está faltando dinheiro", é "a partir do aluguel
    // do dia 20 não tem mais de onde tirar".
    const lista = compromissos(
      [d("a", 200000, dia("2026-09-10")), d("b", 300000, dia("2026-09-20"))],
      250000,
      HOJE,
    );
    expect(lista[0].descoberto).toBe(false);
    expect(lista[1].descoberto).toBe(true);
    expect(lista[1].saldoDepoisCents).toBe(-250000);
  });

  it("despesa sem vencimento vai para o fim da fila", () => {
    const lista = compromissos(
      [d("sem", 10000, null), d("com", 10000, dia("2026-09-30"))],
      100000,
      HOJE,
    );
    expect(lista.map((c) => c.id)).toEqual(["com", "sem"]);
  });

  it("marca vencida a que passou da data e ainda tem saldo", () => {
    const lista = compromissos([d("a", 10000, dia("2026-08-01"))], 100000, HOJE);
    expect(lista[0].vencido).toBe(true);
  });

  it("despesa quitada não é compromisso", () => {
    expect(compromissos([d("a", 0, dia("2026-09-10"))], 100000, HOJE)).toEqual([]);
  });

  it("NÃO conta com o que ainda pode entrar de inscrição", () => {
    // Conservador de propósito: promessa de pagamento não paga fornecedor. Se
    // a conta só fecha contando com quem ainda não pagou, isso tem de aparecer
    // como risco — não sumir dentro de um número otimista.
    const lista = compromissos([d("a", 500000, dia("2026-09-10"))], 100000, HOJE);
    expect(lista[0].descoberto).toBe(true);
  });
});

describe("resumoCaixa", () => {
  const d = (id: string, aberto: number, due: Date | null): DespesaEmAberto => ({
    id,
    description: id,
    abertoCents: aberto,
    dueDate: due,
  });

  it("livre é o que sobra depois de honrar tudo que está combinado", () => {
    const lista = compromissos([d("a", 200000, dia("2026-09-10"))], 500000, HOJE);
    const r = resumoCaixa(500000, lista);
    expect(r.compromissadoCents).toBe(200000);
    expect(r.livreCents).toBe(300000);
    expect(r.faltaCents).toBe(0);
    expect(r.primeiroDescoberto).toBeNull();
  });

  it("quando não cobre, diz quanto falta e onde a corda arrebenta", () => {
    const lista = compromissos(
      [d("a", 200000, dia("2026-09-10")), d("b", 400000, dia("2026-09-20"))],
      300000,
      HOJE,
    );
    const r = resumoCaixa(300000, lista);
    expect(r.faltaCents).toBe(300000);
    expect(r.livreCents).toBe(-300000);
    expect(r.primeiroDescoberto?.id).toBe("b");
  });

  it("sem compromissos, tudo que está em caixa é livre", () => {
    const r = resumoCaixa(180000, []);
    expect(r).toEqual({
      saldoCents: 180000,
      compromissadoCents: 0,
      livreCents: 180000,
      faltaCents: 0,
      primeiroDescoberto: null,
    });
  });
});
