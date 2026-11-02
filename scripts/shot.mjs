import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const target = pathToFileURL(resolve("dist/index.html")).href;
const fixture = resolve("examples/acceptance.json");
const packet = JSON.parse(await readFile(fixture, "utf8"));
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  for (const [width, height, filename] of [
    [1440, 1000, "app.png"],
    [390, 844, "acceptance-390.png"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(target);
    await page.getByLabel("Import packet", { exact: true }).setInputFiles(fixture);
    await expect(page.locator("#status")).toContainText("Imported");
    await expect(page.locator("#status")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("#packet-summary")).toHaveText(
      "4 claims, 1 sources, 0 review records.",
    );
    await expect(page.locator("#claim option")).toHaveCount(4);
    await expect(page.locator("#claim-text")).toHaveText(packet.claims[0].text);
    await expect(page.getByLabel("Source text", { exact: true })).toHaveValue(
      packet.sources[0].text,
    );
    await expect(page.locator("#review-state")).toContainText("Unreviewed");
    await expect(page.locator("#queue-state")).toContainText("0 of 4 citation pairs");
    await page.getByRole("button", { name: "Pause motion", exact: true }).click();
    await page.evaluate(() => globalThis.document.fonts.ready);
    const documentWidth = await page.evaluate(
      () => globalThis.document.documentElement.scrollWidth,
    );
    expect(documentWidth).toBe(width);
    const source = await page.locator("#source-panel").boundingBox();
    const judgment = await page.locator("#judgment-panel").boundingBox();
    if (width === 1440) {
      expect(Math.abs(source.y - judgment.y)).toBeLessThan(2);
      expect(source.x + source.width).toBeLessThanOrEqual(judgment.x);
    } else {
      expect(source.y + source.height).toBeLessThanOrEqual(judgment.y);
    }
    expect(errors).toEqual([]);
    const path = `docs/screenshots/${filename}`;
    await page.screenshot({ path, fullPage: true, animations: "disabled" });
    globalThis.console.log(
      `${path}: ${width}px, four unreviewed synthetic claims, no overflow or errors`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
