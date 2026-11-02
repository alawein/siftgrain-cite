import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { expect, test } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const retained = new Set(["docs/lessons.md", "docs/requirements.md", "docs/shared-history.md"]);

function publicText(files, read) {
  const selected = files.filter(
    (file) =>
      /\.(?:md|html|ts)$/.test(file) &&
      /^(?:(?:README|CHANGELOG|SECURITY)\.md$|(?:playwright|vitest)\.config\.ts$|(?:benchmarks|brand|docs|scripts|src|studies|tests)\/)/.test(
        file,
      ) &&
      !retained.has(file) &&
      !file
        .split("/")
        .some((part) =>
          /^\.env|^(?:AGENTS\.md|CLAUDE\.md|MAIOS_CONTEXT\.md|memory|\.claude|\.codex)$/i.test(
            part,
          ),
        ),
  );
  return new Map(selected.map((file) => [file, read(file)]));
}

function voiceIssues(files) {
  const issues = [];
  for (const [file, body] of files) {
    body.split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(
        /\u2014|\b(?:comprehensive|robust|leverage|streamline|seamless|delve|holistic|cutting-edge|innovative)\b/gi,
      )) {
        issues.push(`${file}:${index + 1}: ${match[0]}`);
      }
    });
  }
  return issues;
}

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const files = publicText(tracked, (file) => readFileSync(path.join(root, file), "utf8"));

test("tracked public Markdown, HTML and TypeScript follow the known house voice rules", () => {
  expect(files.has("CHANGELOG.md")).toBe(true);
  expect(voiceIssues(files)).toEqual([]);
});

test.each([
  "comprehensive",
  "robust",
  "leverage",
  "streamline",
  "seamless",
  "delve",
  "holistic",
  "cutting-edge",
  "innovative",
  "\u2014",
])("rejects the forbidden literal %s in all scanned formats and historical prose", (literal) => {
  for (const file of ["README.md", "CHANGELOG.md", "src/shell.html", "src/app.ts"]) {
    expect(
      voiceIssues(new Map([[file, `Plain copy.\r\n${literal.toUpperCase()}, ${literal}.`]])),
    ).toEqual([`${file}:2: ${literal.toUpperCase()}`, `${file}:2: ${literal}`]);
  }
});

test("allows plain copy, word fragments and underscore identifiers", () => {
  expect(
    voiceIssues(
      new Map([
        ["README.md", "Review citations with exact spans and explicit human rationales."],
        [
          "src/app.ts",
          "comprehensively robustness leveraged streamlines seamlessly delves holistically cutting-edged innovatively robust_value",
        ],
      ]),
    ),
  ).toEqual([]);
});

test("selects active tracked public paths before reading bodies", () => {
  const read = [];
  publicText(
    [
      "README.md",
      "CHANGELOG.md",
      "docs/guide.md",
      "src/shell.html",
      "src/app.ts",
      "vitest.config.ts",
      ".env.ts",
      "docs/.ENV.local.md",
      "AGENTS.md",
      "SECURITY_SETTINGS.md",
      "docs/shared-history.md",
      "docs/lessons.md",
      "docs/requirements.md",
      "memory/notes.md",
      "docs/.codex/notes.md",
      "docs/AGENTS.md",
      "private/notes.md",
      "docs/screenshots/app.png",
      "scripts/voice.test.mjs",
    ],
    (file) => {
      read.push(file);
      return "";
    },
  );
  expect(read).toEqual([
    "README.md",
    "CHANGELOG.md",
    "docs/guide.md",
    "src/shell.html",
    "src/app.ts",
    "vitest.config.ts",
  ]);
});
