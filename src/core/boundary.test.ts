import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("core modules use no browser state and import only core or generated modules", () => {
  const core = resolve("src/core");
  const generated = resolve("src/generated");
  const files = readdirSync(core, { recursive: true, withFileTypes: true }).filter(
    (entry) => entry.isFile() && !entry.name.includes(".test."),
  );
  expect(files.length, "no core modules found").toBeGreaterThan(0);
  for (const entry of files) {
    const file = join(entry.parentPath, entry.name);
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(
      /\b(?:(?:document|window|navigator)\s*\??\.|localStorage\b|sessionStorage\b)/,
    );
    for (const { fileName } of ts.preProcessFile(source).importedFiles) {
      const target = resolve(entry.parentPath, fileName);
      expect(fileName, file).toMatch(/^\.{1,2}\//);
      expect(fileName, file).not.toMatch(/(?:^|\/)ui(?:\/|$)/);
      expect(target.startsWith(core + sep) || target.startsWith(generated + sep), fileName).toBe(
        true,
      );
    }
  }
});
