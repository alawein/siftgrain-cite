import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { webAnnotations } from "./annotation";
import { parsePacket } from "./packet";
import { sha256 } from "./hash";
test("JSON-LD all history carries exact selectors, plain bodies, raw hash target and self-reported creator", async () => {
  const packet = await parsePacket(readFileSync("examples/reviewed.json", "utf8"), sha256);
  const result = webAnnotations(packet);
  expect(result.items).toHaveLength(4);
  expect(result.items[0]).toMatchObject({
    type: "Annotation",
    motivation: "assessing",
    creator: { type: "Person", name: packet.reviews[0].reviewer },
    "cr:reviewer_identity_assurance": "self-reported",
    target: {
      type: "SpecificResource",
      source: { id: `urn:sha256:${packet.reviews[0].source_sha256}`, format: "text/plain" },
      selector: [packet.reviews[0].text_quote, packet.reviews[0].text_position],
    },
  });
  expect(result.items[0].body.map((body) => body.value)).toEqual([
    packet.claims[0].text,
    "supported",
    packet.reviews[0].rationale,
  ]);
  expect(JSON.parse(JSON.stringify(webAnnotations(packet)))).toEqual(result);
});
test("migrated unavailable stale passage cannot be fabricated into W3C export", async () => {
  const input = JSON.parse(readFileSync("examples/reviewed.json", "utf8"));
  input.reviews[0].source_sha256 = "b".repeat(64);
  const packet = await parsePacket(JSON.stringify(input), sha256);
  expect(packet.reviews[0].text_quote).toBeNull();
  expect(() => webAnnotations(packet)).toThrow("migrated stale history");
});
test("recorded stale selectors continue to refer to their original source hash", async () => {
  const packet = await parsePacket(readFileSync("examples/reviewed.json", "utf8"), sha256);
  packet.sources[0].text = "changed";
  packet.sources[0].sha256 = await sha256("changed");
  packet.sources[0].nfc_sha256 = packet.sources[0].sha256;
  const output = webAnnotations(packet);
  expect(output.items[0].target.source.id).toBe(`urn:sha256:${packet.reviews[0].source_sha256}`);
  expect(output.items[0].target.selector[0]).toEqual(packet.reviews[0].text_quote);
});
