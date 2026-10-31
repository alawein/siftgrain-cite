import { expect, test } from "@playwright/test";

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
