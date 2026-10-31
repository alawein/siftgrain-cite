import { expect, test } from "vitest";
import packetInput from "../../examples/packet.json";
import reviewedInput from "../../examples/reviewed.json";
import { mergePackets } from "./coordination";
import { sha256 } from "./hash";
import { parsePacket } from "./packet";

test("merge retains conflicting reviewer records in append order", async () => {
  const left = await parsePacket(JSON.stringify(reviewedInput), sha256);
  const right = await parsePacket(JSON.stringify(packetInput), sha256);
  const conflict = {
    ...left.reviews[0],
    id: "conflicting-review",
    reviewer: "Second reviewer",
    verdict: "contradicted" as const,
    rationale: "A conflicting human judgment.",
  };
  right.reviews = [conflict];

  expect(mergePackets(left, right).reviews).toEqual([...left.reviews, conflict]);
  expect(mergePackets(right, left).reviews).toEqual([conflict, ...left.reviews]);
  expect(left.reviews).toHaveLength(4);
  expect(right.reviews).toEqual([conflict]);
});

test("merge rejects changed same-ID source text even with a matching new hash", async () => {
  const left = await parsePacket(JSON.stringify(reviewedInput), sha256);
  const changed = structuredClone(packetInput);
  changed.sources[0].text += " Revised.";
  changed.sources[0].sha256 = await sha256(changed.sources[0].text);
  const right = await parsePacket(JSON.stringify(changed), sha256);

  expect(() => mergePackets(left, right)).toThrow("merge population mismatch");
});
