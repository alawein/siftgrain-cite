import { expect, test } from "vitest";
import { checkPack, expectedFiles } from "./pack-check.mjs";

const files = [
  "dist/index.html",
  "schema/claim-review-packet.v1.json",
  "schema/labels.v1.json",
  "schema/stress.v1.json",
  "CHANGELOG.md",
  "README.md",
  "LICENSE",
  "package.json",
];
const pack = (paths) => [{ files: paths.map((path) => ({ path, size: 1, mode: 420 })) }];

test("accepts exactly the public package files regardless of order", () => {
  expect(expectedFiles().toSorted()).toEqual(files.toSorted());
  expect(checkPack(pack(files.toReversed()))).toEqual({ ok: true, missing: [], extra: [] });
});

test("accepts npm 12's single package record", () => {
  expect(checkPack({ "claim-review": pack(files)[0] })).toEqual({
    ok: true,
    missing: [],
    extra: [],
  });
});

test("reports source files accidentally included in the package", () => {
  expect(checkPack(pack([...files, "src/app.ts"]))).toEqual({
    ok: false,
    missing: [],
    extra: ["src/app.ts"],
  });
});

test("reports a missing built page", () => {
  expect(checkPack(pack(files.slice(1)))).toEqual({
    ok: false,
    missing: ["dist/index.html"],
    extra: [],
  });
});

test("rejects duplicate entries instead of treating the manifest as a set", () => {
  expect(checkPack(pack([...files, "README.md"]))).toEqual({
    ok: false,
    missing: [],
    extra: ["README.md"],
  });
});

test.each(["../README.md", "/README.md", "dist\\index.html", "./README.md"])(
  "rejects an unsafe or noncanonical entry: %s",
  (path) => {
    expect(checkPack(pack([...files, path]))).toEqual({
      ok: false,
      missing: [],
      extra: [path],
    });
  },
);

test.each(
  [
    undefined,
    null,
    {},
    { "claim-review": pack(files)[0], other: pack(files)[0] },
    { other: pack(files)[0] },
    { "claim-review": null },
    { "claim-review": [pack(files)[0]] },
    [],
    [pack(files)[0], pack(files)[0]],
    [null],
    [{}],
    [{ files: "README.md" }],
    [{ files: [null] }],
    [{ files: ["README.md"] }],
    [{ files: [{ path: 1 }] }],
    [{ files: [{ path: "" }] }],
  ].map((value) => ({ value })),
)("rejects malformed or ambiguous pack output: $value", ({ value }) => {
  expect(checkPack(value).ok).toBe(false);
});
