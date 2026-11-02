import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

function luminance(hex: string) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

test.each([
  {
    theme: "dark",
    block: /:root\s*\{([^}]+)\}/,
    brand: {
      bg: "#100c1c",
      surface: "#211a31",
      ink: "#f5eedf",
      accent: "#ffc46b",
      focus: "#72f0d4",
    },
  },
  {
    theme: "light",
    block: /\[data-theme="light"\],\s*\[data-appearance="light"\]\s*\{([^}]+)\}/,
    brand: { bg: "#f4f2f7", ink: "#1a1326", accent: "#2b2877", focus: "#2b2877" },
  },
])("$theme theme preserves brand colors and AA contrast", ({ block, brand }) => {
  const css = readFileSync("src/tokens.css", "utf8");
  const declarations = css.match(block)![1];
  const colors = Object.fromEntries(
    Array.from(declarations.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi), ([, name, hex]) => [
      name,
      hex.toLowerCase(),
    ]),
  );
  expect(colors).toMatchObject(brand);

  function checkContrast(first: string, second: string, minimum: number) {
    const a = luminance(colors[first]);
    const b = luminance(colors[second]);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    expect(ratio, `${first}/${second}`).toBeGreaterThanOrEqual(minimum);
  }

  for (const background of ["bg", "surface"]) {
    for (const text of ["ink", "muted", "pass", "fail", "pending"]) {
      checkContrast(background, text, 4.5);
    }
  }
  checkContrast("accent", "on-accent", 4.5);
  checkContrast("surface", "line", 3);
});
