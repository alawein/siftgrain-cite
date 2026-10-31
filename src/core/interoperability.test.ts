import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import jsonld from "jsonld";
import { test, expect } from "vitest";
import { webAnnotations } from "./annotation";
import { parsePacket } from "./packet";
import { appendReview, reviewState } from "./reviews";
import { sha256 } from "./hash";

const contextBytes = readFileSync("fixtures/anno-context.jsonld");
const context = JSON.parse(contextBytes.toString("utf8"));
const cases: { id: string; text: string; start: number; end: number; changed?: string }[] =
  JSON.parse(readFileSync("fixtures/annotation-interop.json", "utf8")).cases;
test("pinned W3C context has the reviewed byte digest", () => {
  expect(createHash("sha256").update(contextBytes).digest("hex")).toBe(
    "c10fd886c5c726fbfd51747b8677eb8f7d02c039357269622de7382e5c20d410",
  );
});
test.each(cases)(
  "offline jsonld consumer expands $id and preserves exact selectors",
  async (row) => {
    let packet = await parsePacket(
      JSON.stringify({
        schema_version: 1,
        sources: [{ id: "s", title: "T", text: row.text, sha256: await sha256(row.text) }],
        claims: [{ id: "c", text: "C", citation_ids: ["s"] }],
        reviews: [],
      }),
      sha256,
    );
    packet = appendReview(packet, {
      id: row.id,
      claim_id: "c",
      source_id: "s",
      source_sha256: packet.sources[0].sha256,
      start: row.start,
      end: row.end,
      verdict: "supported",
      rationale: "Synthetic",
      reviewer: "Synthetic test",
    });
    const output = webAnnotations(packet);
    let loads = 0;
    const expanded = await jsonld.expand(output, {
      documentLoader: async (url: string) => {
        expect(url).toBe("http://www.w3.org/ns/anno.jsonld");
        loads++;
        return { documentUrl: url, document: context };
      },
    });
    expect(loads).toBe(1);
    const rdf = await jsonld.toRDF(expanded, { format: "application/n-quads" });
    expect(rdf).toContain("<http://www.w3.org/ns/oa#TextQuoteSelector>");
    expect(rdf).toContain("<http://www.w3.org/ns/oa#TextPositionSelector>");
    expect(rdf).toContain(`<urn:sha256:${packet.sources[0].sha256}>`);
    const review = packet.reviews[0];
    const quote = review.text_quote!;
    const position = review.text_position!;
    const nodes = (await jsonld.flatten(expanded)) as unknown as Record<string, unknown>[];
    const quoteNode = nodes.find((node) =>
      (node["@type"] as string[] | undefined)?.includes(
        "http://www.w3.org/ns/oa#TextQuoteSelector",
      ),
    )!;
    const positionNode = nodes.find((node) =>
      (node["@type"] as string[] | undefined)?.includes(
        "http://www.w3.org/ns/oa#TextPositionSelector",
      ),
    )!;
    expect(quoteNode["http://www.w3.org/ns/oa#exact"]).toEqual([{ "@value": quote.exact }]);
    expect(positionNode["http://www.w3.org/ns/oa#start"]).toMatchObject([
      { "@value": position.start },
    ]);
    expect(positionNode["http://www.w3.org/ns/oa#end"]).toMatchObject([{ "@value": position.end }]);
    const expandedText = JSON.stringify(expanded);
    expect(expandedText).toContain(JSON.stringify(quote.exact));
    expect(expandedText).toContain('"http://www.w3.org/ns/oa#exact"');
    expect(expandedText).toContain('"http://www.w3.org/ns/oa#start"');
    expect(expandedText).toContain('"http://www.w3.org/ns/oa#end"');
    expect(Array.from(row.text).slice(position.start, position.end).join("")).toBe(quote.exact);
    expect(Array.from(quote.prefix).length).toBeLessThanOrEqual(32);
    expect(Array.from(quote.suffix).length).toBeLessThanOrEqual(32);
    if (row.changed) {
      const before = JSON.stringify(review);
      packet.sources[0].text = row.changed;
      packet.sources[0].sha256 = await sha256(row.changed);
      packet.sources[0].nfc_sha256 = await sha256(row.changed.normalize("NFC"));
      expect(reviewState(packet, review)).toBe("normalization-only stale");
      const restored = await parsePacket(JSON.stringify(packet), sha256);
      expect(JSON.stringify(restored.reviews[0])).toBe(before);
      expect(webAnnotations(restored).items[0].target.source.id).toBe(
        `urn:sha256:${review.source_sha256}`,
      );
    }
  },
);
test("stale legacy native round trip retains judgments when JSON-LD fails", async () => {
  const input = JSON.parse(readFileSync("examples/reviewed.json", "utf8"));
  input.reviews[0].source_sha256 = "b".repeat(64);
  const packet = await parsePacket(JSON.stringify(input), sha256);
  expect(() => webAnnotations(packet)).toThrow("migrated stale history");
  expect(await parsePacket(JSON.stringify(packet), sha256)).toEqual(packet);
  expect(packet.reviews).toHaveLength(input.reviews.length);
});
