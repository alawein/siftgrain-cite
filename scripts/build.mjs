import "./generate-validator.mjs";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const result = await build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  format: "iife",
  target: "es2022",
  write: false,
  minify: false,
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = (
  (await readFile("src/tokens.css", "utf8")) + (await readFile("src/style.css", "utf8"))
).replace(/<\/style/gi, "<\\/style");
const themeScript = `try{const s=JSON.parse(localStorage.getItem("siftgrain-viewer")||"null");document.documentElement.dataset.theme=s?.theme==="light"?"light":"dark";document.documentElement.dataset.vibe=["cartoon","calm","pixel","lab"].includes(s?.vibe)?s.vibe:"calm";}catch{document.documentElement.dataset.theme="dark";document.documentElement.dataset.vibe="calm";}`;
const shell = await readFile("src/shell.html", "utf8");
const digest = (value) => createHash("sha256").update(value, "utf8").digest("base64");
const csp = `default-src 'none'; connect-src 'none'; script-src 'sha256-${digest(script)}' 'sha256-${digest(themeScript)}'; style-src 'sha256-${digest(css)}'; base-uri 'none'; form-action 'none'; object-src 'none'`;
const output = shell
  .replace("__CSP__", csp)
  .replace("</head>", `<script>${themeScript}</script></head>`)
  .replace('<style id="app-style"></style>', `<style>${css}</style>`)
  .replace('<script id="app-script"></script>', `<script>${script}</script>`);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", output, "utf8");
