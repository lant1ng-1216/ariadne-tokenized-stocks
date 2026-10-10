import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL(import.meta.url.endsWith(".js") ? "./purchase-approval-app.js" : "./purchase-approval-app.ts", import.meta.url));

export function normalizeReownProjectId(value: string | undefined): string | undefined {
  const projectId = value?.trim();
  return projectId && /^[0-9a-f]{32}$/i.test(projectId) ? projectId : undefined;
}

export async function buildPurchaseApprovalAppHtml(options: { reownProjectId?: string } = {}): Promise<string> {
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
  if (!javascript) throw new Error("The Ariadne purchase approval view bundle was empty");
  const css = await readFile(fileURLToPath(new URL("./purchase-approval-app.css", import.meta.url)), "utf8");
  const safeScript = javascript.replace(/<\/script/gi, "<\\/script");
  const projectId = normalizeReownProjectId(options.reownProjectId);
  const config = projectId ? { reownProjectId: projectId } : {};
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Ariadne · Purchase review</title><style>${css}</style></head>
<body><div id="app"></div><script>window.ariadneConfig=${JSON.stringify(config)};</script><script type="module">${safeScript}</script></body>
</html>`;
}
