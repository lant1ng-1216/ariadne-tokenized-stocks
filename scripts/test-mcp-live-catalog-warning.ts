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
  tokenPriceUpdatedAt: now,
  statusInfo: { openState: true, marketStatus: "Open" },
  volume24H: "1000000"
};
const requests: string[] = [];
const api = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  requests.push(`${request.method} ${url.pathname}`);
  assert.equal(request.method, "GET", "live MCP catalog fixture must remain read-only");
  assert.equal(request.headers["x-oc-apikey"], "local-fixture-key", "the MCP child must use only the local fixture credential");

  let data: unknown;
  if (url.pathname === "/build/api/v1/dex/market/rwa/search") {
    data = [{ ticker: "NVDA", companyName: "NVIDIA Corporation", assets: [{
      platformId: "ondo", binanceChainId: "56", tokenContractAddress: contractAddress, tokenSymbol: "NVDAon"
    }] }];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/platforms") {
    data = [{ platformId: "ondo", logoUrl: "https://fixture.invalid/issuer.svg", website: "https://fixture.invalid", chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }] }];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/tokens") {
    data = [token];
  } else if (url.pathname === "/build/api/v1/dex/market/rwa/price") {
    data = [{ binanceChainId: "56", tokenContractAddress: contractAddress, platformId: "ondo", tokenPrice: "100.00", referencePrice: "101.00", tokenPriceUpdatedAt: now }];
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

  const query = "研究 NVDA";
  const discovery = readPayload(await client.callTool({ name: names[0]!, arguments: { query, chainId: "56" } }));
  const comparison = readPayload(await client.callTool({ name: names[1]!, arguments: { query, chainId: "56" } }));
  const research = readPayload(await client.callTool({ name: names[2]!, arguments: { query, chainId: "56" } }));
  assert.equal(discovery.assets.length, 1);
  assert.equal(comparison.comparison.rows.length, 1);
  assert.equal(research.assets.length, 1);
  assert.equal(research.outcome.sideEffects, "none");

  const english = readPayload(await client.callTool({ name: names[2]!, arguments: { query: "Research NVDA", chainId: "56" } }), warning);
  assert.ok(english.outcome.warnings.includes(warning), "the actual live-mode result must preserve the exact English catalog warning");
  const rendered = renderResearchView(research);
  assert.ok(rendered.includes(localizedWarning), "the native research UI must render the warning from the actual live-mode MCP result");

  assert.ok(requests.length >= 8, "the three tools must exercise the local live-provider fixture rather than Demo Mode");
  assert.ok(requests.every((entry) => entry.startsWith("GET /build/api/v1/dex/market/rwa/")), "the fixture must receive only bounded read-only RWA requests");
  console.log(JSON.stringify({
    liveToolMetadataDisclosesCatalogScope: true,
    allThreeLiveToolResultsCarryLocalizedWarning: true,
    englishLiveWarningPreserved: true,
    nativeUiRendersActualLiveWarning: true,
    localReadOnlyProviderFixtureOnly: true,
    passed: true
  }, null, 2));
} finally {
  await client.close().catch(() => undefined);
  await new Promise<void>((resolve) => api.close(() => resolve()));
}
