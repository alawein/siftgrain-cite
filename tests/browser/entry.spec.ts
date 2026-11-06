import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("the skip link reaches visible content before and after loading a packet", async ({
  page,
}) => {
  await page.goto("./");
  const skip = page.locator(".skip");
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#entry")).toBeFocused();
  await page.getByRole("button", { name: "Load acceptance example", exact: true }).click();
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#review-form")).toBeFocused();
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`own evidence starts in the first viewport at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await expect(page.getByRole("button", { name: "New packet", exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByLabel("Import packet", { exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.locator("#review-workbench")).toHaveCount(1);
    await expect(page.locator("#review-workbench")).toBeHidden();
    await page.getByRole("button", { name: "New packet", exact: true }).click();
    const source = page.locator("#builder [name='source-text']");
    await expect(source).toBeFocused();
    await expect(source).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  });
}

test("a source and claim become a resumable human review without an example packet", async ({
  page,
}, info) => {
  await page.goto("./");
  await page.getByRole("button", { name: "New packet", exact: true }).click();
  const source = "The receipt reports success. The observed balance is 40; the target is 60.";
  const builder = page.locator("#builder");
  await builder.locator("[name='source-text']").fill(source);
  await builder.locator("[name='claim-text']").fill("The account reached the target balance.");
  await page.getByRole("button", { name: "Use packet", exact: true }).click();
  await expect(page.locator("#review-workbench")).toBeVisible();
  await expect(builder).toBeHidden();
  await expect(page.getByLabel("Claim", { exact: true })).toBeFocused();
  await page.getByLabel("Span start", { exact: true }).fill("0");
  await page.getByLabel("Span end", { exact: true }).fill(String(source.length));
  await page.getByLabel("Verdict", { exact: true }).selectOption("contradicted");
  await page
    .getByLabel("Rationale", { exact: true })
    .fill("The observed balance differs from the target.");
  await page.getByLabel("Reviewer label", { exact: true }).fill("Example reviewer");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export packet", exact: true }).click();
  const saved = info.outputPath("own-evidence-review.json");
  await (await pending).saveAs(saved);
  const original = JSON.parse(await readFile(saved, "utf8"));
  expect(original.sources[0].text).toBe(source);
  expect(original.reviews).toHaveLength(1);
  expect(original.reviews[0].verdict).toBe("contradicted");
  await page.reload();
  await expect(page.locator("#review-workbench")).toBeHidden();
  await page.getByLabel("Import packet", { exact: true }).setInputFiles(saved);
  await expect(page.locator("#review-workbench")).toBeVisible();
  await expect(page.locator("#history")).toContainText("Example reviewer");
  const reopened = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export packet", exact: true }).click();
  const roundtrip = info.outputPath("reopened-review.json");
  await (await reopened).saveAs(roundtrip);
  expect(JSON.parse(await readFile(roundtrip, "utf8"))).toEqual(original);
});

test("an invalid import preserves source and claim being prepared", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "New packet", exact: true }).click();
  const source = page.locator("#builder [name='source-text']");
  const claim = page.locator("#builder [name='claim-text']");
  await source.fill("Original source text");
  await claim.fill("Original claim");
  await page.getByLabel("Import packet", { exact: true }).setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(page.locator("#status")).toHaveAttribute("role", "alert");
  await expect(source).toHaveValue("Original source text");
  await expect(claim).toHaveValue("Original claim");
  await expect(page.locator("#review-workbench")).toHaveCount(1);
  await expect(page.locator("#review-workbench")).toBeHidden();
});
