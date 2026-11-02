import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "benchmarks/invariants.test.mjs"],
    maxWorkers: 3,
  },
});
