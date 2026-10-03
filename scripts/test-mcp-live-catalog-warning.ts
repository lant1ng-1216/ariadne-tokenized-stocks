import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";

const contractAddress = "0x1111111111111111111111111111111111111111";
const now = Date.now();
const token = {
  binanceChainId: "56",
  tokenContractAddress: contractAddress,
  platformId: "ondo",
  tokenSymbol: "NVDAon",
  tokenName: "NVIDIA tokenized stock",
  underlyingTicker: "NVDA",
  underlyingName: "NVIDIA Corporation",
  tokenPrice: "100.00",
  referencePrice: "101.00",
  tokenPriceUpdatedAt: now - 1_000,
  liquidity: "250000.00",
  holders: 101,
  assetType: 2,
  statusInfo: {
    openState: false,
    marketStatus: "pause",
    reasonCode: "SYNTHETIC_PAUSE",
    reasonMsg: "Scheduled maintenance in synthetic test fixture",
    nextOpenTime: now + 60_000,
    nextCloseTime: now + 120_000
  },
  volume24H: "54321.75",
};
const requests: string[] = [];
const searchKeywords: string[] = [];
const api = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  requests.push(`${request.method} ${url.pathname}`);
  assert.equal(request.method, "GET", "live MCP catalog fixture must remain read-only");
  assert.equal(request.headers["x-oc-apikey"], "local-fixture-key", "the MCP child must use only the local fixture credential");

  let data: unknown;
  if (url.pathname === "/build/api/v1/dex/market/rwa/search") {
    const keyword = url.searchParams.get("keyword") ?? "";
    searchKeywords.push(keyword);
    if (keyword !== "NVDA") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: -1, msg: `No matching RWA assets found for keyword: ${keyword}`, data: null, timestamp: now, success: false }));
      return;
    }
    data = [{ ticker: "NVDA", companyName: "NVIDIA Corporation", assets: [{
      platformId: "ondo", binanceChainId: "56", tokenContractAddress: contractAddress, tokenSymbol: "NVDAon", assetType: 2
    }] }];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/platforms") {
    data = [{ platformId: "ondo", logoUrl: "https://fixture.invalid/issuer.svg", website: "https://fixture.invalid", chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }] }];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/tokens") {
    data = [token];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/price") {
    data = [{ binanceChainId: "56", tokenContractAddress: contractAddress, platformId: "ondo", tokenPrice: "100.00", referencePrice: "101.00", tokenPriceUpdatedAt: now - 1_000 }];
  } else {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ code: 404, msg: "unexpected fixture path", data: null, timestamp: now, success: false }));
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: 0, msg: "success", data, timestamp: now, success: true }));
});

await new Promise<void>((resolve, reject) => {
  api.once("error", reject);
  api.listen(0, "127.0.0.1", resolve);
});
const address = api.address();
assert.ok(address && typeof address !== "string");
const transport = new StdioClientTransport({
  command: "node",
  args: ["--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH ?? "",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    NODE_ENV: "test",
    ARIADNE_MODE: "live",
    ARIADNE_TRANSPORT: "stdio",
    BINANCE_WEB3_API_KEY: "local-fixture-key",
    BINANCE_WEB3_API_SECRET: "local-fixture-secret",
    BINANCE_WEB3_BASE_URL: `http://127.0.0.1:${address.port}/build`,
    BINANCE_WEB3_PROXY_URL: ""
  },
  stderr: "pipe"
});
const client = new Client({ name: "ariadne-live-catalog-warning-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = ["discover_tokenized_assets", "compare_asset_representations", "research_tokenized_stock"];
  for (const name of names) {
    const tool = tools.tools.find((candidate) => candidate.name === name);
    assert.ok(tool, `${name} must be registered`);
    assert.match(tool.description ?? "", /returned matches, not a verified complete catalog/i, `${name} metadata must disclose bounded provider results`);
  }

  const warning = "Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified";
  const localizedWarning = "搜索结果仅为上游本次返回的匹配项，并非已验证的完整目录；分页和总数语义尚未验证";
  const readPayload = (result: Awaited<ReturnType<typeof client.callTool>>, expectedWarning = localizedWarning) => {
    assert.ok(result.structuredContent, "MCP hosts receive structured live-mode output");
    const payload = result.structuredContent as Record<string, any>;
    assert.ok(payload.outcome?.warnings?.includes(expectedWarning), `the actual live-mode result must disclose incomplete catalog coverage: ${JSON.stringify(payload.outcome)}`);
    return payload;
  };

  const query = "请研究 NVDA 在 BNB Chain 上的发行方版本，比较价格并列出数据缺口，不要交易。";
  const discovery = readPayload(await client.callTool({ name: names[0]!, arguments: { query, chainId: "56" } }));
  const comparison = readPayload(await client.callTool({ name: names[1]!, arguments: { query, chainId: "56" } }));
  const researchResult = await client.callTool({ name: names[2]!, arguments: { query, chainId: "56" } });
  const research = readPayload(researchResult);
  const chineseMcpText = (researchResult.content as Array<{ type: string; text?: string }>).filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
  assert.equal(discovery.assets.length, 1);
  assert.equal(comparison.comparison.rows.length, 1);
  assert.equal(research.assets.length, 1);
  assert.equal(discovery.resolvedQuery, "NVDA", "the actual MCP discovery tool resolves the ticker from a full Chinese research request");
  assert.equal(research.resolvedQuery, "NVDA", "the actual MCP research tool resolves the ticker from a full Chinese research request");
  assert.equal(research.query, query, "the Agent-facing result retains the user's exact natural-language question");
  assert.equal(research.outcome.sideEffects, "none");
  const researchedAsset = research.assets[0];
  assert.equal(researchedAsset.assetType, 2, "actual MCP structured output carries provider assetType");
  assert.equal(researchedAsset.market.providerMarketStatus, "pause");
  assert.equal(researchedAsset.market.marketStatus, "closed");
  assert.equal(researchedAsset.market.openState, false);
  assert.equal(researchedAsset.market.reasonCode, "SYNTHETIC_PAUSE");
  assert.equal(researchedAsset.market.reasonMsg, "Scheduled maintenance in synthetic test fixture");
  assert.equal(researchedAsset.market.nextOpenTime, token.statusInfo.nextOpenTime);
  assert.equal(researchedAsset.market.nextCloseTime, token.statusInfo.nextCloseTime);
  assert.equal(researchedAsset.market.tokenPrice, "100.00");
  assert.equal(researchedAsset.market.referencePrice, "101.00");
  assert.equal(researchedAsset.market.priceGap, "-1");
  assert.equal(researchedAsset.market.priceGapPercent, "-0.990099009900990099%");
  assert.equal(researchedAsset.market.volume24H, "54321.75");
  assert.equal(researchedAsset.market.liquidity, "250000.00");
  assert.equal(researchedAsset.market.holders, 101);
  assert.equal(researchedAsset.market.tokenPriceUpdatedAt, now - 1_000, "actual MCP research preserves the per-asset quote timestamp separately");
  const quoteSource = researchedAsset.market.provenance.find((source: Record<string, any>) => source.endpoint.endsWith("/rwa/price"));
  const statusSource = researchedAsset.market.provenance.find((source: Record<string, any>) => source.endpoint.endsWith("/rwa/tokens"));
  assert.equal(quoteSource.responseTimestampMs, now, "actual MCP output retains the server response time separately");
  assert.equal(quoteSource.assetUpdatedAtMs, now - 1_000);
  assert.equal(statusSource.responseTimestampMs, now);
  assert.match(research.presentation, /资产类型：\*\*Pre-IPO \(2\)\*\*/);
  assert.match(research.presentation, /上游状态：pause/);
  assert.match(research.presentation, /原因代码：SYNTHETIC\\_PAUSE/);
  assert.match(research.presentation, /下次收盘：/);
  assert.match(research.presentation, /上游开放标记：false/);
  assert.match(research.presentation, /24 小时成交量：54321\\\.75/);
  assert.match(research.presentation, /上游流动性字段：250000\\\.00/);
  assert.match(research.presentation, /持有者数量字段：101/);
  assert.match(chineseMcpText, /资产类型：\*\*Pre-IPO \(2\)\*\*/);
  assert.match(chineseMcpText, /上游状态：pause/);

  const englishQuery = "Please research NVDA on BNB Chain, compare issuer versions and prices, list missing data, and do not trade.";
  const englishResult = await client.callTool({ name: names[2]!, arguments: { query: englishQuery, chainId: "56" } });
  const english = readPayload(englishResult, warning);
  const englishMcpText = (englishResult.content as Array<{ type: string; text?: string }>).filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
  assert.ok(english.outcome.warnings.includes(warning), "the actual live-mode result must preserve the exact English catalog warning");
  assert.equal(english.resolvedQuery, "NVDA", "the actual MCP research tool resolves the ticker from a full English research request");
  assert.equal(english.query, englishQuery, "the Agent-facing result retains the English natural-language question");
  assert.match(english.presentation, /Asset type: \*\*Pre-IPO \(2\)\*\*/);
  assert.match(english.presentation, /Provider note: Scheduled maintenance in synthetic test fixture/);
  assert.match(english.presentation, /Provider open-state flag: false/);
  assert.match(english.presentation, /24h volume: 54321\\\.75/);
  assert.match(english.presentation, /Provider liquidity field: 250000\\\.00/);
  assert.match(english.presentation, /Provider holder-count field: 101/);
  assert.match(english.presentation, /Reason code: SYNTHETIC\\_PAUSE/);
  assert.match(english.presentation, new RegExp(`Last update: \\*\\*${new Date(now - 1_000).toISOString()}\\*\\*`));
  assert.match(englishMcpText, /Provider status: pause/);
  assert.match(englishMcpText, /\"reasonCode\":\s*\"SYNTHETIC_PAUSE\"/, "the MCP text block must retain the exact structured reason code");
  const localizedPresentation = research.presentation as string;
  assert.match(localizedPresentation, /资产类型：\*\*Pre-IPO \(2\)\*\*/);
  assert.match(localizedPresentation, /上游状态：pause/);
  assert.match(localizedPresentation, /原因代码：SYNTHETIC\\_PAUSE/);
  const rendered = renderResearchView(research);
  assert.ok(rendered.includes(localizedWarning), "the native research UI must render the warning from the actual live-mode MCP result");
  assert.ok(rendered.includes("Pre-IPO (2)"));
  assert.ok(rendered.includes("上游状态：pause"));
  assert.ok(rendered.includes("Scheduled maintenance in synthetic test fixture"));
  assert.ok(rendered.includes(new Date(token.statusInfo.nextCloseTime).toISOString()));
  assert.ok(rendered.includes("100.00"));
  assert.ok(rendered.includes("101.00"));
  assert.ok(rendered.includes("上游开放标记：false"));
  assert.ok(rendered.includes("24 小时成交量：54321.75"));
  assert.ok(rendered.includes("上游流动性字段：250000.00"));
  assert.ok(rendered.includes("持有者数量字段：101"));
  assert.ok(rendered.includes(new Date(now - 1_000).toISOString().replace("T", " · ").replace("Z", " UTC")), "native research view renders the exact validated quote timestamp");
  assert.ok(rendered.includes(new Date(now).toISOString().replace("T", " · ").replace("Z", " UTC")), "native research view renders the distinct response timestamp in provenance");

  const contradictory = {
    ...research,
    assets: [{ ...researchedAsset, market: { ...researchedAsset.market, marketStatus: "open", openState: false } }],
    comparison: { rows: [] }
  };
  assert.ok(renderResearchView(contradictory).includes("非开放（上游状态字段矛盾）"), "native UI uses a conservative label for contradictory provider market fields");

  assert.ok(requests.length >= 8, "the three tools must exercise the local live-provider fixture rather than Demo Mode");
  assert.ok(requests.every((entry) => entry.startsWith("GET /build/api/v1/dex/market/rwa/")), "the fixture must receive only bounded read-only RWA requests");
  assert.ok(searchKeywords.includes(query) && searchKeywords.includes(englishQuery), "the exact Chinese and English natural-language questions must reach the SDK search path");
  assert.ok(searchKeywords.filter((keyword) => keyword === "NVDA").length >= 4, "catalog matching must retry each full natural-language request with only the exact unambiguous NVDA ticker");
  console.log(JSON.stringify({
    liveToolMetadataDisclosesCatalogScope: true,
    allThreeLiveToolResultsCarryLocalizedWarning: true,
    englishLiveWarningPreserved: true,
    realMcpPipelinePreservesPhase28Fields: true,
    bilingualMcpTextAndStructuredContentAgree: true,
    nativeUiRendersActualLiveWarning: true,
    nativeUiRendersPhase28ProviderEvidence: true,
    allSupportedMarketFieldsAndSourceTimestampSemanticsReachActualMcpAndUi: true,
    catalogFallbackResolvesChineseAndEnglishQueriesToNvda: true,
    contradictoryProviderMarketFlagsRenderConservatively: true,
    localReadOnlyProviderFixtureOnly: true,
    passed: true
  }, null, 2));
} finally {
  await client.close().catch(() => undefined);
  await new Promise<void>((resolve) => api.close(() => resolve()));
}
