import { expect, test } from "vitest";
import { parsePacket } from "./packet";
import { sha256 } from "./hash";
import { appendReview, reviewState } from "./reviews";

async function legacy(text = "A😀漢𝒜e\u0301\r\nZ") {
  return {
    schema_version: 1,
    sources: [{ id: "s", title: "Source", text, sha256: await sha256(text) }],
    claims: [{ id: "c", text: "Claim", citation_ids: ["s"] }],
    reviews: [],
  };
}
test("v0.2 migration enriches exact and NFC identity without altering source bytes", async () => {
  const input = await legacy();
  const packet = await parsePacket(JSON.stringify(input), sha256);
  expect(packet.schema_version).toBe(2);
  expect(packet.sources[0]).toMatchObject({
    text: input.sources[0].text,
    nfc_sha256: await sha256(input.sources[0].text.normalize("NFC")),
  });
});
test("saved judgment has exact quote, code point positions and self-reported assurance", async () => {
  const packet = await parsePacket(JSON.stringify(await legacy()), sha256);
  const result = appendReview(packet, {
    id: "r",
    claim_id: "c",
    source_id: "s",
    source_sha256: packet.sources[0].sha256,
    start: 1,
    end: 6,
    verdict: "partial",
    rationale: "Limited",
    reviewer: "Person",
  });
  expect(result.reviews[0]).toMatchObject({
    reviewer_identity_assurance: "self-reported",
    text_quote: { type: "TextQuoteSelector", exact: "😀漢𝒜", prefix: "A", suffix: "e\u0301\r\nZ" },
    text_position: { type: "TextPositionSelector", start: 1, end: 4 },
  });
});
test("normalization-only changed source stays stale with distinct state", async () => {
  const old = await parsePacket(JSON.stringify(await legacy("Cafe\u0301")), sha256);
  const reviewed = appendReview(old, {
    id: "r",
    claim_id: "c",
    source_id: "s",
    source_sha256: old.sources[0].sha256,
    start: 0,
    end: 5,
    verdict: "supported",
    rationale: "Same",
    reviewer: "Person",
  });
  const next = await parsePacket(JSON.stringify(await legacy("Café")), sha256);
  next.reviews = reviewed.reviews;
  expect(reviewState(next, next.reviews[0])).toBe("normalization-only stale");
});

test("legacy migration refuses an enriched export over the byte bound", async () => {
  const text = "x".repeat(100000);
  const source = await legacy(text);
  const reviews = Array.from({ length: 60 }, (_, i) => ({
    id: `r${i}`,
    claim_id: "c",
    source_id: "s",
    source_sha256: source.sources[0].sha256,
    start: 0,
    end: text.length,
    verdict: "partial",
    rationale: "R",
    reviewer: "P",
  }));
  const raw = JSON.stringify({ ...source, reviews });
  expect(new TextEncoder().encode(raw).byteLength).toBeLessThan(5 * 1024 * 1024);
  await expect(parsePacket(raw, sha256)).rejects.toThrow("5 MiB");
});
