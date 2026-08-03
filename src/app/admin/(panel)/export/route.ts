/**
 * GET /admin/export
 * Exporta a planilha (.xlsx) do acampamento, com duas abas:
 *   - "Inscrições": uma linha por inscrito
 *   - "Recebidos": uma linha por entrada de dinheiro (de onde veio o caixa)
 *
 * Era CSV; virou XLSX porque o CSV abria torto no Excel (separador/acentos) e
 * não comporta mais de uma aba nem valores numéricos de verdade — aqui o valor
 * é número com formato de moeda, então dá para somar na planilha.
 *
 * Auth: getAdmin() + verificação manual de role — route handlers não podem
 * chamar redirect() de forma confiável; retorna 401.
 *
 * LGPD — minimização: dados sensíveis de saúde/triagem NÃO entram nesta
 * exportação geral. Para acesso clínico, use a ficha individual.
 */

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listarRecebimentos } from "@/lib/recebidos.service";
import { ORIGEM_LABEL } from "@/lib/recebidos";

const STATUS_PT: Record<string, string> = {
  PENDING_PAYMENT: "Aguard. pagamento",
  AWAITING_REVIEW: "Em revisão",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

const METHOD_PT: Record<string, string> = {
  CARD: "Cartão",
  PIX: "Pix",
};

const GENDER_PT: Record<string, string> = {
  MALE: "M",
  FEMALE: "F",
};

/** Formato de moeda BRL na célula: soma e filtro funcionam no Excel. */
const BRL = 'R$ #,##0.00';

export async function GET() {
  const user = await getAdmin();
  const userAny = user as (typeof user & { role?: string }) | null;
  if (!userAny || (userAny.role !== "ADMIN" && userAny.role !== "STAFF")) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const [registrations, recebimentos] = await Promise.all([
    db.registration.findMany({
      include: {
        guardian: { select: { name: true, phone: true } },
        payment: {
          select: {
            method: true,
            amountCents: true,
            status: true,
            installmentsTotal: true,
            couponCode: true,
            discountPercent: true,
            originalAmountCents: true,
          },
        },
        lote: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    listarRecebimentos(),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Acampamento RAIZ 2026";
  wb.created = new Date();

  /* ── Aba 1: Inscrições ── */
  const ws = wb.addWorksheet("Inscrições", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Nome", key: "nome", width: 32 },
    { header: "Idade", key: "idade", width: 7 },
    { header: "Gênero", key: "genero", width: 8 },
    { header: "Tribo", key: "tribo", width: 12 },
    { header: "Status", key: "status", width: 18 },
    { header: "Forma", key: "forma", width: 14 },
    { header: "Valor", key: "valor", width: 12, style: { numFmt: BRL } },
    { header: "Cupom", key: "cupom", width: 12 },
    { header: "Valor cheio", key: "cheio", width: 12, style: { numFmt: BRL } },
    { header: "Lote", key: "lote", width: 12 },
    { header: "Igreja", key: "igreja", width: 26 },
    { header: "Cidade", key: "cidade", width: 18 },
    { header: "Responsável", key: "resp", width: 28 },
    { header: "Telefone responsável", key: "respTel", width: 20 },
    { header: "Inscrito em", key: "criado", width: 14 },
  ];

  for (const r of registrations) {
    const p = r.payment;
    const parcelas = p?.installmentsTotal;
    ws.addRow({
      codigo: r.publicCode,
      nome: r.fullName,
      idade: r.ageAtCamp,
      genero: GENDER_PT[r.gender] ?? r.gender,
      tribo: r.tribo ?? "",
      status: STATUS_PT[r.status] ?? r.status,
      forma: p
        ? parcelas
          ? `Carnê ${parcelas}x`
          : (METHOD_PT[p.method] ?? p.method)
        : "",
      valor: p ? p.amountCents / 100 : null,
      cupom: p?.couponCode
        ? `${p.couponCode} (−${p.discountPercent ?? 0}%)`
        : "",
      cheio: p?.originalAmountCents ? p.originalAmountCents / 100 : null,
      lote: r.lote?.name ?? "",
      igreja: r.church ?? "",
      cidade: r.city ?? "",
      resp: r.guardian?.name ?? "",
      respTel: r.guardian?.phone ?? "",
      criado: r.createdAt.toLocaleDateString("pt-BR"),
    });
  }

  /* ── Aba 2: Recebidos (de onde veio o dinheiro) ── */
  const wr = wb.addWorksheet("Recebidos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wr.columns = [
    { header: "Quando", key: "quando", width: 14 },
    { header: "Código", key: "codigo", width: 16 },
    { header: "Nome", key: "nome", width: 32 },
    { header: "Referente a", key: "ref", width: 16 },
    { header: "Meio", key: "meio", width: 12 },
    { header: "Valor", key: "valor", width: 12, style: { numFmt: BRL } },
    { header: "Confirmado por", key: "por", width: 22 },
    { header: "Observação", key: "nota", width: 48 },
  ];

  for (const l of recebimentos) {
    wr.addRow({
      quando: l.em ? l.em.toLocaleDateString("pt-BR") : "",
      codigo: l.publicCode,
      nome: l.nome,
      ref: l.descricao,
      meio: ORIGEM_LABEL[l.origem],
      valor: l.valorCents / 100,
      por: l.confirmadoPor ?? "",
      nota: l.nota ?? "",
    });
  }

  // Linha de total no fim do extrato — some conferir de bater o olho.
  if (recebimentos.length > 0) {
    const totalRow = wr.addRow({
      ref: "TOTAL",
      valor: recebimentos.reduce((s, l) => s + l.valorCents, 0) / 100,
    });
    totalRow.font = { bold: true };
  }

  for (const sheet of [ws, wr]) {
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="raiz-2026-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
