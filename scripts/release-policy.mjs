import { resolve } from "node:path";

export function publishArguments(directory, name) {
  return [
    "publish",
    resolve(directory, name),
    "--access",
    "public",
    "--provenance",
    "--ignore-scripts",
  ];
}

export function registryDecision(status, localHash, registryHash) {
  if (status === 404) return "publish";
  if (status !== 200) throw new Error(`Registry access failed: HTTP ${status}`);
  if (localHash !== registryHash)
    throw new Error("Existing registry artifact mismatch; never republish");
  return "verify-existing";
}
export async function publishOrVerify({ readVersion, downloadHash, publish, localHash }) {
  let metadata = await readVersion();
  const decision = registryDecision(
    metadata.status,
    localHash,
    metadata.status === 200 ? await downloadHash(metadata.data) : undefined,
  );
  if (decision === "publish") {
    await publish();
    metadata = await readVersion();
  }
  if (metadata.status !== 200)
    throw new Error("Publication not visible; inspect destination before retry");
  registryDecision(200, localHash, await downloadHash(metadata.data));
  return metadata;
}
export function assetDecision(existingHash, localHash) {
  if (existingHash === undefined) return "upload";
  if (existingHash !== localHash) throw new Error("Existing GitHub asset mismatch; never replace");
  return "retain";
}
export function verifyProvenanceStatement(statement, sha512, version, sourceCommit) {
  const subject = statement.subject;
  const definition = statement.predicate?.buildDefinition;
  const workflow = definition?.externalParameters?.workflow;
  const dependencies = definition?.resolvedDependencies;
  if (
    subject?.length !== 1 ||
    subject[0].name !== `pkg:npm/claim-review@${version}` ||
    subject[0].digest?.sha512 !== sha512 ||
    definition?.buildType !==
      "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1" ||
    workflow?.repository !== "https://github.com/alawein/siftgrain-cite" ||
    workflow.path !== ".github/workflows/release.yml" ||
    workflow.ref !== `refs/tags/v${version}` ||
    !dependencies?.some(
      (row) =>
        row.uri === `git+https://github.com/alawein/siftgrain-cite@refs/tags/v${version}` &&
        row.digest?.gitCommit === sourceCommit,
    ) ||
    statement.predicate?.runDetails?.builder?.id !==
      "https://github.com/actions/runner/github-hosted"
  )
    throw new Error("npm provenance policy mismatch");
}
