import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { expect, test } from "vitest";
import { parsePacket } from "./packet";
import { sha256 } from "./hash";
const schema = JSON.parse(readFileSync("schema/claim-review-packet.v1.json", "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
async function both(raw: string) {
  if (!validate(JSON.parse(raw))) throw new Error("schema validation failed");
  return parsePacket(raw, sha256);
}
test.each(["packet", "reviewed"])(
  "published schema and parser accept legacy fixture %s and migrated export",
  async (name) => {
    const raw = readFileSync(`examples/${name}.json`, "utf8");
    const packet = await parsePacket(raw, sha256);
    expect(await both(raw)).toEqual(packet);
    expect(await both(JSON.stringify(packet))).toEqual(packet);
  },
);
test.each([
  "version",
  "extra",
  "offset-type",
  "selector",
  "assurance",
  "nfc",
  "unicode",
  "duplicate",
  "reference",
  "hash",
  "split",
])("schema plus semantic validator and parser both reject %s", async (kind) => {
  const packet = await parsePacket(readFileSync("examples/reviewed.json", "utf8"), sha256);
  const value = JSON.parse(JSON.stringify(packet));
  if (kind === "version") value.schema_version = 99;
  if (kind === "extra") value.extra = 1;
  if (kind === "offset-type") value.reviews[0].start = true;
  if (kind === "selector") value.reviews[0].text_quote.exact = "wrong";
  if (kind === "assurance") value.reviews[0].reviewer_identity_assurance = "verified";
  if (kind === "nfc") value.sources[0].nfc_sha256 = "a".repeat(64);
  if (kind === "unicode") value.sources[0].text = "\ud800";
  if (kind === "duplicate") value.reviews.push(value.reviews[0]);
  if (kind === "reference") value.claims[0].citation_ids = ["missing"];
  if (kind === "hash") value.sources[0].sha256 = "a".repeat(64);
  if (kind === "split") {
    value.sources[0].text = "😀";
    value.sources[0].sha256 = await sha256("😀");
    value.sources[0].nfc_sha256 = await sha256("😀");
    value.reviews[0].source_sha256 = value.sources[0].sha256;
    value.reviews[0].start = 0;
    value.reviews[0].end = 1;
  }
  const raw = JSON.stringify(value);
  await expect(parsePacket(raw, sha256)).rejects.toThrow();
  await expect(both(raw)).rejects.toThrow();
});
