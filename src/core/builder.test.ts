import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { buildPacket, draftClaim, draftSource, type BuilderState } from "./builder";

const sha = async (text: string): Promise<string> =>
  createHash("sha256").update(text, "utf8").digest("hex");

function state(): BuilderState {
  return { sources: [draftSource("s", "Title", "hello world")], claims: [] };
}

test("builder needs at least one claim", async () => {
  await expect(buildPacket({ sources: [], claims: [] }, sha)).rejects.toThrow();
});

test("source id, title and text limits reject", async () => {
  const badId = state();
  badId.sources[0].id = " ";
  badId.claims = [draftClaim("c", "Claim text", ["s"])];
  await expect(buildPacket(badId, sha)).rejects.toThrow();
  const badTitle = state();
  badTitle.sources[0].title = "";
  badTitle.claims = [draftClaim("c", "Claim text", ["s"])];
  await expect(buildPacket(badTitle, sha)).rejects.toThrow();
  const badText = state();
  badText.sources[0].text = "x".repeat(100001);
  badText.claims = [draftClaim("c", "Claim text", ["s"])];
  await expect(buildPacket(badText, sha)).rejects.toThrow();
  const surrogate = state();
  surrogate.sources[0].text = "\ud800";
  surrogate.claims = [draftClaim("c", "Claim text", ["s"])];
  await expect(buildPacket(surrogate, sha)).rejects.toThrow();
  const dup = state();
  dup.sources.push(draftSource("s", "Other", "more text"));
  dup.claims = [draftClaim("c", "Claim text", ["s"])];
  await expect(buildPacket(dup, sha)).rejects.toThrow("duplicate");
});

test("claim citation rules reject unknown, duplicate and empty refs", async () => {
  const unknown = state();
  unknown.claims = [draftClaim("c", "Claim text", ["missing"])];
  await expect(buildPacket(unknown, sha)).rejects.toThrow("unknown citation");
  const dupCite = state();
  dupCite.claims = [draftClaim("c", "Claim text", ["s", "s"])];
  await expect(buildPacket(dupCite, sha)).rejects.toThrow("duplicate citation");
  const emptyCite = state();
  emptyCite.claims = [draftClaim("c", "Claim text", [])];
  await expect(buildPacket(emptyCite, sha)).rejects.toThrow();
  const emptyText = state();
  emptyText.claims = [draftClaim("c", " ", ["s"])];
  await expect(buildPacket(emptyText, sha)).rejects.toThrow();
  const dupId = state();
  dupId.claims = [draftClaim("c", "One", ["s"]), draftClaim("c", "Two", ["s"])];
  await expect(buildPacket(dupId, sha)).rejects.toThrow("duplicate");
});

test("collection caps reject oversized builder state", async () => {
  const manySources: BuilderState = {
    sources: Array.from({ length: 101 }, (_, i) => draftSource(`s${i}`, "T", "x")),
    claims: [draftClaim("c", "Claim", ["s0"])],
  };
  await expect(buildPacket(manySources, sha)).rejects.toThrow();
  const manyCites: BuilderState = {
    sources: [draftSource("s", "T", "x")],
    claims: [
      draftClaim(
        "c",
        "Claim",
        Array.from({ length: 101 }, () => "s"),
      ),
    ],
  };
  await expect(buildPacket(manyCites, sha)).rejects.toThrow();
  const manyClaims: BuilderState = {
    sources: [draftSource("s", "T", "x")],
    claims: Array.from({ length: 1001 }, (_, i) => draftClaim(`c${i}`, "t", ["s"])),
  };
  await expect(buildPacket(manyClaims, sha)).rejects.toThrow();
});

test("non-deterministic hash surfaces a mismatch", async () => {
  const full = state();
  full.claims = [draftClaim("c", "Claim text", ["s"])];
  let calls = 0;
  const flaky = async (text: string): Promise<string> => {
    calls++;
    const real = await sha(text);
    return calls === 1 ? real : "b".repeat(64) === real ? "c".repeat(64) : "b".repeat(64);
  };
  await expect(buildPacket(full, flaky)).rejects.toThrow("hash mismatch");
});

test("happy path builds an importable packet object", async () => {
  const full = state();
  full.claims = [draftClaim("c", "Claim text", ["s"])];
  const packet = await buildPacket(full, sha);
  expect(packet.schema_version).toBe(2);
  expect(packet.sources).toHaveLength(1);
  expect(packet.sources[0].sha256).toBe(await sha("hello world"));
  expect(packet.claims[0].citation_ids).toEqual(["s"]);
  expect(packet.reviews).toEqual([]);
});

test("CRLF in builder text is stored as LF before hashing", async () => {
  const full: BuilderState = {
    sources: [draftSource("s", "Title", "first\r\nSECOND")],
    claims: [draftClaim("c", "Claim text", ["s"])],
  };
  const packet = await buildPacket(full, sha);
  expect(packet.sources[0].text).toBe("first\nSECOND");
  expect(packet.sources[0].sha256).toBe(await sha("first\nSECOND"));
});
