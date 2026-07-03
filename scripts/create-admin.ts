// Cria (ou atualiza) um admin REAL. Senha com hash PBKDF2.
// Uso: npx tsx scripts/create-admin.ts "email@dominio.com" "SuaSenhaForte" "Seu Nome"
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const [email, password, name = "Admin"] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: npx tsx scripts/create-admin.ts "email" "senha" "Nome"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("A senha deve ter ao menos 8 caracteres.");
  process.exit(1);
}

// main() async em vez de top-level await: o tsx compila este script para CJS
// (package.json sem "type": "module"), e CJS não suporta top-level await.
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, role: "ADMIN", passwordHash, emailVerified: new Date() },
    update: { name, role: "ADMIN", passwordHash },
  });
  console.log(`✅ Admin pronto: ${user.email} (role ${user.role})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
