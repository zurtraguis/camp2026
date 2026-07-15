import { describe, it, expect } from "vitest";
import { saldoDoPagamento, ordenarPorUrgencia, type Saldo } from "./cobranca";

const HOJE = new Date("2026-07-15T12:00:00Z");
const dia = (iso: string) => new Date(iso);

describe("saldoDoPagamento — à vista", () => {
  it("pagamento pendente deve o valor cheio", () => {
    const s = saldoDoPagamento(
      { amountCents: 30000, status: "PENDING", installments: [] },
      HOJE,
    );
    expect(s.carne).toBe(false);
    expect(s.pagoCents).toBe(0);
    expect(s.abertoCents).toBe(30000);
    expect(s.quitado).toBe(false);
    expect(s.emRevisao).toBe(0);
  });

  it("pagamento confirmado zera o saldo", () => {
    const s = saldoDoPagamento(
      { amountCents: 30000, status: "CONFIRMED", installments: [] },
      HOJE,
    );
    expect(s.pagoCents).toBe(30000);
    expect(s.abertoCents).toBe(0);
    expect(s.quitado).toBe(true);
  });

  it("comprovante à vista na fila conta como em revisão, mas ainda deve", () => {
    const s = saldoDoPagamento(
      { amountCents: 30000, status: "AWAITING_REVIEW", installments: [] },
      HOJE,
    );
    expect(s.emRevisao).toBe(1);
    expect(s.abertoCents).toBe(30000); // só entra em caixa quando aprovado
  });

  it("à vista nunca aparece como vencido — não tem data de corte", () => {
    const s = saldoDoPagamento(
      { amountCents: 30000, status: "PENDING", installments: [] },
      HOJE,
    );
    expect(s.vencidas).toBe(0);
    expect(s.diasAtraso).toBe(0);
  });
});

describe("saldoDoPagamento — carnê", () => {
  const carne3 = (...st: string[]) => ({
    amountCents: 30000,
    status: "PENDING",
    installments: st.map((status, i) => ({
      amountCents: 10000,
      dueDate: dia(["2026-06-05", "2026-07-05", "2026-08-05"][i]),
      status,
    })),
  });

  it("conta só parcelas confirmadas, ignorando o status do payment", () => {
    const s = saldoDoPagamento(carne3("CONFIRMED", "PENDING", "PENDING"), HOJE);
    expect(s.carne).toBe(true);
    expect(s.pagoCents).toBe(10000);
    expect(s.abertoCents).toBe(20000);
  });

  it("conta as parcelas vencidas e o atraso pela MAIS ANTIGA em aberto", () => {
    // 05/06 e 05/07 já venceram em 15/07; a mais antiga é 05/06 → 40 dias.
    const s = saldoDoPagamento(carne3("PENDING", "PENDING", "PENDING"), HOJE);
    expect(s.vencidas).toBe(2);
    expect(s.diasAtraso).toBe(40);
  });

  it("parcela confirmada não conta como vencida", () => {
    const s = saldoDoPagamento(carne3("CONFIRMED", "PENDING", "PENDING"), HOJE);
    expect(s.vencidas).toBe(1); // só a de 05/07
    expect(s.diasAtraso).toBe(10);
  });

  it("parcela na fila de revisão ainda está vencida — dinheiro não entrou", () => {
    const s = saldoDoPagamento(carne3("AWAITING_REVIEW", "PENDING", "PENDING"), HOJE);
    expect(s.emRevisao).toBe(1);
    expect(s.pagoCents).toBe(0);
    expect(s.vencidas).toBe(2);
  });

  it("carnê quitado zera saldo e atraso", () => {
    const s = saldoDoPagamento(carne3("CONFIRMED", "CONFIRMED", "CONFIRMED"), HOJE);
    expect(s.abertoCents).toBe(0);
    expect(s.quitado).toBe(true);
    expect(s.vencidas).toBe(0);
    expect(s.diasAtraso).toBe(0);
  });

  it("parcela futura não está vencida", () => {
    const s = saldoDoPagamento(carne3("CONFIRMED", "CONFIRMED", "PENDING"), HOJE);
    expect(s.vencidas).toBe(0); // 05/08 ainda não venceu
    expect(s.diasAtraso).toBe(0);
    expect(s.abertoCents).toBe(10000);
  });

  it("nunca devolve saldo negativo", () => {
    const s = saldoDoPagamento(
      {
        amountCents: 10000,
        status: "PENDING",
        installments: [
          { amountCents: 10000, dueDate: dia("2026-06-05"), status: "CONFIRMED" },
          { amountCents: 10000, dueDate: dia("2026-07-05"), status: "CONFIRMED" },
        ],
      },
      HOJE,
    );
    expect(s.abertoCents).toBe(0);
  });
});

describe("ordenarPorUrgencia", () => {
  const linha = (diasAtraso: number, abertoCents: number, id: string) => ({
    id,
    saldo: { diasAtraso, abertoCents } as Saldo,
  });

  it("mais atrasado primeiro; empate desempata pelo maior valor", () => {
    const ordenado = ordenarPorUrgencia([
      linha(0, 30000, "em-dia"),
      linha(40, 10000, "atrasado-40"),
      linha(10, 20000, "atrasado-10-menor"),
      linha(10, 25000, "atrasado-10-maior"),
    ]);
    expect(ordenado.map((l) => l.id)).toEqual([
      "atrasado-40",
      "atrasado-10-maior",
      "atrasado-10-menor",
      "em-dia",
    ]);
  });

  it("não muta o array original", () => {
    const orig = [linha(0, 100, "a"), linha(9, 100, "b")];
    ordenarPorUrgencia(orig);
    expect(orig.map((l) => l.id)).toEqual(["a", "b"]);
  });
});
