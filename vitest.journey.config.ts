import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/journey/**/*.test.mjs"],
    exclude: ["node_modules/**"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 30_000,
    passWithNoTests: false,
  },
});
