import { expect, test } from "vitest";
import packetInput from "../examples/packet.json";
import reviewedInput from "../examples/reviewed.json";
import { csvExport, importTrace } from "./adapters";
import { sha256 } from "./hash";
import { parsePacket } from "./packet";

const firstRow = JSON.stringify({
  answer: packetInput.claims[0].text,
  documents: [packetInput.sources[0].text],
});
const secondRow = JSON.stringify({
  answer: packetInput.claims[1].text,
  documents: ["A second supplied passage."],
});

test("two JSONL rows retain both claims and their distinct citations", async () => {
  const packet = await importTrace(`${firstRow}\n${secondRow}`, sha256);

  expect(packet.claims).toEqual([
    { id: "run-1", text: packetInput.claims[0].text, citation_ids: ["run-1-source-1"] },
    { id: "run-2", text: packetInput.claims[1].text, citation_ids: ["run-2-source-1"] },
  ]);
  expect(packet.sources.map(({ id, text }) => ({ id, text }))).toEqual([
    { id: "run-1-source-1", text: packetInput.sources[0].text },
    { id: "run-2-source-1", text: "A second supplied passage." },
  ]);
});

test("an interior blank JSONL row rejects the entire import", async () => {
  await expect(importTrace(`${firstRow}\n\n${secondRow}`, sha256)).rejects.toThrow(SyntaxError);
});

test("CSV preserves a rationale containing a comma, quote and newline", async () => {
  const packet = await parsePacket(JSON.stringify(reviewedInput), sha256);
  packet.reviews = [{ ...packet.reviews[0], rationale: 'A comma, a "quote"\nand a newline.' }];

  expect(csvExport(packet)).toBe(
    "review_id,claim_id,source_id,source_sha256,reviewer,identity_assurance,verdict,rationale,state\r\n" +
      `"review-1","c1","policy-1","${reviewedInput.sources[0].sha256}",` +
      '"Synthetic exercise","self-reported","supported","A comma, a ""quote""\nand a newline.","valid"',
  );
});
