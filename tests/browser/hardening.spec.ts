import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const input = await readFile("examples/packet.json", "utf8");
async function load(page: import("@playwright/test").Page) {
  await page.getByLabel("Import packet").setInputFiles({
    name: "packet.json",
    mimeType: "application/json",
    buffer: Buffer.from(input),
  });
  await expect(page.locator("#status")).toContainText("Imported");
}
async function save(page: import("@playwright/test").Page) {
  await page.getByLabel("Span start").fill("0");
  await page.getByLabel("Span end").fill("44");
  await page.getByLabel("Rationale").fill("Reason");
  await page.getByLabel("Reviewer label").fill("Person");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.locator("#status")).toContainText("Saved");
}
test("draft is off by default, opt-in saves and explicit restore recovers history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { draftAccesses: 0 });
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      const original = Storage.prototype[method] as (
        this: Storage,
        key: string,
        value?: string,
      ) => unknown;
      Object.defineProperty(Storage.prototype, method, {
        value: function (this: Storage, key: string, value?: string) {
          if (key === "claim-review.draft.v1")
            (window as unknown as { draftAccesses: number }).draftAccesses++;
          return original.call(this, key, value!);
        },
      });
    }
  });
  await page.goto("./");
  await expect(page.getByLabel("Save draft on this device")).not.toBeChecked();
  await load(page);
  await save(page);
  expect(
    await page.evaluate(() => (window as unknown as { draftAccesses: number }).draftAccesses),
  ).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("claim-review.draft.v1"))).toBeNull();
  await page.getByLabel("Save draft on this device").check();
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(page.getByLabel("Save draft on this device")).not.toBeChecked();
  await page.getByRole("button", { name: "Restore saved draft" }).click();
  await expect(page.getByLabel("Review history")).toContainText("Person: Reason");
  await page.getByRole("button", { name: "Clear saved draft" }).click();
  expect(await page.evaluate(() => localStorage.getItem("claim-review.draft.v1"))).toBeNull();
});
test("unavailable storage preserves saving and native export", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    }),
  );
  await page.goto("./");
  await page.getByLabel("Save draft on this device").click();
  await expect(page.getByLabel("Save draft on this device")).not.toBeChecked();
  await expect(page.locator("#status")).toContainText("unavailable");
  await load(page);
  await save(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export packet", exact: true }).click();
  const file = await (await event).path();
  expect(JSON.parse(await readFile(file!, "utf8")).reviews).toHaveLength(1);
});
for (const [method, button] of [
  ["getItem", "Restore saved draft"],
  ["removeItem", "Clear saved draft"],
] as const) {
  test(`${method} failure disables draft saving until a fresh opt-in`, async ({ page }) => {
    await page.goto("./");
    await load(page);
    await save(page);
    const optIn = page.getByLabel("Save draft on this device");
    await optIn.check();
    const savedDraft = await page.evaluate(() => localStorage.getItem("claim-review.draft.v1"));
    expect(JSON.parse(savedDraft!).reviews).toHaveLength(1);
    await page.evaluate((method) => {
      const original = Object.getOwnPropertyDescriptor(Storage.prototype, method)!;
      Object.assign(window, {
        restoreDraftStorage: () => {
          Object.defineProperty(Storage.prototype, method, original);
        },
      });
      Storage.prototype[method] = () => {
        throw new DOMException("blocked", "SecurityError");
      };
    }, method);

    await page.getByRole("button", { name: button }).click();
    await expect(page.locator("#status")).toContainText("storage unavailable; current work kept");
    await expect(optIn).not.toBeChecked();
    await expect(page.getByLabel("Review history")).toContainText("Person: Reason");

    await page.evaluate(() =>
      (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage(),
    );
    await page.getByLabel("Rationale").fill("Second review after storage recovery");
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.locator("#status")).toContainText("Saved");
    expect(await page.evaluate(() => localStorage.getItem("claim-review.draft.v1"))).toBe(
      savedDraft,
    );
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export packet", exact: true }).click();
    const exported = JSON.parse(await readFile((await (await event).path())!, "utf8"));
    expect(exported.reviews.map((review: { rationale: string }) => review.rationale)).toEqual([
      "Reason",
      "Second review after storage recovery",
    ]);

    await optIn.check();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("claim-review.draft.v1")!)),
    ).toEqual(exported);
  });
}

test("standalone strict CSP blocks network and active imported text, exports W3C selectors", async ({
  page,
}) => {
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(policy).toContain("default-src 'none'");
  expect(policy).toContain("connect-src 'none'");
  const payload =
    '<script>globalThis.INJECTED=1</script><img src="https://example.invalid/a" onerror="globalThis.INJECTED=2"><a href="javascript:globalThis.INJECTED=3">click</a>';
  const packet = JSON.parse(input);
  packet.sources[0].text = payload;
  packet.sources[0].sha256 = createHash("sha256").update(payload).digest("hex");
  packet.claims[0].text = payload;
  await page.getByLabel("Import packet").setInputFiles({
    name: "inert.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(packet)),
  });
  await expect(page.locator("#status")).toContainText("Imported");
  await page.getByLabel("Span start").fill("0");
  await page.getByLabel("Span end").fill("8");
  await page.getByLabel("Rationale").fill(payload);
  await page.getByLabel("Reviewer label").fill("Person");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.locator("#status")).toContainText("Saved");
  expect(await page.evaluate(() => Object.hasOwn(globalThis, "INJECTED"))).toBe(false);
  expect(await page.locator("img, a[href^='javascript:']").count()).toBe(0);
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("https://example.invalid");
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export W3C JSON-LD" }).click();
  const exported = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(exported.items[0].target.selector).toEqual([
    { type: "TextQuoteSelector", exact: "<script>", prefix: "", suffix: payload.slice(8, 40) },
    { type: "TextPositionSelector", start: 0, end: 8 },
  ]);
  expect(exported.items[0].creator.name).toBe("Person");
});

test("invalid saved draft preserves the current exported packet", async ({ page }) => {
  await page.goto("./");
  await load(page);
  await save(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export packet", exact: true }).click();
  await event;
  await page.evaluate(() => localStorage.setItem("claim-review.draft.v1", '{"schema_version":99}'));
  await page.getByRole("button", { name: "Restore saved draft" }).click();
  await expect(page.locator("#status")).toContainText("current work kept");
  await expect(page.getByLabel("Review history")).toContainText("Person: Reason");
});
test("quota failure disables draft saving and keeps history plus the close guard", async ({
  page,
}) => {
  await page.goto("./");
  await load(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.getByLabel("Save draft on this device").click();
  await expect(page.getByLabel("Save draft on this device")).not.toBeChecked();
  await expect(page.locator("#status")).toContainText("unavailable");
  await save(page);
  let guards = 0;
  page.on("dialog", (dialog) => {
    guards++;
    void dialog.accept();
  });
  await page.reload();
  expect(guards).toBe(1);
});
