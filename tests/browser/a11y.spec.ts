import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabTo(page: Page, control: Locator): Promise<void> {
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  const focus = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow !== "none",
    };
  });
  expect(focus.outline || focus.shadow, "The focused control has a visible focus ring").toBe(true);
}

for (const theme of ["dark", "light"]) {
  test(`keyboard review order and focus rings in ${theme}`, async ({ page }) => {
    await page.goto("./");
    await page.getByLabel("Appearance").selectOption(theme);
    await page.reload();
    await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
    for (const selector of [
      ".skip",
      ".suite-home",
      ".suite-nav a[href$='siftgrain-audit/']",
      ".suite-nav a[href$='siftgrain-state/']",
      ".suite-nav [aria-current='page']",
      ".suite-nav a[href$='docs/guide.md']",
      "#builder-toggle",
      "#import",
      "#theme",
      "#motion-pause",
      "#draft-save",
      "#draft-restore",
      "#draft-clear",
      "#trace-import",
      "#merge-import",
      "#example",
      "#acceptance-example",
    ]) {
      await tabTo(page, page.locator(selector));
    }
    await page.keyboard.press("Enter");
    await expect(page.locator("#status")).toContainText("unreviewed");
    await expect(page.locator("#claim")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#next-item")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#previous-item")).toBeFocused();
    await page.locator("#claim").focus();
    for (const selector of [
      "#citation",
      "#source-text",
      "#selection",
      "#start",
      "#end",
      "#verdict",
      "#rationale",
      "#reviewer",
      '#review-form button[type="submit"]',
      "#export",
      "#other-exports > summary",
    ]) {
      await tabTo(page, page.locator(selector));
    }
  });
}

test("queue shortcuts move both ways and update the polite status", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Load acceptance example", exact: true }).press("Enter");
  const status = page.locator("#status");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toContainText("unreviewed");
  const importedStatus = await status.textContent();
  await page.keyboard.press("Alt+j");
  await expect(page.locator("#claim")).toHaveValue("refund-contradicted");
  await expect(page.locator("#citation")).toHaveValue("refund-record-1042");
  await expect(page.locator("#claim")).toBeFocused();
  await expect(status).not.toHaveText(importedStatus ?? "");
  await expect(status).toContainText(/\S/);
  const nextStatus = await status.textContent();
  await page.keyboard.press("Alt+k");
  await expect(page.locator("#claim")).toHaveValue("refund-confirmed");
  await expect(page.locator("#claim")).toBeFocused();
  await expect(status).not.toHaveText(nextStatus ?? "");
  await expect(status).toContainText(/\S/);
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-live", "polite");
});

for (const theme of ["dark", "light"]) {
  for (const width of [1280, 390]) {
    test(`axe has no violations in ${theme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("./");
      await page.getByLabel("Appearance").selectOption(theme);
      await page
        .getByRole("button", { name: "Load acceptance example", exact: true })
        .press("Enter");
      await expect(page.locator("#status")).toContainText("unreviewed");
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
    });
  }
}

test("reduced motion prevents CSS animations throughout the main panel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await page.getByRole("button", { name: "Load acceptance example", exact: true }).press("Enter");
  await expect(page.locator("#status")).toContainText("unreviewed");
  await page.getByLabel("Span end").fill("17");
  await expect(page.locator("#excerpt")).toContainText("Refund case 1042.");
  const animations = await page.locator("main").evaluate((main) => {
    const elements = [main, ...Array.from(main.querySelectorAll("*"))];
    return {
      names: elements.flatMap((element) =>
        [null, "::before", "::after"].map(
          (pseudo) => getComputedStyle(element, pseudo).animationName,
        ),
      ),
      running: main
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation instanceof CSSAnimation && animation.playState === "running",
        ).length,
    };
  });
  expect(animations.names.every((name) => name === "none")).toBe(true);
  expect(animations.running).toBe(0);
});
