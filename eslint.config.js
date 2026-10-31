import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "design-tokens/",
      "dist",
      "coverage",
      "node_modules",
      "test-results",
      "playwright-report",
      "src/generated/packet-validator.js",
      "benchmarks/artifacts",
      "benchmarks/downloads",
      ".lighthouseci",
      "scripts/publish-release.mjs",
      "scripts/upload-release.mjs",
      "scripts/verify-release-artifacts.mjs",
      "scripts/release-policy.mjs",
      "scripts/release-policy.test.mjs",
      "scripts/upload-release.test.mjs",
      "scripts/verify-release-artifacts.test.mjs",
      "scripts/npm-local-artifact.test.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
