// Verificação read-only de conexão (não altera o banco). Uso: node scripts/check-db.mjs
import "dotenv/config";
import pg from "pg";

async function test(label, url) {
  if (!url) return console.log(`${label}: (vazio)`);
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const r = await client.query("select 1 as ok");
    console.log(`${label}: OK (select ${r.rows[0].ok})`);
  } catch (e) {
    console.log(`${label}: FALHOU -> ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

await test("DATABASE_URL (pooler 6543)", process.env.DATABASE_URL);
await test("DIRECT_URL (direto 5432)", process.env.DIRECT_URL);
