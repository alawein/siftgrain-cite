// Idempotent CI upload: never clobber an existing release asset.
import { readFile, readdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { verifyInventory } from "./verify-release-artifacts.mjs";
import { assetDecision } from "./release-policy.mjs";

export function releaseBody(version, buildResult, publishResult, assetsVerified = false) {
  const statuses = ["success", "failure", "cancelled", "skipped"];
  if (!statuses.includes(buildResult) || !statuses.includes(publishResult))
    throw new Error("Invalid workflow result");
  if (buildResult !== "success") throw new Error("Successful canonical build required");
  const publication = {
    success:
      "npm publication verified: the publish job completed registry byte, provenance and signature verification.",
    failure:
      "npm publication/verification job failed. Verified registry publication is not established; inspect the registry before retrying.",
    cancelled:
      "npm publication/verification job was cancelled. Registry state is unverified; inspect it before retrying.",
    skipped:
      "npm publication/verification job was skipped. Publication remains pending and registry state is unverified.",
  }[publishResult];
  return `# Siftgrain Cite v${version}\n\nCanonical tag build succeeded.\n\n${publication}\n\n${assetsVerified ? "GitHub Release asset bytes match the canonical checksum inventory." : "GitHub Release asset verification is pending."}\n\nSee [changes](https://github.com/alawein/siftgrain-cite/blob/v${version}/CHANGELOG.md).\n`;
}

export async function uploadRelease({
  version,
  tag,
  buildResult,
  publishResult,
  assetDirectory = "release-assets",
  gh,
}) {
  const initialBody = releaseBody(version, buildResult, publishResult);
  if (tag !== `v${version}`) throw new Error("Release tag/version mismatch");
  const repository = "alawein/siftgrain-cite";
  await verifyInventory(assetDirectory, "claim-review", version);
  const releases = JSON.parse(
    await gh(["api", `repos/${repository}/releases`, "--paginate", "--slurp"]),
  ).flat();
  let release = releases.find((row) => row.tag_name === tag);
  const temporary = await mkdtemp(join(tmpdir(), "claim-release-upload-"));
  const notes = join(temporary, "notes.md");
  try {
    if (!release) {
      await writeFile(notes, initialBody);
      await gh([
        "release",
        "create",
        tag,
        "--repo",
        repository,
        "--verify-tag",
        "--title",
        `Siftgrain Cite ${tag}`,
        "--notes-file",
        notes,
      ]);
      release = JSON.parse(await gh(["api", `repos/${repository}/releases/tags/${tag}`]));
    }
    for (const file of (await readdir(assetDirectory)).sort()) {
      const localPath = join(assetDirectory, file);
      const local = await readFile(localPath);
      const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
      const existing = release.assets.find((row) => row.name === file);
      let existingHash;
      if (existing) {
        await gh([
          "release",
          "download",
          tag,
          "--repo",
          repository,
          "--pattern",
          file,
          "--dir",
          temporary,
        ]);
        existingHash = hash(await readFile(join(temporary, file)));
      }
      if (assetDecision(existingHash, hash(local)) === "upload")
        await gh(["release", "upload", tag, localPath, "--repo", repository]);
      if (!existing) {
        await gh([
          "release",
          "download",
          tag,
          "--repo",
          repository,
          "--pattern",
          file,
          "--dir",
          temporary,
        ]);
        assetDecision(hash(await readFile(join(temporary, file))), hash(local));
      }
    }
    const body = releaseBody(version, buildResult, publishResult, true);
    if (release.body !== body) {
      await writeFile(notes, body);
      await gh(["release", "edit", tag, "--repo", repository, "--notes-file", notes]);
    }
    process.stdout.write("GitHub Release asset bytes verified\n");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const version = JSON.parse(await readFile("package.json", "utf8")).version;
  await uploadRelease({
    version,
    tag: process.env.GITHUB_REF_NAME,
    buildResult: process.env.BUILD_RESULT,
    publishResult: process.env.PUBLISH_RESULT,
    gh: (args) => execFileSync("gh", args, { encoding: "utf8" }),
  });
}
