import { integrityFailures, validateStressKeys } from "./invariants.mjs";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { cpus, platform, release } from "node:os";
import { Buffer } from "node:buffer";
import process from "node:process";
import console from "node:console";
const compiled = await build({
  stdin: {
    contents:
      'export * from "./src/core/packet";export * from "./src/core/spans";export * from "./src/core/reviews";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const core = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const hash = async (s) => createHash("sha256").update(s).digest("hex");
const results = [];
for (const split of ["dev", "test"]) {
  const rows = JSON.parse(await readFile(`benchmarks/v1/${split}/stress.json`, "utf8"));
  const keys = JSON.parse(await readFile(`benchmarks/v1/answer-keys/${split}.json`, "utf8"));
  validateStressKeys(rows, keys);
  let correct = 0,
    naive = 0,
    stale = 0,
    normalization = 0,
    rejected = 0;
  const timings = [];
  for (let repeat = 0; repeat < 30; repeat++) {
    const start = performance.now();
    for (const [i, r] of rows.entries()) {
      const a = core.toUtf16Offset(r.text, r.start_codepoint),
        b = core.toUtf16Offset(r.text, r.end_codepoint);
      if (repeat === 0) {
        correct += Number(
          a === keys[i].start_utf16 &&
            b === keys[i].end_utf16 &&
            core.toCodePointOffset(r.text, b) === r.end_codepoint,
        );
        naive += Number(r.end_codepoint === keys[i].end_utf16);
      }
      const packet = await core.parsePacket(
        JSON.stringify({
          schema_version: 1,
          sources: [{ id: "s", title: "Stress", text: r.text, sha256: await hash(r.text) }],
          claims: [{ id: "c", text: "Synthetic integrity task", citation_ids: ["s"] }],
          reviews: [],
        }),
        hash,
      );
      const reviewed = core.appendReview(packet, {
        id: "r",
        claim_id: "c",
        source_id: "s",
        source_sha256: packet.sources[0].sha256,
        start: a,
        end: b,
        verdict: "unverifiable",
        rationale: "Synthetic stress case, no attribution label",
        reviewer: "synthetic-script",
      });
      const changed = globalThis.structuredClone(reviewed);
      changed.sources[0].text += " changed";
      changed.sources[0].sha256 = await hash(changed.sources[0].text);
      changed.sources[0].nfc_sha256 = await hash(changed.sources[0].text.normalize("NFC"));
      const parsed = await core.parsePacket(JSON.stringify(changed), hash);
      if (repeat === 0) stale += Number(core.reviewState(parsed, parsed.reviews[0]) === "stale");
      if (r.text.normalize("NFC") !== r.text) {
        const norm = globalThis.structuredClone(reviewed);
        norm.sources[0].text = r.text.normalize("NFC");
        norm.sources[0].sha256 = await hash(norm.sources[0].text);
        const p = await core.parsePacket(JSON.stringify(norm), hash);
        if (repeat === 0)
          normalization += Number(core.reviewState(p, p.reviews[0]) === "normalization-only stale");
      }
      const corrupt = globalThis.structuredClone(reviewed);
      corrupt.sources[0].text += " tampered";
      try {
        await core.parsePacket(JSON.stringify(corrupt), hash);
      } catch {
        if (repeat === 0) rejected++;
      }
    }
    timings.push(performance.now() - start);
  }
  timings.sort((a, b) => a - b);
  results.push({
    split,
    cases: rows.length,
    span_correct: correct,
    naive_codepoint_as_utf16_correct: naive,
    stale_detected: stale,
    normalization_only_detected: normalization,
    tampering_rejected: rejected,
    iterations: 30,
    p50_ms: timings[15],
    p95_ms: timings[28],
  });
}
const external = [];
for (const split of ["dev", "test"]) {
  const p = await core.parsePacket(
    await readFile(`benchmarks/artifacts/${split}/alce-packet.json`, "utf8"),
    hash,
  );
  const keys = JSON.parse(
    await readFile(`benchmarks/artifacts/answer-keys/${split}-alce.json`, "utf8"),
  );
  external.push({
    split,
    claims: p.claims.length,
    sources: p.sources.length,
    external_gold_items: keys.length,
    labels_preserved: keys.filter((k) => typeof k.original_alce_citation_label === "number").length,
    semantic_accuracy: null,
  });
}
const output = {
  schema_version: 1,
  access_date: "2026-10-13",
  environment: {
    node: process.version,
    os: platform() + " " + release(),
    cpu: cpus()[0].model,
    memory_bytes: process.memoryUsage().rss,
  },
  stress: results,
  external,
  limitations: [
    "Synthetic integrity gold is not attribution truth.",
    "External labels are preserved, not predicted. No model or human judge was run.",
    "Timing quantiles are descriptive 30 repetitions, not population confidence intervals.",
  ],
};
await mkdir("benchmarks/artifacts", { recursive: true });
await writeFile("benchmarks/artifacts/results.json", JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify(output, null, 2));
if (
  integrityFailures(results).length ||
  external.some(
    (r) => r.labels_preserved !== r.external_gold_items || r.sources !== r.external_gold_items,
  )
)
  process.exitCode = 1;
