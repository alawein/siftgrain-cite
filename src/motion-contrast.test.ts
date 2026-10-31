import { expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { setupViewer } from "./viewer.js";
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

test("theme and pause work with only the retained viewer controls", () => {
  const theme = new EventTarget() as EventTarget & { value: string };
  const pause = new EventTarget() as EventTarget & {
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
  };
  const attributes = new Map<string, string>();
  pause.getAttribute = (name) => attributes.get(name) ?? null;
  pause.setAttribute = (name, value) => void attributes.set(name, value);
  const root = { dataset: { theme: "light" } as Record<string, string> };
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    getElementById: (id: string) => ({ theme, "motion-pause": pause })[id],
    getAnimations: () => [],
  });
  const stored = new Map<string, string>();
  vi.stubGlobal("document", document);
  vi.stubGlobal("matchMedia", () => Object.assign(new EventTarget(), { matches: false }));
  vi.stubGlobal("localStorage", {
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  try {
    setupViewer();
    expect(theme.value).toBe("light");
    theme.value = "dark";
    theme.dispatchEvent(new Event("change"));
    expect(root.dataset.theme).toBe("dark");
    expect(JSON.parse(stored.get("siftgrain-viewer")!)).toEqual({ theme: "dark" });
    pause.dispatchEvent(new Event("click"));
    expect(root.dataset.paused).toBe("true");
    expect(attributes.get("aria-pressed")).toBe("true");
    pause.dispatchEvent(new Event("click"));
    expect(root.dataset.paused).toBe("false");
  } finally {
    vi.unstubAllGlobals();
  }
});
