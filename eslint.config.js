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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
