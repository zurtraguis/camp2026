// Move campistas de tribo pela linha de comando — o mesmo que o botão novo na
// ficha da inscrição faz, para quando o deploy ainda não subiu.
//
// Uso:
//   npx tsx scripts/trocar-tribo.ts RAIZ-XXXXXX=CHARA RAIZ-YYYYYY=AGAPE
//   npx tsx scripts/trocar-tribo.ts RAIZ-XXXXXX=CHARA --apply
//
// Sem --apply é simulação. Vários pares numa chamada só: uma troca entre dois
// campistas tem de acontecer junto, senão o intervalo entre as duas deixa o
// balanceamento torto (ou, num swap, duas pessoas na mesma tribo).
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TRIBOS, TRIBO_META, type TriboId } from "../src/lib/tribos";

const APLICAR = process.argv.includes("--apply");
const pares = process.argv.slice(2).filter((a) => a.includes("="));

if (pares.length === 0) {
  console.error(
    'Uso: npx tsx scripts/trocar-tribo.ts RAIZ-XXXXXX=CHARA [RAIZ-YYYYYY=AGAPE] [--apply]',
  );
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const alvos = pares.map((par) => {
      const [code, tribo] = par.split("=");
      const t = tribo?.toUpperCase() as TriboId;
      if (!TRIBOS.includes(t)) {
        throw new Error(
          `Tribo "${tribo}" não existe. Vigentes: ${TRIBOS.join(", ")}.`,
        );
      }
      return { publicCode: code.toUpperCase(), tribo: t };
    });

    const atuais = await prisma.registration.findMany({
      where: { publicCode: { in: alvos.map((a) => a.publicCode) } },
      select: { id: true, publicCode: true, fullName: true, tribo: true },
    });

    for (const a of alvos) {
      if (!atuais.some((r) => r.publicCode === a.publicCode)) {
        throw new Error(`Inscrição ${a.publicCode} não encontrada.`);
      }
    }

    console.table(
      alvos.map((a) => {
        const r = atuais.find((x) => x.publicCode === a.publicCode)!;
        return {
          codigo: a.publicCode,
          nome: r.fullName,
          de: r.tribo ? TRIBO_META[r.tribo as TriboId].nome : "—",
          para: TRIBO_META[a.tribo].nome,
        };
      }),
    );

    if (!APLICAR) {
      console.log("\n(simulação — nada foi gravado. Use --apply para valer.)");
      return;
    }

    // Numa transação: um swap pela metade é pior que não ter feito nada.
    await prisma.$transaction(
      alvos.map((a) =>
        prisma.registration.update({
          where: { publicCode: a.publicCode },
          data: { tribo: a.tribo },
        }),
      ),
    );
    console.log(`\n${alvos.length} campista(s) movido(s).`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
