import { test, expect } from "vitest";
import jsonld from "jsonld";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test("Croissant inline context expands source extraction to cr namespace and hashes match splits", async () => {
  const metadata = JSON.parse(readFileSync("benchmarks/croissant.json", "utf8"));
  const expanded = await jsonld.expand(metadata);
  const records = expanded[0]["http://mlcommons.org/croissant/recordSet"] as unknown[];
  expect(records).toHaveLength(2);
  expect(JSON.stringify(records)).toContain("http://mlcommons.org/croissant/source");
  expect(JSON.stringify(records)).toContain("http://mlcommons.org/croissant/jsonPath");
  for (const distribution of metadata.distribution)
    expect(
      createHash("sha256")
        .update(readFileSync(`benchmarks/${distribution.contentUrl}`))
        .digest("hex"),
    ).toBe(distribution.sha256);
  const broken = structuredClone(metadata);
  delete broken["@context"].recordSet;
  const invalid = await jsonld.expand(broken);
  expect(invalid[0]["http://mlcommons.org/croissant/recordSet"]).toBeUndefined();
});
