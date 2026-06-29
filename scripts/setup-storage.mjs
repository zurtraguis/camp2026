// Cria o bucket PRIVADO de comprovantes Pix no Supabase Storage.
// Uso: node scripts/setup-storage.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_COMPROVANTES_BUCKET || "comprovantes";

if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing } = await supabase.storage.getBucket(bucket);
if (existing) {
  console.log(`Bucket "${bucket}" já existe (público: ${existing.public}).`);
  if (existing.public) {
    await supabase.storage.updateBucket(bucket, { public: false });
    console.log("→ Ajustado para PRIVADO.");
  }
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(bucket, {
  public: false,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  fileSizeLimit: "5MB",
});

if (error) {
  console.error("Erro ao criar bucket:", error.message);
  process.exit(1);
}
console.log(`✅ Bucket PRIVADO "${bucket}" criado (JPG/PNG/WEBP/PDF, máx 5MB).`);
