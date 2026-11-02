// CI tooling only. This file is not bundled into the offline product.
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { verifyInventory } from "./verify-release-artifacts.mjs";
import {
  registryDecision,
  verifyProvenanceStatement,
  publishOrVerify,
  publishArguments,
} from "./release-policy.mjs";

const version = JSON.parse(await readFile("package.json", "utf8")).version;
const directory = "release-assets";
await verifyInventory(directory, "claim-review", version);
const name = `claim-review-${version}.tgz`;
const local = await readFile(join(directory, name));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha512 = createHash("sha512").update(local).digest("hex");
const registryUrl = `https://registry.npmjs.org/claim-review/${version}`;
async function getMetadata() {
  const response = await globalThis.fetch(registryUrl);
  if (![200, 404].includes(response.status)) registryDecision(response.status);
  return { status: response.status, data: response.status === 200 ? await response.json() : null };
}
async function download(metadata) {
  const url = new URL(metadata.dist.tarball);
  if (url.origin !== "https://registry.npmjs.org")
    throw new Error("Unexpected registry artifact origin");
  const response = await globalThis.fetch(url);
  if (!response.ok) throw new Error(`Registry download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const metadata = await publishOrVerify({
  readVersion: getMetadata,
  downloadHash: async (data) => sha256(await download(data)),
  localHash: sha256(local),
  publish: async () => {
    execFileSync("npm", publishArguments(directory, name), { stdio: "inherit" });
  },
});
const downloaded = await download(metadata.data);
registryDecision(200, sha256(local), sha256(downloaded));
const temporary = await mkdtemp(join(tmpdir(), "claim-registry-"));
try {
  const path = join(temporary, name);
  await writeFile(path, downloaded);
  execFileSync(
    "gh",
    [
      "attestation",
      "verify",
      path,
      "--repo",
      "alawein/siftgrain-cite",
      "--signer-workflow",
      "alawein/siftgrain-cite/.github/workflows/release.yml",
      "--source-digest",
      process.env.GITHUB_SHA,
      "--source-ref",
      `refs/tags/v${version}`,
      "--deny-self-hosted-runners",
    ],
    { stdio: "inherit" },
  );
  const attestationsUrl = new URL(metadata.data.dist.attestations.url);
  if (attestationsUrl.origin !== "https://registry.npmjs.org")
    throw new Error("Unexpected npm attestation origin");
  const response = await globalThis.fetch(attestationsUrl);
  if (!response.ok) throw new Error("npm attestations unavailable");
  const attestations = await response.json();
  const provenance = attestations.attestations?.find(
    (row) => row.predicateType === "https://slsa.dev/provenance/v1",
  );
  if (!provenance?.bundle?.dsseEnvelope?.payload) throw new Error("npm provenance missing");
  const statement = JSON.parse(
    Buffer.from(provenance.bundle.dsseEnvelope.payload, "base64").toString("utf8"),
  );
  verifyProvenanceStatement(statement, sha512, version, process.env.GITHUB_SHA);
  // npm performs cryptographic signature and provenance verification, including
  // registry key/signature verification and Sigstore certificate validation.
  await writeFile(
    join(temporary, "package.json"),
    '{"name":"release-verification","private":true}',
  );
  execFileSync(
    "npm",
    [
      "install",
      `claim-review@${version}`,
      "--ignore-scripts",
      "--registry=https://registry.npmjs.org",
    ],
    { cwd: temporary, stdio: "inherit" },
  );
  execFileSync("npm", ["audit", "signatures", "--registry=https://registry.npmjs.org"], {
    cwd: temporary,
    stdio: "inherit",
  });
  process.stdout.write("Registry bytes and signed provenance verified\n");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
