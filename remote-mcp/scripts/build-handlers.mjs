import { build } from "esbuild";
import { copyFileSync, existsSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

// Shared source lives above the Vercel project root. Its imports resolve from
// that directory, while Vercel installs dependencies under remote-mcp/.
const parentModules = resolve("../node_modules");
if (!existsSync(parentModules)) symlinkSync(resolve("node_modules"), parentModules, "dir");
const { buildExternalWalletApprovalPageHtml } = await import("../../src/mcp/ui/external-wallet-approval-page-html.ts");
const { buildResearchAppHtml } = await import("../../src/mcp/ui/research-app-html.ts");
const { buildCatalogAppHtml } = await import("../../src/mcp/ui/catalog-app-html.ts");
const { buildPurchaseApprovalAppHtml } = await import("../../src/mcp/ui/purchase-approval-app-html.ts");

const [walletPageZh, walletPageEn, researchUiHtml, catalogUiHtml, purchaseApprovalUiHtml] = await Promise.all([
  buildExternalWalletApprovalPageHtml("zh-CN"),
  buildExternalWalletApprovalPageHtml("en"),
  buildResearchAppHtml(),
  buildCatalogAppHtml(),
  buildPurchaseApprovalAppHtml({ reownProjectId: process.env.ARIADNE_REOWN_PROJECT_ID })
]);

await build({
  entryPoints: { mcp: "handlers/mcp.ts", relay: "handlers/relay.ts" },
  outdir: "generated",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node24",
  loader: { ".css": "text" },
  define: {
    __ARIADNE_WALLET_HTML_ZH__: JSON.stringify(walletPageZh),
    __ARIADNE_WALLET_HTML_EN__: JSON.stringify(walletPageEn),
    __ARIADNE_RESEARCH_HTML__: JSON.stringify(researchUiHtml),
    __ARIADNE_CATALOG_HTML__: JSON.stringify(catalogUiHtml),
    __ARIADNE_PURCHASE_APPROVAL_HTML__: JSON.stringify(purchaseApprovalUiHtml)
  },
  sourcemap: false,
  logLevel: "warning"
});
for (const name of ["research-app.css", "catalog-app.css", "purchase-approval-app.css"]) {
  copyFileSync(`../src/mcp/ui/${name}`, `generated/${name}`);
}
