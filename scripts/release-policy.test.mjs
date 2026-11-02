import { expect, test } from "vitest";
import {
  registryDecision,
  assetDecision,
  verifyProvenanceStatement,
  publishOrVerify,
} from "./release-policy.mjs";

test("only a verified absent version permits publication", () => {
  expect(registryDecision(404, "a", "b")).toBe("publish");
  expect(registryDecision(200, "a", "a")).toBe("verify-existing");
  expect(() => registryDecision(200, "a", "b")).toThrow("mismatch");
  for (const status of [401, 403, 429, 500])
    expect(() => registryDecision(status, "a", "a")).toThrow();
});
test("existing GitHub assets are compared without replacement", () => {
  expect(assetDecision(undefined, "a")).toBe("upload");
  expect(assetDecision("a", "a")).toBe("retain");
  expect(() => assetDecision("a", "b")).toThrow("mismatch");
});
test("authentication failure then retry does not republish an existing identical version", async () => {
  let attempts = 0;
  await expect(
    publishOrVerify({
      readVersion: async () => ({ status: 404 }),
      downloadHash: async () => "same",
      localHash: "same",
      publish: async () => {
        attempts++;
        throw new Error("ENEEDAUTH");
      },
    }),
  ).rejects.toThrow("ENEEDAUTH");
  expect(attempts).toBe(1);
  await publishOrVerify({
    readVersion: async () => ({ status: 200, data: {} }),
    downloadHash: async () => "same",
    localHash: "same",
    publish: async () => {
      attempts++;
    },
  });
  expect(attempts).toBe(1);
});
test("new publication verifies destination bytes and unknown access never publishes", async () => {
  let attempts = 0;
  let reads = 0;
  const publish = async () => {
    attempts++;
  };
  await publishOrVerify({
    readVersion: async () => ({ status: reads++ ? 200 : 404, data: {} }),
    downloadHash: async () => "same",
    localHash: "same",
    publish,
  });
  expect(attempts).toBe(1);
  await expect(
    publishOrVerify({
      readVersion: async () => ({ status: 403 }),
      downloadHash: async () => "same",
      localHash: "same",
      publish,
    }),
  ).rejects.toThrow("403");
  expect(attempts).toBe(1);
});
test("npm provenance policy binds subject, workflow, source, tag and hosted builder", () => {
  const source = "a".repeat(40);
  const statement = {
    subject: [{ name: "pkg:npm/claim-review@0.3.1", digest: { sha512: "digest" } }],
    predicate: {
      buildDefinition: {
        buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            repository: "https://github.com/alawein/siftgrain-cite",
            path: ".github/workflows/release.yml",
            ref: "refs/tags/v0.3.1",
          },
        },
        resolvedDependencies: [
          {
            uri: "git+https://github.com/alawein/siftgrain-cite@refs/tags/v0.3.1",
            digest: { gitCommit: source },
          },
        ],
      },
      runDetails: { builder: { id: "https://github.com/actions/runner/github-hosted" } },
    },
  };
  expect(() => verifyProvenanceStatement(statement, "digest", "0.3.1", source)).not.toThrow();
  for (const change of [
    () => (statement.subject[0].digest.sha512 = "other"),
    () => (statement.predicate.runDetails.builder.id = "self-hosted"),
    () => (statement.predicate.buildDefinition.externalParameters.workflow.ref = "refs/heads/main"),
  ]) {
    const copy = JSON.parse(JSON.stringify(statement));
    change();
    expect(() => verifyProvenanceStatement(statement, "digest", "0.3.1", source)).toThrow();
    Object.assign(statement, copy);
  }
});
