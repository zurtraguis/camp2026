// Ajusta o preço de um lote. O preço vive no banco (a tabela Lote), não no
// código — o seed só define o padrão de uma base nova.
//
// Uso:
//   npx tsx scripts/preco-lote.ts 3=400          → simulação
//   npx tsx scripts/preco-lote.ts 3=400 --apply  → grava
//
// Mudar o preço NÃO mexe em inscrições já feitas: cada pagamento guardou o
// valor no momento da inscrição, e é esse que vale. Por isso o script mostra
// quantas inscrições existem no lote antes de gravar — se houver, você está
// mudando o preço só para quem vier depois.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { formatBRL } from "../src/lib/format";

const APLICAR = process.argv.includes("--apply");
const pares = process.argv.slice(2).filter((a) => a.includes("="));

if (pares.length === 0) {
  console.error("Uso: npx tsx scripts/preco-lote.ts 3=400 [--apply]");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const alvos = pares.map((par) => {
      const [ordem, reais] = par.split("=");
      const order = Number(ordem);
      const valor = Number(reais.replace(",", "."));
      if (!Number.isInteger(order) || order < 1) {
        throw new Error(`Ordem de lote inválida: "${ordem}".`);
      }
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error(`Preço inválido: "${reais}".`);
      }
      return { order, priceCents: Math.round(valor * 100) };
    });

    for (const a of alvos) {
      const lote = await prisma.lote.findUnique({
        where: { order: a.order },
        select: { id: true, name: true, priceCents: true },
      });
      if (!lote) throw new Error(`Lote de ordem ${a.order} não existe.`);

      const inscricoes = await prisma.registration.count({
        where: { loteId: lote.id, status: { not: "CANCELLED" } },
      });

      console.log(
        `${lote.name}: ${formatBRL(lote.priceCents)} → ${formatBRL(a.priceCents)}` +
          ` (${inscricoes} inscrição(ões) já neste lote — elas mantêm o valor que pagaram)`,
      );

      if (APLICAR) {
        await prisma.lote.update({
          where: { order: a.order },
          data: { priceCents: a.priceCents },
        });
      }
    }

    console.log(
      APLICAR
        ? "\nGravado."
        : "\n(simulação — nada foi gravado. Use --apply para valer.)",
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
