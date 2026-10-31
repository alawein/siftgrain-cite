import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execPath } from "node:process";
import { fileURLToPath, URL } from "node:url";
import { expect, test } from "vitest";

test("the committed validator matches the current schema and generator byte for byte", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const fixture = await mkdtemp(join(tmpdir(), "generated-validator-"));
  await mkdir(join(fixture, "scripts"));
  await mkdir(join(fixture, "schema"));
  for (const path of [
    "scripts/generate-validator.mjs",
    "schema/claim-review-packet.v1.json",
    "package.json",
  ]) {
    await copyFile(join(root, path), join(fixture, path));
  }
  await symlink(join(root, "node_modules"), join(fixture, "node_modules"), "junction");
  execFileSync(execPath, ["scripts/generate-validator.mjs"], { cwd: fixture });

  const generated = await readFile(join(fixture, "src/generated/packet-validator.js"));
  const committed = execFileSync("git", ["show", "HEAD:src/generated/packet-validator.js"], {
    cwd: root,
  });
  expect(generated.equals(committed), "Regenerate and commit the packet validator").toBe(true);
});
