import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import Ajv2020 from "ajv/dist/2020.js";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import console from "node:console";
const schema = JSON.parse(await readFile("schema/claim-review-packet.v1.json", "utf8"));
const validate = new Ajv2020({ allErrors: true }).compile(schema);
const result = await build({
  entryPoints: ["src/core/packet.ts"],
  bundle: true,
  format: "esm",
  write: false,
  platform: "node",
});
const { parsePacket } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const hash = async (text) => createHash("sha256").update(text, "utf8").digest("hex");
const files = process.argv.slice(2);
for (const file of files.length
  ? files
  : [
      "examples/packet.json",
      "examples/reviewed.json",
      "examples/acceptance.json",
      "examples/acceptance-reviewed.json",
    ]) {
  try {
    const raw = await readFile(file, "utf8");
    if (!validate(JSON.parse(raw))) throw new Error(JSON.stringify(validate.errors));
    const packet = await parsePacket(raw, hash);
    if (!validate(packet)) throw new Error(JSON.stringify(validate.errors));
    await parsePacket(JSON.stringify(packet), hash);
    console.log(`${file}: valid input and migrated export`);
  } catch (error) {
    console.error(`${file}: ${String(error)}`);
    process.exitCode = 1;
  }
}
