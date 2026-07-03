/**
 * GET /admin/export
 * Exporta inscrições como CSV.
 *
 * Auth: getAdmin() + verificação manual de role — route handlers não podem chamar
 * redirect() de forma confiável pois não há middleware de layout; retorna 401.
 *
 * LGPD — minimização de dados: dados sensíveis de saúde/triagem NÃO são incluídos
 * nesta exportação geral. Para acesso clínico, use a tela individual de cada inscrição.
 */

import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/format";

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // RFC 4180: wrap in double-quotes if the field contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvEscape).join(",");
}

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

type RegExport = {
  publicCode: string;
  fullName: string;
  ageAtCamp: number;
  gender: string;
  tribo: string | null;
  status: string;
  phone: string | null;
  church: string | null;
  city: string | null;
  createdAt: Date;
  guardian: { name: string; phone: string } | null;
  payment: { method: string; amountCents: number } | null;
  lote: { name: string } | null;
};

export async function GET() {
  // Auth check — manual (route handlers can't use redirect cleanly)
  const user = await getAdmin();
  // user.role exists post-migration; cast to access it safely
  const userAny = user as (typeof user & { role?: string }) | null;
  if (!userAny || (userAny.role !== "ADMIN" && userAny.role !== "STAFF")) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  // Fetch all registrations (LGPD: NO health/triage data)
  const registrations = (await db.registration.findMany({
    include: {
      guardian: { select: { name: true, phone: true } },
      payment: {
        select: { method: true, amountCents: true, status: true },
      },
      lote: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  })) as RegExport[];

  // CSV header
  const header = csvRow([
    "Código",
    "Nome",
    "Idade",
    "Gênero",
    "Tribo",
    "Status",
    "Método pgto",
    "Valor (R$)",
    "Lote",
    "Igreja",
    "Cidade",
    "Telefone campista",
    "Responsável",
    "Telefone responsável",
    "Data inscrição",
  ]);

  const rows = registrations.map((r: RegExport) =>
    csvRow([
      r.publicCode,
      r.fullName,
      r.ageAtCamp,
      GENDER_PT[r.gender] ?? r.gender,
      r.tribo ?? "",
      STATUS_PT[r.status] ?? r.status,
      r.payment ? (METHOD_PT[r.payment.method] ?? r.payment.method) : "",
      r.payment ? formatBRL(r.payment.amountCents) : "",
      r.lote?.name ?? "",
      r.church ?? "",
      r.city ?? "",
      r.phone ?? "",
      r.guardian?.name ?? "",
      r.guardian?.phone ?? "",
      r.createdAt.toLocaleDateString("pt-BR"),
    ]),
  );

  // BOM + content (Excel compatibility with UTF-8)
  const bom = "﻿";
  const csv = bom + [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inscricoes-raiz.csv"',
      // No caching — always fresh
      "Cache-Control": "no-store",
    },
  });
}
