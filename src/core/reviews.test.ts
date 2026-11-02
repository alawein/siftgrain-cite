import { expect, test } from "vitest";
import packetInput from "../../examples/packet.json";
import reviewedInput from "../../examples/reviewed.json";
import { sha256 } from "./hash";
import { parsePacket, type LegacyReview } from "./packet";
import { appendReview, reviewState } from "./reviews";

async function packetWithText(text: string) {
  const input = structuredClone(packetInput);
  input.sources[0].text = text;
  input.sources[0].sha256 = await sha256(text);
  return parsePacket(JSON.stringify(input), sha256);
}

test.each([
  ["Cafe\u0301", "valid"],
  ["Caf\u00e9", "normalization-only stale"],
  ["Changed passage", "stale"],
])("review of decomposed text against %s is %s", async (text, state) => {
  const original = await packetWithText("Cafe\u0301");
  const reviewed = appendReview(original, {
    ...reviewedInput.reviews[0],
    source_sha256: original.sources[0].sha256,
    end: 5,
    verdict: "supported",
  });
  const current = await packetWithText(text);
  current.reviews = reviewed.reviews;

  expect(reviewState(current, current.reviews[0])).toBe(state);
  expect(current.reviews[0].text_quote?.exact).toBe("Cafe\u0301");
});

test.each([
  [2, 3],
  [1, 2],
])("append rejects surrogate-splitting span %i..%i", async (start, end) => {
  const packet = await packetWithText("A😀Z");
  const review: LegacyReview = {
    ...reviewedInput.reviews[0],
    source_sha256: packet.sources[0].sha256,
    start: 1,
    end: 3,
    verdict: "supported",
  };

  expect(appendReview(packet, review).reviews[0].text_quote?.exact).toBe("😀");
  expect(() => appendReview(packet, { ...review, start, end })).toThrow("span");
  expect(packet.reviews).toEqual([]);
});
