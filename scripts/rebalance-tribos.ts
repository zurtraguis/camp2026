// Rebalanceia TODOS os campistas nas tribos vigentes (src/lib/tribos.ts).
//
// Usa o mesmo `rebalance()` do painel admin — snake draft por gênero, idade
// desc. Nada de regra duplicada aqui: se a lista de TRIBOS muda, este script
// acompanha sozinho.
//
// Uso:
//   npx tsx scripts/rebalance-tribos.ts            → simulação (não grava nada)
//   npx tsx scripts/rebalance-tribos.ts --apply    → grava, salvando backup antes
//
// Lê e escreve `tribo` como TEXTO (::text / ::"Tribo") de propósito: durante a
// troca de 4 para 3 tribos o banco ainda tem PISTIS no enum enquanto o código
// já não tem, e decodificar o enum pelo client quebraria.
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  rebalance,
  buildTriboUpdate,
  balanceReport,
  TRIBOS,
  TRIBO_META,
  type Camper,
  type Gender,
  type TriboId,
} from "../src/lib/tribos";

const APLICAR = process.argv.includes("--apply");

interface Row {
  id: string;
  fullName: string;
  gender: Gender;
  ageAtCamp: number;
  tribo: string | null;
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      select id, "fullName", gender::text as gender, "ageAtCamp", tribo::text as tribo
      from "Registration"
      where status <> 'CANCELLED'
      order by id
    `;

    if (rows.length === 0) {
      console.log("Nenhuma inscrição ativa — nada a rebalancear.");
      return;
    }

    const campers: Camper[] = rows.map((r) => ({
      id: r.id,
      gender: r.gender,
      age: r.ageAtCamp,
    }));
    const destino = rebalance(campers);

    const antes = new Map(rows.map((r) => [r.id, r.tribo]));
    const contarPor = (get: (id: string) => string | null | undefined) => {
      const acc: Record<string, number> = {};
      for (const r of rows) {
        const t = get(r.id) ?? "(sem tribo)";
        acc[t] = (acc[t] ?? 0) + 1;
      }
      return acc;
    };
    console.log(`Campistas ativos: ${rows.length}`);
    console.log("Antes: ", contarPor((id) => antes.get(id)));
    console.log("Depois:", contarPor((id) => destino[id]));

    const relatorio = balanceReport(
      campers.map((c) => ({ ...c, tribo: destino[c.id] as TriboId })),
    );
    console.table(
      TRIBOS.map((t) => ({
        tribo: TRIBO_META[t].nome,
        total: relatorio.perTribo[t].total,
        meninos: relatorio.perTribo[t].male,
        meninas: relatorio.perTribo[t].female,
        idade_media: relatorio.perTribo[t].avgAge.toFixed(2),
      })),
    );
    console.log(
      `dispersão de gênero: ${relatorio.genderSpread} · dispersão de idade: ${relatorio.ageSpread}`,
    );

    const mudaram = rows.filter((r) => antes.get(r.id) !== destino[r.id]).length;
    console.log(`Trocam de tribo: ${mudaram} de ${rows.length}`);

    if (!APLICAR) {
      console.log("\n(simulação — nada foi gravado. Use --apply para valer.)");
      return;
    }

    // Backup antes de gravar: o rebalanceamento é irreversível sem ele.
    mkdirSync("relatorios", { recursive: true });
    const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const backup = `relatorios/tribos-backup-${carimbo}.json`;
    writeFileSync(
      backup,
      JSON.stringify(
        rows.map((r) => ({ id: r.id, nome: r.fullName, tribo: r.tribo })),
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nBackup do estado anterior: ${backup}`);

    // Um único UPDATE (ver buildTriboUpdate): atômico e numa viagem só — em
    // transação com um update por campista, o timeout de 5s estoura.
    const { sql, params } = buildTriboUpdate(destino);
    await prisma.$executeRawUnsafe(sql, ...params);
    console.log(`Gravado: ${rows.length} campistas redistribuídos.`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
