import { expect, test } from "vitest";
import { parsePacket, type LegacyReview as Review, enrichReview } from "./packet";
import { sha256 } from "./hash";
import { validSpan, sourceOffset } from "./spans";
import { appendReview, latestReviews, reviewState } from "./reviews";

const digest = "a".repeat(64);
const hash = async () => digest;
function specimen() {
  return {
    schema_version: 1,
    sources: [{ id: "s", title: "Synthetic", text: "A😀 دليل", sha256: digest }],
    claims: [{ id: "c", text: "Synthetic claim", citation_ids: ["s"] }],
    reviews: [],
  };
}
function review(): Review {
  return {
    id: "r",
    claim_id: "c",
    source_id: "s",
    source_sha256: digest,
    start: 1,
    end: 3,
    verdict: "partial",
    rationale: "Synthetic rationale",
    reviewer: "Synthetic",
  };
}
test("real UTF8 SHA256 known vector", async () => {
  expect(await sha256("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("emoji boundary and Arabic exact text", () => {
  expect(validSpan("A😀 دليل", 1, 2)).toBe(false);
  expect(validSpan("A😀 دليل", 1, 3)).toBe(true);
  expect("A😀 دليل".slice(4, 8)).toBe("دليل");
});
test("stale history retained; latest current review appended", async () => {
  const p = await parsePacket(JSON.stringify(specimen()), hash);
  const old = review();
  old.source_sha256 = "b".repeat(64);
  p.reviews.push(enrichReview(p, old));
  expect(reviewState(p, old)).toBe("stale");
  const next = appendReview(p, { ...review(), id: "new" });
  expect(next.reviews).toHaveLength(2);
  expect(p.reviews).toHaveLength(1);
  expect(latestReviews(next).map((r) => r.id)).toEqual(["new"]);
});
test.each(["supported", "partial", "contradicted", "unverifiable"] as const)(
  "all verdicts %s",
  async (verdict) => {
    const p = await parsePacket(JSON.stringify(specimen()), hash);
    const next = appendReview(p, { ...review(), verdict });
    expect(await parsePacket(JSON.stringify(next), hash)).toEqual(next);
  },
);
test.each([
  "verdict",
  "extra",
  "boolean-offset",
  "fractional-offset",
  "negative",
  "split-emoji",
  "empty-span",
  "too-long",
  "empty-rationale",
  "empty-reviewer",
  "unknown-claim",
  "uncited",
  "stale",
])("direct API rejects %s", async (kind) => {
  const p = await parsePacket(JSON.stringify(specimen()), hash);
  const r: Record<string, unknown> = { ...review() };
  if (kind === "verdict") r.verdict = "invented";
  if (kind === "extra") r.extra = 1;
  if (kind === "boolean-offset") r.start = true;
  if (kind === "fractional-offset") r.start = 1.5;
  if (kind === "negative") r.start = -1;
  if (kind === "split-emoji") r.end = 2;
  if (kind === "empty-span") r.end = 1;
  if (kind === "too-long") r.end = 100001;
  if (kind === "empty-rationale") r.rationale = " ";
  if (kind === "empty-reviewer") r.reviewer = "";
  if (kind === "unknown-claim") r.claim_id = "other";
  if (kind === "uncited") p.claims[0].citation_ids = [];
  if (kind === "stale") r.source_sha256 = "b".repeat(64);
  expect(() => appendReview(p, r as unknown as Review)).toThrow();
  expect(p.reviews).toHaveLength(0);
});
test.each([
  "hash",
  "duplicate-source",
  "duplicate-claim",
  "unknown-citation",
  "unicode",
  "extra",
  "count",
  "title-type",
  "empty-claim",
  "duplicate-citation",
])("invalid import %s", async (kind) => {
  const p = specimen();
  if (kind === "hash") p.sources[0].sha256 = "b".repeat(64);
  if (kind === "duplicate-source") p.sources.push(p.sources[0]);
  if (kind === "duplicate-claim") p.claims.push(p.claims[0]);
  if (kind === "unknown-citation") p.claims[0].citation_ids = ["other"];
  if (kind === "unicode") p.sources[0].text = "\ud800";
  if (kind === "extra") Object.assign(p, { extra: 1 });
  if (kind === "count") p.sources = Array.from({ length: 101 }, () => p.sources[0]);
  if (kind === "title-type") Object.assign(p.sources[0], { title: true });
  if (kind === "empty-claim") p.claims[0].text = "";
  if (kind === "duplicate-citation") p.claims[0].citation_ids = ["s", "s"];
  await expect(parsePacket(JSON.stringify(p), hash)).rejects.toThrow();
});
test("BOM and byte limit rejected", async () => {
  await expect(parsePacket("\uFEFF{}", hash)).rejects.toThrow("BOM");
  await expect(parsePacket(" ".repeat(5 * 1024 * 1024 + 1), hash)).rejects.toThrow("5 MiB");
});
test("duplicate review ID rejected", async () => {
  const p = await parsePacket(JSON.stringify(specimen()), hash);
  expect(() => appendReview(appendReview(p, review()), review())).toThrow("duplicate");
});

test.each([
  ["first\r\nSECOND", 6, 7],
  ["first\r\nSECOND", 12, 13],
  ["a\rb", 2, 2],
  ["😀\r\nb", 3, 4],
] as const)("displayed CRLF offsets map to original source", (text, offset, expected) => {
  expect(sourceOffset(text, offset)).toBe(expected);
});
