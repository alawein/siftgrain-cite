import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
const tokens = readFileSync("src/tokens.css", "utf8");
const rgb = (hex: string) =>
  hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16));
const luminance = (rgb: number[]) =>
  rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
test.each(["dark", "light"])("stale animation-start text retains AA contrast in %s", (theme) => {
  const css = readFileSync("src/style.css", "utf8");
  const start = css.match(/@keyframes stale-arrive\s*\{\s*from\s*\{([^}]*)\}/)![1];
  const opacity = Number(start.match(/opacity:\s*([0-9.]+)/)?.[1] ?? 1);
  const block =
    theme === "dark" ? /:root\s*\{([^}]+)\}/ : /\[data-appearance="light"\]\s*\{([^}]+)\}/;
  const declarations = tokens.match(block)![1];
  const ink = rgb(declarations.match(/--ink:\s*(#[\da-f]{6});/i)![1]),
    background = rgb(declarations.match(/--surface:\s*(#[\da-f]{6});/i)![1]);
  const composed = ink.map((value, i) => value * opacity + background[i] * (1 - opacity));
  const a = luminance(composed),
    b = luminance(background);
  expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
});
