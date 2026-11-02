import { expect, test } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { labelExport } from "./adapters";
import { parsePacket } from "./packet";
import { sha256 } from "./hash";
test("versioned label and stress schemas validate actual emitted artifacts", async () => {
  const ajv = new Ajv2020();
  const labels = ajv.compile(JSON.parse(readFileSync("schema/labels.v1.json", "utf8")));
  const stress = ajv.compile(JSON.parse(readFileSync("schema/stress.v1.json", "utf8")));
  const p = await parsePacket(readFileSync("examples/reviewed.json", "utf8"), sha256);
  for (const format of ["ais", "alce"] as const) expect(labels(labelExport(p, format))).toBe(true);
  for (const split of ["dev", "test"])
    expect(stress(JSON.parse(readFileSync(`benchmarks/v1/${split}/stress.json`, "utf8")))).toBe(
      true,
    );
  const invalid = labelExport(p, "ais");
  Object.assign(invalid.items[0], { interpretability: "invented" });
  expect(labels(invalid)).toBe(false);
});
