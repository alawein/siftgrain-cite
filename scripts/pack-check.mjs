import { execFileSync } from "node:child_process";
import console from "node:console";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

export function expectedFiles() {
  return [
    "dist/index.html",
    "schema/claim-review-packet.v1.json",
    "schema/labels.v1.json",
    "schema/stress.v1.json",
    "CHANGELOG.md",
    "README.md",
    "LICENSE",
    "package.json",
  ];
}

export function checkPack(packJson) {
  const expected = expectedFiles();
  const records = Array.isArray(packJson)
    ? packJson
    : packJson &&
        typeof packJson === "object" &&
        Object.keys(packJson).length === 1 &&
        Object.hasOwn(packJson, "siftgrain-cite")
      ? [packJson["siftgrain-cite"]]
      : [];
  if (
    records.length !== 1 ||
    !Array.isArray(records[0]?.files) ||
    !records[0].files.every((file) => file && typeof file.path === "string" && file.path.length > 0)
  ) {
    return { ok: false, missing: expected, extra: [] };
  }
  const seen = new Set();
  const extra = [];
  for (const { path } of records[0].files) {
    if (!expected.includes(path) || seen.has(path)) extra.push(path);
    seen.add(path);
  }
  const missing = expected.filter((path) => !seen.has(path));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const npmCli = process.env.npm_execpath ?? resolve(root, "node_modules/npm/bin/npm-cli.js");
    const output = execFileSync(
      process.execPath,
      [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts", "--offline"],
      { cwd: root, encoding: "utf8" },
    );
    const result = checkPack(JSON.parse(output));
    if (!result.ok) throw new Error(`pack-check: invalid package ${JSON.stringify(result)}`);
    console.log(`pack-check: ok (${expectedFiles().length} files)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
