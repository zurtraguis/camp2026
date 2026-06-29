import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Falha se não houver testes — evita suíte vazia passando silenciosamente.
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/generated/**",
        "src/**/*.d.ts",
      ],
      // Suba conforme o projeto cresce (recomendado: lines>=70, branches>=60).
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
    },
  },
});
