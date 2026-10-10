import assert from "node:assert/strict";
import { buildCatalogAppHtml } from "../src/mcp/ui/catalog-app-html.js";
import { renderCatalogView } from "../src/mcp/ui/catalog-view.js";

const payload = {
  language: "zh-CN",
  scope: { representationCount: 10, uniqueUnderlyingCount: 7, issuerCount: 2, wording: "本次 Binance Web3 返回" },
  filtered: { representationCount: 6, uniqueUnderlyingCount: 3 },
  filters: { issuerIds: [], assetTypes: [1], multiIssuerOnly: true },
  issuers: [
    { platformId: "ondo", name: "Ondo", representationCount: 7, underlyingCount: 7 },
    { platformId: "bstock", name: "bStocks", representationCount: 3, underlyingCount: 3 },
  ],
  assetTypes: [{ code: 1, label: "股票", representationCount: 10, underlyingCount: 7 }],
  items: [{
    underlyingTicker: "NVDA<script>alert(1)</script>",
    underlyingName: "Nvidia Corp",
    underlyingNameZh: "英伟达",
    representationCount: 2,
    issuerCount: 2,
    assetTypes: [1],
    issuers: [
      { platformId: "ondo", name: "Ondo", tokenSymbols: ["NVDAon"] },
      { platformId: "bstock", name: "bStocks", tokenSymbols: ["NVDAB"] },
    ],
  }],
  pagination: { offset: 0, limit: 24, total: 3, returned: 1, hasMore: true, nextOffset: 1 },
  sourceTimes: { catalogResponseTimestampMs: 1791512400000 },
  warnings: ["Provider results are returned matches, not a verified complete catalog"],
};

const view = renderCatalogView(payload);
assert.match(view, /Ariadne/);
assert.match(view, /漫游 · Binance Web3 · BSC/);
assert.match(view, /从市场全景开始/);
assert.match(view, /本次 Binance Web3 返回/);
assert.match(view, /仅看双发行方/);
assert.match(view, /Ondo/);
assert.match(view, /bStocks/);
assert.match(view, /NVDA&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(view, /<script>alert\(1\)<\/script>/);
assert.match(view, /选择一个标的后，再进入发行方研究与行情比较/);

const empty = renderCatalogView({ ...payload, items: [], filtered: { representationCount: 0, uniqueUnderlyingCount: 0 }, pagination: { offset: 0, limit: 24, total: 0, returned: 0, hasMore: false } });
assert.match(empty, /当前筛选没有返回标的/);

const english = renderCatalogView({ ...payload, language: "en", scope: { ...payload.scope, wording: "Returned by Binance Web3 in this request" } });
assert.match(english, /Start with the market landscape/);
assert.match(english, /Choose one underlying next/);

const html = await buildCatalogAppHtml();
assert.match(html, /id="app"/);
assert.match(html, /Ariadne Catalog View/);
assert.match(html, /ui\/notifications\/tool-result/);
assert.match(html, /background:transparent/);
assert.match(html, /@media\(max-width:700px\)/);
assert.match(html, /@media\(max-width:430px\)/);
assert.ok(html.length < 450_000, `catalog App bundle should remain bounded (${html.length} bytes)`);

console.log("Catalog App UI: PASS");
