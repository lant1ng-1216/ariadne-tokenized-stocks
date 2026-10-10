import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL(import.meta.url.endsWith(".js") ? "./research-app.js" : "./research-app.ts", import.meta.url));

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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Ariadne · Research</title><style>${css}</style></head>
<body><div id="app"><main class="research-shell"><header class="result-heading"><div class="brandline"><span class="brand-thread" aria-hidden="true"></span><span class="brand-name">Ariadne</span><span class="brand-divider">·</span><span class="brand-context">Research</span></div></header><div class="empty-result">Waiting for the research result…</div></main></div><script type="module">${safeScript}</script></body>
</html>`;
}
