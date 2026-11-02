import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function inspectArtifacts(directory, name, version) {
  if (name !== "claim-review" || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Unexpected package/version");
  const names = [`${name}-${version}.tgz`, "index.html"].sort();
  const actual = (await readdir(directory)).filter((entry) => entry !== "SHA256SUMS").sort();
  if (JSON.stringify(names) !== JSON.stringify(actual))
    throw new Error("Missing or extra release files");
  const tarball = join(directory, `${name}-${version}.tgz`);
  const entries = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/);
  if (
    new Set(entries).size !== entries.length ||
    entries.some((entry) => !entry.startsWith("package/") || entry.split("/").includes(".."))
  )
    throw new Error("Unsafe or duplicate tar entries");
  const metadata = JSON.parse(
    execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }),
  );
  if (metadata.name !== name || metadata.version !== version)
    throw new Error("Unexpected package/version metadata");
  const html = await readFile(join(directory, "index.html"));
  if (!execFileSync("tar", ["-xOzf", tarball, "package/dist/index.html"]).equals(html))
    throw new Error("Standalone HTML does not match packaged HTML");
  return Promise.all(
    names.map(async (file) => ({ file, sha256: hash(await readFile(join(directory, file))) })),
  );
}
export async function createInventory(directory, name, version) {
  const rows = await inspectArtifacts(directory, name, version);
  await writeFile(
    join(directory, "SHA256SUMS"),
    rows.map((row) => `${row.sha256}  ${row.file}\n`).join(""),
    "utf8",
  );
  return rows;
}
export async function verifyInventory(directory, name, version) {
  const rows = await inspectArtifacts(directory, name, version);
  const expected = rows.map((row) => `${row.sha256}  ${row.file}\n`).join("");
  if ((await readFile(join(directory, "SHA256SUMS"), "utf8")) !== expected)
    throw new Error("Checksum inventory mismatch");
  return rows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, directory, name, version] = process.argv.slice(2);
  if (!directory || !name || !version || !["create", "verify"].includes(mode))
    throw new Error("Usage: verify-release-artifacts.mjs create|verify DIRECTORY NAME VERSION");
  await (mode === "create" ? createInventory : verifyInventory)(directory, name, version);
  process.stdout.write("Release artifacts verified\n");
}
