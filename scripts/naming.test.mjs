import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { expect, test } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const retained = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "MAIOS_CONTEXT.md",
  ".coderabbit.yaml",
  "AUDIT_VERIFICATION.md",
  "RELEASE_READY.md",
  "REVIEW.md",
  "RELEASE_NOTES.md",
  "DECISIONS.md",
  "SECURITY_SETTINGS.md",
  "docs/lessons.md",
  "docs/requirements.md",
  "docs/shared-history.md",
  "docs/shared-history.json",
  "docs/recent-history.json",
  "docs/dev-tool-versions.json",
]);
const textExtensions = new Set([
  ".md",
  ".mjs",
  ".js",
  ".ts",
  ".html",
  ".css",
  ".json",
  ".jsonld",
  ".svg",
  ".txt",
  ".yaml",
  ".yml",
  ".py",
]);
const textNames = new Set([
  "LICENSE",
  "Makefile",
  "CODEOWNERS",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".lycheeignore",
  ".node-version",
  ".prettierignore",
]);

function isPublic(file) {
  return (
    !retained.has(file) &&
    !file
      .split("/")
      .some(
        (part) =>
          /^\.env/i.test(part) ||
          /^(?:AGENTS\.md|CLAUDE\.md|MAIOS_CONTEXT\.md|memory|\.claude|\.codex)$/i.test(part),
      )
  );
}

function publicText(files, read) {
  return new Map(
    files
      .filter(
        (file) =>
          isPublic(file) &&
          (textExtensions.has(path.posix.extname(file)) ||
            textNames.has(path.posix.basename(file))),
      )
      .map((file) => [file, read(file)]),
  );
}

const compatibleFiles = new Set([
  "package.json",
  "package-lock.json",
  "src/generated/packet-validator.js",
  "src/core/annotation.ts",
  "src/core/adapters.ts",
  "scripts/generate-validator.mjs",
  "scripts/pack-check.mjs",
  "docs/migration.md",
  "docs/contract.md",
  "docs/name-checks.json",
  "CHANGELOG.md",
]);
// Exact technical data outside the original compatibility owners, never whole test files.
const technical = new Map([
  ["README.md", ["`claim-review`"]],
  ["brand/README.md", ["`claim-review`"]],
  ...[
    "benchmarks/prepare.py",
    "scripts/generated-drift.test.mjs",
    "scripts/validate-schema.mjs",
    "src/core/schema.test.ts",
  ].map((file) => [file, ["claim-review-packet.v1.json"]]),
  ["scripts/pack-check.test.mjs", ["claim-review-packet.v1.json", '"claim-review"']],
  [
    ".github/workflows/release.yml",
    ["release-assets claim-review ", "release-assets/claim-review-*.tgz"],
  ],
  ...[
    "scripts/publish-release.mjs",
    "scripts/release-policy.mjs",
    "scripts/release-policy.test.mjs",
    "scripts/upload-release.mjs",
    "scripts/upload-release.test.mjs",
    "scripts/verify-release-artifacts.mjs",
    "scripts/verify-release-artifacts.test.mjs",
    "scripts/npm-local-artifact.test.mjs",
  ].map((file) => [file, ["claim-review"]]),
  ["src/ui/draft.ts", ["claim-review.draft.v1"]],
  ["tests/browser/hardening.spec.ts", ["claim-review.draft.v1"]],
  [
    "src/ui/transfer.ts",
    ["claim-review.json", "claim-review-annotations.jsonld", "claim-review.${format"],
  ],
  ["tests/browser/studio.spec.ts", ["claim-review.csv"]],
]);
// This file's literal matcher inputs and negative fixtures are technical data too.
technical.set("scripts/naming.test.mjs", [
  ...new Set([...technical.values()].flat()),
  "claim-review",
  "Claim review",
  "claim review",
]);

function namingIssues(files) {
  const issues = [];
  for (const [file, body] of files) {
    if (compatibleFiles.has(file) || /^schema\/[^/]+\.json$/.test(file)) continue;
    const stripped = (technical.get(file) ?? []).reduce(
      (text, literal) => text.replaceAll(literal, ""),
      body,
    );
    stripped.split(/\r?\n/).forEach((line, index) => {
      if (/claim[- ]review/i.test(line)) issues.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  return issues;
}

function withoutCode(markdown) {
  return markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, "");
}

function destinations(markdown) {
  const text = withoutCode(markdown);
  const links = [...text.matchAll(/^ {0,3}\[[^\]\n]+\]:\s*(<[^>\n]*>|\S+)/gm)].map((match) =>
    match[1].replace(/^<|>$/g, ""),
  );
  for (const match of text.matchAll(/\]\(\s*/g)) {
    let index = match.index + match[0].length;
    const start = index;
    if (text[index] === "<") {
      const end = text.indexOf(">", index);
      if (end !== -1) links.push(text.slice(index + 1, end));
      continue;
    }
    let depth = 0;
    while (index < text.length) {
      if (text[index] === "\\") {
        index += 2;
        continue;
      }
      if (text[index] === "(") depth++;
      if (text[index] === ")" && depth-- === 0) break;
      if (/\s/.test(text[index]) && depth === 0) break;
      index++;
    }
    links.push(text.slice(start, index).replace(/\\([()])/g, "$1"));
  }
  return links;
}

function anchors(markdown) {
  const text = withoutCode(markdown).replace(
    /\\.|(`+)[\s\S]*?\1(?!`)|<!--[\s\S]*?(?:-->|$)/g,
    (token) => (token.startsWith("<!--") ? "" : token),
  );
  const ids = new Set();
  function visibleText(value) {
    return value.replace(
      /\\([\\`*{}[\]()#+\-.!_<>])|(`+)([\s\S]*?)\2(?!`)|<\/?[a-z][a-z\d:-]*\b(?:[^<>"']|"[^"]*"|'[^']*')*>/gi,
      (token, escaped, ticks, code) => {
        if (escaped) return escaped;
        if (ticks) return code;
        if (token.startsWith("</")) return "";
        for (const attribute of token.matchAll(
          /\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
        )) {
          if (/^(?:id|name)$/i.test(attribute[1])) {
            const id = attribute[2] ?? attribute[3] ?? attribute[4];
            if (id) ids.add(id);
          }
        }
        return "";
      },
    );
  }
  visibleText(text);
  for (const match of text.matchAll(
    /^(?: {0,3}#{1,6}\s+(.+?)\s*#*\s*$|([^\n]+)\n {0,3}(?:=+|-+)\s*$)/gm,
  )) {
    const slug = visibleText(match[1] ?? match[2])
      .toLowerCase()
      .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, "")
      .replace(/\s/g, "-");
    let id = slug;
    for (let count = 1; ids.has(id); count++) id = `${slug}-${count}`;
    ids.add(id);
  }
  return ids;
}

function linkIssues(files, tracked) {
  const active = new Set(tracked.filter(isPublic));
  const issues = [];
  for (const [file, body] of files) {
    if (!file.endsWith(".md")) continue;
    for (const link of destinations(body)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
      let target, fragment;
      try {
        const [pathname, hash = ""] = link.split("#");
        target = pathname
          ? path.posix.normalize(
              path.posix.join(path.posix.dirname(file), decodeURIComponent(pathname.split("?")[0])),
            )
          : file;
        fragment = decodeURIComponent(hash);
      } catch {
        issues.push(`${file}: invalid link ${link}`);
        continue;
      }
      if (link.startsWith("/") || !active.has(target))
        issues.push(`${file}: untracked or wrong-case target ${link}`);
      else if (fragment && !anchors(files.get(target) ?? "").has(fragment))
        issues.push(`${file}: missing anchor ${link}`);
    }
  }
  return issues;
}

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const files = publicText(tracked, (file) => readFileSync(path.join(root, file), "utf8"));

test("tracked public text uses one display name outside frozen compatible identifiers", () => {
  expect(namingIssues(files)).toEqual([]);
});

test("every relative Markdown link resolves to an exact-case active tracked target and anchor", () => {
  expect(linkIssues(files, tracked)).toEqual([]);
});

test("denied and retained inputs are excluded before any read", () => {
  const read = [];
  const inputs = [
    "README.md",
    ".env",
    ".env.example",
    "nested/.ENV.local",
    "docs/shared-history.json",
    "AGENTS.md",
    "SECURITY_SETTINGS.md",
    "memory/notes.md",
    ".claude/settings.json",
    "docs/screenshots/app.png",
  ];
  publicText(inputs, (file) => {
    read.push(file);
    return "";
  });
  expect(read).toEqual(["README.md"]);
});

test.each(["claim-review", "Claim review", "claim review"])(
  "rejects display copy %s, including in technical consumers",
  (legacy) => {
    for (const file of ["README.md", "src/shell.html", "src/ui/draft.ts"]) {
      expect(namingIssues(new Map([[file, `Display: ${legacy}`]]))).toHaveLength(1);
    }
  },
);

test("relative links handle images, references, escapes, titles, duplicate headings and explicit anchors", () => {
  const fixture = new Map([
    [
      "README.md",
      '[one](docs/guide.md#review-a-claim) ![image](brand/logo.svg "Logo")\n[two][guide]\n[guide]: <docs/guide.md#review-a-claim-1>\n[explicit](docs/guide.md#custom) [local](#home)\n# Home',
    ],
    ["docs/guide.md", '# Review a claim\n# Review a claim\n<a id="custom"></a>'],
  ]);
  expect(linkIssues(fixture, [...fixture.keys(), "brand/logo.svg"])).toEqual([]);
  expect(destinations('[x](docs/a\\(b\\).md "title")')).toEqual(["docs/a(b).md"]);
});

test("relative links reject missing files, retained disk paths, wrong case and missing anchors", () => {
  const fixture = new Map([
    [
      "README.md",
      "[a](missing.md) [b](SECURITY_SETTINGS.md) [c](docs/Guide.md) [d](docs/guide.md#absent)",
    ],
    ["docs/guide.md", "# Guide"],
  ]);
  expect(linkIssues(fixture, [...fixture.keys(), "SECURITY_SETTINGS.md"])).toHaveLength(4);
});

test.each([
  ["inline code", '`<a id="ghost"></a>`'],
  ["HTML comment", '<!-- <a id="ghost"></a> -->'],
  ["escaped literal tag", '\\<a id="ghost"></a>'],
  ["data attribute", '<a data-id="ghost"></a>'],
  ["plain text", 'id="ghost"'],
  ["quoted attribute text", "<a title='id=\"ghost\"'></a>"],
])("relative fragments reject phantom anchors in %s", (_kind, body) => {
  const fixture = new Map([
    ["README.md", "[jump](guide.md#ghost)"],
    ["guide.md", body],
  ]);
  expect(linkIssues(fixture, [...fixture.keys()])).toEqual([
    "README.md: missing anchor guide.md#ghost",
  ]);
});

test("rendered HTML anchors and visible inline-code heading text remain valid", () => {
  const fixture = new Map([
    ["README.md", "[id](guide.md#real) [name](guide.md#named) [code](guide.md#use-review-now)"],
    ["guide.md", "<a id = \"real\"></a>\n<a name='named'></a>\n# Use `review` now"],
  ]);
  expect(linkIssues(fixture, [...fixture.keys()])).toEqual([]);
});

test("HTML-looking inline-code heading text stays visible in its slug", () => {
  expect(anchors("# Use `<code>` now\n# `<!--code-->`")).toEqual(
    new Set(["use-code-now", "--code--"]),
  );
});

test("opening and closing HTML formatting tags leave the rendered heading slug", () => {
  const fixture = new Map([
    ["README.md", "[jump](guide.md#use-review-now)"],
    ["guide.md", "# Use <code>review</code> now"],
  ]);
  expect(linkIssues(fixture, [...fixture.keys()])).toEqual([]);
  expect(anchors('</a id="ghost">')).not.toContain("ghost");
});
