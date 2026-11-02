import { test, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createInventory, verifyInventory } from "./verify-release-artifacts.mjs";

async function fixture(metadata = { name: "claim-review", version: "0.3.1" }) {
  const root = await mkdtemp(join(tmpdir(), "claim-release-"));
  await mkdir(join(root, "package", "dist"), { recursive: true });
  await writeFile(join(root, "package", "package.json"), JSON.stringify(metadata));
  await writeFile(join(root, "package", "dist", "index.html"), "<!doctype html>test");
  await writeFile(join(root, "index.html"), "<!doctype html>test");
  execFileSync("tar", ["-czf", join(root, "claim-review-0.3.1.tgz"), "-C", root, "package"]);
  await rm(join(root, "package"), { recursive: true });
  return root;
}
test("release inventory verifies package metadata and exact standalone bytes", async () => {
  const root = await fixture();
  try {
    await createInventory(root, "claim-review", "0.3.1");
    await expect(verifyInventory(root, "claim-review", "0.3.1")).resolves.toHaveLength(2);
    await expect(verifyInventory(root, "claim-review", "0.3.2")).rejects.toThrow();
    await expect(verifyInventory(root, "other", "0.3.1")).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true });
  }
});
test.each([
  { name: "other", version: "0.3.1" },
  { name: "claim-review", version: "0.3.0" },
])("release rejects unexpected internal metadata $name@$version", async (metadata) => {
  const root = await fixture(metadata);
  try {
    await expect(createInventory(root, "claim-review", "0.3.1")).rejects.toThrow("metadata");
  } finally {
    await rm(root, { recursive: true });
  }
});
test.each(["modified", "missing", "extra", "checksum", "html"])(
  "release rejects %s files",
  async (kind) => {
    const root = await fixture();
    try {
      await createInventory(root, "claim-review", "0.3.1");
      if (kind === "missing") await rm(join(root, "index.html"));
      else if (kind === "extra") await writeFile(join(root, "extra.tgz"), "extra");
      else if (kind === "checksum") await writeFile(join(root, "SHA256SUMS"), "invalid");
      else if (kind === "html") {
        await writeFile(join(root, "index.html"), "other");
        await expect(createInventory(root, "claim-review", "0.3.1")).rejects.toThrow("HTML");
        return;
      } else await writeFile(join(root, "claim-review-0.3.1.tgz"), "changed");
      await expect(verifyInventory(root, "claim-review", "0.3.1")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true });
    }
  },
);
