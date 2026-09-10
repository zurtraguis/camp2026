// Comprovantes no storage cujo dono NÃO existe mais no banco.
//
// A exclusão de uma inscrição apaga em cascata tudo no Postgres, mas NÃO toca
// no arquivo do comprovante — ele fica no bucket, numa pasta cujo nome é o id
// da inscrição. É o único rastro que sobra de uma inscrição excluída, e traz
// o comprovante em si (pagador, valor, data).
//
// Uso: npx tsx scripts/comprovantes-orfaos.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BUCKET = process.env.SUPABASE_COMPROVANTES_BUCKET || "comprovantes";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage não configurado no .env.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const { data: pastas, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000 });
    if (error) throw error;

    const ids = new Set(
      (await prisma.registration.findMany({ select: { id: true } })).map((r) => r.id),
    );

    console.log(`pastas no bucket "${BUCKET}": ${pastas?.length ?? 0}`);
    const orfas = (pastas ?? []).filter((p) => p.name && !ids.has(p.name));

    if (orfas.length === 0) {
      console.log("Nenhuma pasta órfã — nada de inscrição excluída sobrou aqui.");
      return;
    }

    console.log(`\nÓRFÃS (inscrição não existe mais): ${orfas.length}`);
    for (const pasta of orfas) {
      const { data: arquivos } = await supabase.storage
        .from(BUCKET)
        .list(pasta.name, { limit: 100 });
      console.log(`\n  ${pasta.name}`);
      for (const a of arquivos ?? []) {
        const caminho = `${pasta.name}/${a.name}`;
        const { data: assinado } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(caminho, 3600);
        console.log(
          `    ${a.name}  (${a.metadata?.size ?? "?"} bytes, ${a.created_at ?? "?"})`,
        );
        if (assinado?.signedUrl) console.log(`    ${assinado.signedUrl}`);
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
