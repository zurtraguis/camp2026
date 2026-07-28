import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Testes de INTEGRAÇÃO — exigem um Postgres real (DATABASE_URL).
 *
 * Separados da suíte unitária porque tocam o banco: aqui é onde o dinheiro e a
 * máquina de estados são provados de verdade (transações, updateMany
 * condicional, concorrência), coisa que teste de função pura não alcança.
 *
 * Local:  docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=ci -e POSTGRES_USER=ci -e POSTGRES_DB=ci postgres:16
 *         DATABASE_URL="postgresql://ci:ci@localhost:5433/ci" npm run test:integration
 * CI:     serviço postgres no job (ver .github/workflows/ci.yml).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // `server-only` é guarda de BUILD e lança fora do bundler do Next. Aqui
      // importar o serviço direto é justamente o objetivo — a guarda continua
      // valendo no build de produção, que usa o pacote real.
      "server-only": path.resolve(root, "tests/integration/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    // Sequencial: os testes compartilham o mesmo banco e limpam entre si.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    passWithNoTests: false,
  },
});
