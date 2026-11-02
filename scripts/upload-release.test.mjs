import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createInventory } from "./verify-release-artifacts.mjs";
import { uploadRelease, releaseBody } from "./upload-release.mjs";

test("release retry reconciles failed publication to verified success without replacing assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-upload-test-"));
  try {
    await mkdir(join(root, "package", "dist"), { recursive: true });
    await writeFile(
      join(root, "package", "package.json"),
      JSON.stringify({ name: "claim-review", version: "0.3.1" }),
    );
    await writeFile(join(root, "package", "dist", "index.html"), "offline");
    await writeFile(join(root, "index.html"), "offline");
    execFileSync("tar", ["-czf", join(root, "claim-review-0.3.1.tgz"), "-C", root, "package"]);
    await rm(join(root, "package"), { recursive: true });
    await createInventory(root, "claim-review", "0.3.1");
    let release;
    let releaseTitle;
    let uploads = 0;
    let edits = 0;
    const bytes = new Map();
    const gh = async (args) => {
      const value = (flag) => args[args.indexOf(flag) + 1];
      if (args[0] === "api")
        return JSON.stringify(args[1].endsWith("/releases") ? [release ? [release] : []] : release);
      if (args[1] === "create") {
        releaseTitle = value("--title");
        release = {
          tag_name: args[2],
          assets: [],
          body: await readFile(value("--notes-file"), "utf8"),
        };
      } else if (args[1] === "edit") {
        edits++;
        release.body = await readFile(value("--notes-file"), "utf8");
      } else if (args[1] === "upload") {
        uploads++;
        const name = args[3].split(/[\\/]/).at(-1);
        bytes.set(name, await readFile(args[3]));
        release.assets.push({ name });
      } else if (args[1] === "download")
        await writeFile(join(value("--dir"), value("--pattern")), bytes.get(value("--pattern")));
      else throw new Error("unexpected gh call");
      return "";
    };
    const options = {
      version: "0.3.1",
      tag: "v0.3.1",
      buildResult: "success",
      assetDirectory: root,
      gh,
    };
    await uploadRelease({ ...options, publishResult: "failure" });
    expect(releaseTitle).toBe("Siftgrain Cite v0.3.1");
    expect(release.body).toContain("failed");
    expect(release.body).not.toContain("npm publication verified");
    expect(release.body).not.toContain("Publication not attempted");
    await uploadRelease({ ...options, publishResult: "success" });
    expect(uploads).toBe(3);
    expect(edits).toBe(2);
    expect(release.body).toContain("npm publication verified");
    expect(release.body).toContain("# Siftgrain Cite v0.3.1");
    expect(release.body).toContain(
      "https://github.com/alawein/siftgrain-cite/blob/v0.3.1/CHANGELOG.md",
    );
    expect(release.body).not.toContain("failed");
    bytes.set("index.html", "different");
    await expect(uploadRelease({ ...options, publishResult: "failure" })).rejects.toThrow(
      "mismatch",
    );
    expect(uploads).toBe(3);
    expect(edits).toBe(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("only successful verified publish jobs claim npm publication", () => {
  for (const publishResult of ["failure", "cancelled", "skipped"]) {
    expect(releaseBody("0.3.1", "success", publishResult)).not.toContain(
      "npm publication verified",
    );
  }
  for (const result of [undefined, "pending", "SUCCESS", ""]) {
    expect(() => releaseBody("0.3.1", "success", result)).toThrow("result");
  }
  expect(() => releaseBody("0.3.1", "failure", "success")).toThrow("build");
});
