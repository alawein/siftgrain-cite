import { chromium } from "@playwright/test";
import { uiFailureCount } from "./invariants.mjs";
import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
/* global PerformanceObserver, requestAnimationFrame */
import console from "node:console";
await mkdir("benchmarks/artifacts/ui", { recursive: true });
const browser = await chromium.launch();
const reports = [];
{
  const vibe = "calm";
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: "benchmarks/artifacts/ui", size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const state = { lcp: null, events: [] };
    globalThis.__measure = state;
    try {
      new PerformanceObserver((list) => {
        state.lcp = list.getEntries().at(-1).startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* unavailable */
    }
    try {
      new PerformanceObserver((list) =>
        state.events.push(...list.getEntries().map((e) => e.duration)),
      ).observe({ type: "event", durationThreshold: 16, buffered: true });
    } catch {
      /* unavailable */
    }
  });
  await page.route(/^https?:/, (r) => r.abort());
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await page.getByRole("button", { name: "Load acceptance example", exact: true }).click();
  const start = performance.now();
  let errors = 0;
  for (let i = 0; i < 4; i++) {
    const option = await page.locator("#claim option").nth(i).getAttribute("value");
    await page.locator("#claim").selectOption(option);
    await page.getByLabel("Span start").fill("0");
    await page.getByLabel("Span end").fill("10");
    await page
      .getByLabel("Rationale")
      .fill("Synthetic scripted throughput task; no semantic label.");
    await page.getByLabel("Reviewer label").fill("synthetic-script");
    await page.getByRole("button", { name: "Save review", exact: true }).click();
    if (!(await page.locator("#status").innerText()).includes("Saved")) errors++;
  }
  const elapsed = performance.now() - start;
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const d = [];
        let previous = performance.now();
        const start = previous;
        function frame(now) {
          d.push(now - previous);
          previous = now;
          if (now - start < 1500) requestAnimationFrame(frame);
          else resolve(d);
        }
        requestAnimationFrame(frame);
      }),
  );
  const measurement = await page.evaluate(() => globalThis.__measure);
  await page.screenshot({ path: `benchmarks/artifacts/ui/${vibe}.png`, fullPage: true });
  const video = page.video();
  await context.close();
  await video.saveAs(`benchmarks/artifacts/ui/${vibe}.webm`);
  const sorted = frames.slice(1).sort((a, b) => a - b);
  reports.push({
    vibe,
    viewport: "1280x900",
    file_lcp_ms: measurement.lcp,
    max_observed_event_ms: measurement.events.length ? Math.max(...measurement.events) : null,
    inp: null,
    inp_limit: "Short scripted session is not field INP",
    frame_p95_ms: sorted[Math.floor(sorted.length * 0.95)],
    mean_fps: 1000 / (sorted.reduce((a, b) => a + b, 0) / sorted.length),
    scripted_reviews: 4,
    errors,
    elapsed_ms: elapsed,
    reviews_per_minute: 240000 / elapsed,
  });
}
await browser.close();
const result = {
  cpu: cpus()[0].model,
  browser: "Playwright Chromium",
  runs: reports,
  limitations: [
    "No human throughput measurement",
    "FPS from requestAnimationFrame on this workstation, not certification on a midrange laptop",
    "LCP API may be unavailable for local files",
    "INP requires representative long-lived user interactions, max event is only a laboratory observation",
  ],
};
await writeFile("benchmarks/artifacts/ui/results.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (uiFailureCount(reports) > 0) process.exitCode = 1;
