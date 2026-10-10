import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("./catalog-app.ts", import.meta.url));
export async function buildCatalogAppHtml(): Promise<string> {
  const bundle = await build({ entryPoints: [entryPoint], bundle: true, write: false, platform: "browser", format: "esm", target: ["es2022"], legalComments: "none", minify: true, logLevel: "silent" });
  const javascript = bundle.outputFiles[0]?.text;
  if (!javascript) throw new Error("The Ariadne MCP catalog view bundle was empty");
  const css = await readFile(fileURLToPath(new URL("./catalog-app.css", import.meta.url)), "utf8");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Ariadne · Explore</title><style>${css}</style></head><body><div id="app"><main class="catalog-shell"><div class="empty-result">Waiting for the BSC catalog…</div></main></div><script type="module">${javascript.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
}
