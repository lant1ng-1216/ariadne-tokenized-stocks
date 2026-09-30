import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("./research-app.ts", import.meta.url));

export async function buildResearchAppHtml(): Promise<string> {
  const bundle = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    target: ["es2022"],
    legalComments: "none",
    minify: true,
    logLevel: "silent"
  });
  const javascript = bundle.outputFiles[0]?.text;
  if (!javascript) throw new Error("The Ariadne MCP research view bundle was empty");
  const css = await readFile(fileURLToPath(new URL("./research-app.css", import.meta.url)), "utf8");
  const safeScript = javascript.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>Ariadne research</title><style>${css}</style></head>
<body><div id="app"><main class="research-shell"><header class="topbar"><div class="brand-mark">A</div><div class="brand"><strong>ARIADNE</strong><span>MARKET CONTEXT</span></div></header><div class="loading"><span class="loading-dot"></span>Waiting for the MCP research result…</div></main></div><script type="module">${safeScript}</script></body>
</html>`;
}
