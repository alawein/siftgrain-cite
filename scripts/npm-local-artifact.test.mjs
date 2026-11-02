import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute, relative } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { publishArguments } from "./release-policy.mjs";

test("production publish arguments identify a local tarball", () => {
  const args = publishArguments("release-assets", "claim-review-0.3.2.tgz");
  expect(args[0]).toBe("publish");
  expect(isAbsolute(args[1])).toBe(true);
  expect(args.slice(2)).toEqual(["--access", "public", "--provenance", "--ignore-scripts"]);
});

test("real npm 12.2.0 dry run parses the production tarball argument locally", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-npm-local-"));
  try {
    const packageRoot = join(root, "package");
    await mkdir(packageRoot);
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "claim-review", version: "0.3.2" }),
    );
    const name = "claim-review-0.3.2.tgz";
    execFileSync("tar", ["-czf", join(root, name), "-C", root, "package"]);
    const config = join(root, "empty.npmrc");
    await writeFile(config, "");
    const globalConfig = join(root, "global.npmrc");
    await writeFile(globalConfig, "");
    const npmCli = join(process.cwd(), "node_modules", "npm", "bin", "npm-cli.js");
    const env = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: config,
      NPM_CONFIG_GLOBALCONFIG: globalConfig,
    };
    expect(
      execFileSync(process.execPath, [npmCli, "--version"], { encoding: "utf8", env }).trim(),
    ).toBe("12.2.0");
    expect(() =>
      execFileSync(
        process.execPath,
        [npmCli, "publish", `release-assets/${name}`, "--dry-run", "--offline", "--allow-git=none"],
        { encoding: "utf8", env, timeout: 30000, stdio: "pipe" },
      ),
    ).toThrow("EALLOWGIT");
    const output = execFileSync(
      process.execPath,
      [
        npmCli,
        ...publishArguments(relative(process.cwd(), root), name),
        "--dry-run",
        "--json",
        "--provenance=false",
        "--offline",
      ],
      { encoding: "utf8", env, timeout: 30000 },
    );
    const result = JSON.parse(output);
    expect(result.id ?? result["claim-review"]?.id).toBe("claim-review@0.3.2");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);
