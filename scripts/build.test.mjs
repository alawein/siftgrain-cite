import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execPath } from "node:process";
import { fileURLToPath, URL } from "node:url";
import { beforeAll, expect, test } from "vitest";

let html;

beforeAll(async () => {
  const root = new URL("../", import.meta.url);
  execFileSync(execPath, ["scripts/build.mjs"], { cwd: fileURLToPath(root) });
  html = await readFile(new URL("dist/index.html", root), "utf8");
});

function assertIntegrity(page) {
  const metas = [...page.matchAll(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi)];
  expect(metas).toHaveLength(1);
  const content = metas[0][0].match(/\bcontent="([^"]+)"/i)?.[1];
  expect(content).toBeTruthy();
  const directives = content.split(";").map((part) => part.trim().split(/\s+/));
  const policy = new Map(directives.map(([name, ...sources]) => [name, sources]));
  expect(policy.size).toBe(directives.length);
  for (const name of ["default-src", "connect-src", "base-uri", "form-action", "object-src"]) {
    expect(policy.get(name), name).toEqual(["'none'"]);
  }
  for (const [tag, count, directive] of [
    ["script", 2, "script-src"],
    ["style", 1, "style-src"],
  ]) {
    const blocks = [...page.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi"))];
    expect(blocks, tag).toHaveLength(count);
    const hashes = blocks.map(([, attributes, body]) => {
      expect(attributes).not.toMatch(/\bsrc\s*=/i);
      if (tag === "script") {
        expect(body).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\b/);
      }
      return `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
    });
    expect(policy.get(directive)?.toSorted(), `${directive} hash mismatch`).toEqual(hashes.sort());
  }
}

test("the built page pins every inline script and style with a restrictive CSP", () => {
  assertIntegrity(html);
});

test("integrity rejects tampering with each body and missing or extra CSP sources", () => {
  for (const [tag, count, directive] of [
    ["script", 2, "script-src"],
    ["style", 1, "style-src"],
  ]) {
    for (let target = 0; target < count; target++) {
      let index = 0;
      const tampered = html.replace(
        new RegExp(`(<${tag}\\b[^>]*>)([\\s\\S]*?)(</${tag}>)`, "gi"),
        (match, open, body, close) => (index++ === target ? `${open}${body}\n ${close}` : match),
      );
      expect(() => assertIntegrity(tampered), `${tag} ${target + 1}`).toThrow(directive);
    }
    const missing = html.replace(new RegExp(`(${directive})\\s+'sha256-[^']+'`), "$1");
    const extra = html.replace(directive, `${directive} 'unsafe-inline'`);
    expect(() => assertIntegrity(missing), `${directive} missing source`).toThrow(directive);
    expect(() => assertIntegrity(extra), `${directive} extra source`).toThrow(directive);
  }
});
