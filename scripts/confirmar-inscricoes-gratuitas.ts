// Confirma inscrições cujo valor ficou ZERO (cupom de 100%) e que ficaram
// presas em "aguardando pagamento".
//
// É o retroativo do que o código passa a fazer sozinho na criação — ver
// `nadaAPagar` em src/lib/coupon.ts. Existe porque quem se inscreveu ANTES
// dessa regra continua preso: sem chave Pix que faça sentido e sem comprovante
// que possa enviar.
//
// Uso:
//   npx tsx scripts/confirmar-inscricoes-gratuitas.ts           → simulação
//   npx tsx scripts/confirmar-inscricoes-gratuitas.ts --apply   → grava
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nadaAPagar } from "../src/lib/coupon";

const APLICAR = process.argv.includes("--apply");

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const presas = await prisma.registration.findMany({
      where: {
        status: { notIn: ["CONFIRMED", "CANCELLED"] },
        payment: { amountCents: { lte: 0 } },
      },
      select: {
        id: true,
        publicCode: true,
        fullName: true,
        status: true,
        payment: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            couponCode: true,
            discountPercent: true,
          },
        },
      },
    });

    if (presas.length === 0) {
      console.log("Nenhuma inscrição zerada presa em aberto.");
      return;
    }

    console.table(
      presas.map((r) => ({
        codigo: r.publicCode,
        nome: r.fullName,
        inscricao: r.status,
        pagamento: r.payment?.status,
        valor: r.payment?.amountCents,
        cupom: r.payment?.couponCode ?? "—",
      })),
    );

    if (!APLICAR) {
      console.log("\n(simulação — nada foi gravado. Use --apply para valer.)");
      return;
    }

    for (const r of presas) {
      if (!r.payment || !nadaAPagar(r.payment.amountCents)) continue;
      const nota = r.payment.couponCode
        ? `Cupom ${r.payment.couponCode} (−${r.payment.discountPercent ?? 100}%) zerou o valor — inscrição confirmada, nada a pagar.`
        : "Sem valor a pagar — inscrição confirmada.";

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: r.payment.id },
          data: {
            status: "CONFIRMED",
            // Sem valor a cobrar não existe cobrança Pix: manter o txid daria
            // à família uma chave que nunca deve ser paga.
            pixTxid: null,
            reviewedAt: new Date(),
            reviewNote: nota,
          },
        }),
        prisma.registration.update({
          where: { id: r.id },
          data: { status: "CONFIRMED" },
        }),
      ]);
      console.log(`confirmada: ${r.publicCode} — ${r.fullName}`);
    }
    console.log(`\n${presas.length} inscrição(ões) confirmada(s).`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
