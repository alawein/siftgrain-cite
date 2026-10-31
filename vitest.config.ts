import { configDefaults, defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "benchmarks/invariants.test.mjs"],
    exclude: [
      ...configDefaults.exclude,
      "scripts/release-policy.test.mjs",
      "scripts/upload-release.test.mjs",
      "scripts/verify-release-artifacts.test.mjs",
      "scripts/npm-local-artifact.test.mjs",
    ],
    maxWorkers: 3,
  },
});
