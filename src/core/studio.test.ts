import { expect, test } from "vitest";
import { agreement, mergePackets } from "./coordination";
import { importTrace, labelExport, csvExport } from "./adapters";
import { parsePacket } from "./packet";
import { sha256 } from "./hash";
import { readFileSync } from "node:fs";
const fixture = () => parsePacket(readFileSync("examples/reviewed.json", "utf8"), sha256);
test("merge rejects changed population and ID collisions; preserves distinct reviewer histories", async () => {
  const a = await fixture();
  const b = structuredClone(a);
  b.reviews = b.reviews.map((r) => ({ ...r, id: `b-${r.id}`, reviewer: "B" }));
  expect(mergePackets(a, b).reviews).toHaveLength(8);
  expect(mergePackets(a, a)).toEqual(a);
  b.claims[0].text = "changed";
  expect(() => mergePackets(a, b)).toThrow("population");
  const c = structuredClone(a);
  c.reviews[0].rationale = "changed";
  expect(() => mergePackets(a, c)).toThrow("collision");
});
test("agreement uses latest per reviewer, excludes stale, reports undefined and missing honestly", async () => {
  const p = await fixture();
  const b = p.reviews.map((r) => ({ ...r, id: `b-${r.id}`, reviewer: "B" }));
  p.reviews.push(...b);
  const result = agreement(p);
  expect(result.cohen_kappa).toBe(1);
  expect(result.fleiss_kappa).toBe(1);
  expect(result.krippendorff_alpha).toBe(1);
  expect(result.complete_items).toBe(4);
  expect(agreement({ ...p, reviews: [] }).cohen_kappa).toBeNull();
  p.reviews.push({ ...b[0], id: "revision", verdict: "contradicted" });
  expect(agreement(p).cohen_kappa).toBeLessThan(1);
  p.reviews[0].source_sha256 = "a".repeat(64);
  expect(agreement(p).excluded_stale).toBe(1);
});
test("JSONL and LangSmith envelopes preserve literal text and reject partial malformed imports", async () => {
  const row = {
    id: "run1",
    outputs: { answer: "literal <img>" },
    inputs: { documents: [{ page_content: "A😀\r\né", metadata: { title: "Source" } }] },
  };
  const p = await importTrace(JSON.stringify({ runs: [row] }), sha256);
  expect(p.sources[0].text).toBe("A😀\r\né");
  expect(p.claims[0].text).toBe("literal <img>");
  expect(
    await importTrace(JSON.stringify(row) + "\n" + JSON.stringify({ ...row, id: "run2" }), sha256),
  ).toMatchObject({ claims: expect.any(Array) });
  await expect(importTrace(JSON.stringify(row) + "\n{}", sha256)).rejects.toThrow();
  await expect(
    importTrace(JSON.stringify({ ...row, outputs: { answer: 123 } }), sha256),
  ).rejects.toThrow();
});
test("label adapters retain identities and never manufacture AIS interpretability or stale attribution", async () => {
  const p = await fixture();
  expect(labelExport(p, "ais").items[0].interpretability).toBeNull();
  p.reviews[0].source_sha256 = "a".repeat(64);
  expect(labelExport(p, "alce").items[0].attribution).toBeNull();
  p.reviews[0].reviewer = '=cmd,"test"';
  expect(csvExport(p)).toContain("'=cmd");
  p.reviews[0].reviewer = "  =cmd";
  expect(csvExport(p)).toContain("'  =cmd");
});
test("nontrivial nominal agreement matches hand-computed coincidence values", async () => {
  const p = await fixture();
  const a = ["supported", "supported", "supported", "contradicted"] as const;
  const b = ["supported", "supported", "contradicted", "contradicted"] as const;
  const rows = p.reviews.slice(0, 4);
  p.reviews = rows.flatMap((r, i) => [
    { ...r, id: `a${i}`, reviewer: "A", verdict: a[i] },
    { ...r, id: `b${i}`, reviewer: "B", verdict: b[i] },
  ]);
  expect(agreement(p).cohen_kappa).toBeCloseTo(0.5);
  expect(agreement(p).fleiss_kappa).toBeCloseTo(7 / 15);
  expect(agreement(p).krippendorff_alpha).toBeCloseTo(8 / 15);
  const q = await fixture();
  q.claims = q.claims.slice(0, 3);
  q.reviews = rows.slice(0, 3).flatMap((r, i) =>
    ["A", "B", "C"].flatMap((reviewer, j) =>
      i === 1 && j === 2
        ? []
        : [
            {
              ...r,
              id: `${reviewer}${i}`,
              reviewer,
              verdict: (i === 0 || (i === 1 && j === 0)
                ? "supported"
                : "contradicted") as typeof r.verdict,
            },
          ],
    ),
  );
  expect(agreement(q).missing_ratings).toBe(1);
  expect(agreement(q).krippendorff_alpha).toBeCloseTo(0.5625);
});
test("RetrievalQA output result/source_documents imports and conflicting aliases reject", async () => {
  const p = await importTrace(
    JSON.stringify({
      outputs: { result: "Answer", source_documents: [{ page_content: "Evidence" }] },
    }),
    sha256,
  );
  expect(p.claims[0].text).toBe("Answer");
  await expect(
    importTrace(JSON.stringify({ answer: "A", result: "B", documents: ["Source"] }), sha256),
  ).rejects.toThrow("exactly one alias");
  await expect(
    importTrace(JSON.stringify({ answer: "A", documents: ["Source"], context: ["Other"] }), sha256),
  ).rejects.toThrow("exactly one alias");
});
test("precompiled published browser schema rejects malformed structure without runtime code generation", async () => {
  const validator = await import("../generated/packet-validator.js");
  const p = await fixture();
  expect(validator.default(p)).toBe(true);
  expect(validator.default({ ...p, unexpected: "field" })).toBe(false);
  const code = readFileSync("src/generated/packet-validator.js", "utf8");
  expect(code).not.toMatch(/new Function|eval\(/);
  await expect(
    parsePacket(JSON.stringify({ ...p, unexpected: "field" }), sha256),
  ).rejects.toThrow();
});
test("sparse agreement retains full missing denominator with many unreviewed pairs", async () => {
  const p = await fixture();
  const original = p.reviews[0];
  p.claims = Array.from({ length: 1000 }, (_, i) => ({ ...p.claims[0], id: `c${i}` }));
  p.reviews = Array.from({ length: 100 }, (_, i) => ({
    ...original,
    id: `r${i}`,
    claim_id: `c${i}`,
    reviewer: `R${i}`,
  }));
  const result = agreement(p);
  expect(result.total_items).toBe(1000);
  expect(result.missing_ratings).toBe(99900);
  expect(result.complete_items).toBe(0);
  expect(result.krippendorff_alpha).toBeNull();
});
test("browser schema validation bounds diagnostic amplification on malformed collections", async () => {
  const { default: validate } = await import("../generated/packet-validator.js");
  expect(
    validate({
      schema_version: 1,
      sources: Array.from({ length: 100 }, () => ({})),
      claims: [],
      reviews: [],
    }),
  ).toBe(false);
  expect(validate.errors!.length).toBeLessThanOrEqual(8);
});
