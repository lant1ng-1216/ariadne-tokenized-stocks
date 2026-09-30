import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const client = new Client({ name: "ariadne-natural-language-test", version: "0.1.0" });
if (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET) {
  throw new Error("Live MCP acceptance requires credentials from the local .env file");
}
const sdkStocks = new TokenizedStocksService(new BinanceWeb3Client({
  apiKey: process.env.BINANCE_WEB3_API_KEY,
  apiSecret: process.env.BINANCE_WEB3_API_SECRET,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
}));
const sdkAssets = await sdkStocks.search("NVDA", { chainId: "56" });
const sdkContexts = await sdkStocks.marketContexts(sdkAssets);
const sdkIdentity = (asset: { chainId: string; platformId: string; contractAddress: string }) => `${asset.chainId}:${asset.platformId}:${asset.contractAddress.toLowerCase()}`;
assert.ok(sdkAssets.length >= 2, "standalone SDK journey should find multiple NVDA issuer representations");
assert.ok(sdkContexts.every((market) => Number.isFinite(market.tokenPriceUpdatedAt)), "standalone SDK market contexts must retain per-asset timestamps");
assert.ok(sdkContexts.every((market) => market.provenance?.some((source) => source.endpoint === "/api/v1/dex/market/rwa/price")), "standalone SDK must expose the price source endpoint");
const liveEnv = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
liveEnv.ARIADNE_MODE = "live";
const transport = new StdioClientTransport({
  command: "node",
  args: ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: liveEnv,
  stderr: "pipe",
});

try {
  await client.connect(transport);
  const liveTools = await client.listTools();
  const appToolNames = ["discover_tokenized_assets", "research_tokenized_stock"];
  const appToolUris = appToolNames.map((name) => {
    const tool = liveTools.tools.find((candidate) => candidate.name === name);
    assert.ok(tool, `live MCP server must expose ${name}`);
    const metadata = tool._meta as { ui?: { resourceUri?: unknown }; "ui/resourceUri"?: unknown } | undefined;
    const uri = metadata?.ui?.resourceUri ?? metadata?.["ui/resourceUri"];
    assert.equal(typeof uri, "string", `${name} must link to the MCP Apps research resource`);
    assert.match(uri as string, /^ui:\/\//);
    return uri as string;
  });
  assert.equal(new Set(appToolUris).size, 1, "live research and discovery tools must link to the same native UI resource");
  const appResource = await client.readResource({ uri: appToolUris[0]! });
  assert.ok(appResource.contents.some((item) => item.mimeType === "text/html;profile=mcp-app"), "the live server must serve its linked MCP Apps HTML resource");

  const result = await client.callTool({
    name: "research_tokenized_stock",
    arguments: {
      query: "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，比较价格和数据缺口；不要交易。",
      chainId: "56",
    },
  });
  const content = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  assert.ok(content, "MCP must return a text response");
  const payload = JSON.parse(content) as {
    resolvedQuery?: string;
    assets?: Array<{ chainId?: string; platformId?: string; contractAddress?: string; market?: { tokenPriceUpdatedAt?: number; provenance?: Array<{ provider?: string; endpoint?: string; responseTimestampMs?: number; assetUpdatedAtMs?: number }> }; metadata?: { underlyingLogoUrl?: string; issuerLogoUrl?: string }; issuer?: { logoUrl?: string }; dataQuality?: { missingFields?: string[]; warnings?: string[] } }>;
    outcome?: { status?: string; sideEffects?: string; nextAction?: string };
    nextSteps?: Array<{ id: string }>;
    presentation?: string;
    executionBoundary?: string;
    timing?: {
      searchMs?: number;
      searchResolution?: { directSearchMs?: number; catalogReadMs?: number; catalogMatchMs?: number; resolvedSearchMs?: number; calls?: { directSearch?: number; catalogRead?: number; resolvedSearch?: number } };
      marketContextMs?: number;
      marketContextBatchCalls?: number;
      comparisonMs?: number;
      presentationMs?: number;
      totalMs?: number;
    };
  };
  assert.deepEqual(result.structuredContent, payload, "live MCP structuredContent must exactly match the parsed text research payload");
  assert.equal(payload.resolvedQuery, "NVDA", `natural-language research did not resolve NVDA: ${JSON.stringify(payload)}`);
  assert.ok((payload.assets?.length ?? 0) >= 2, "expected issuer representations for NVDA");
  assert.ok(payload.assets?.every((asset) => Number.isFinite(asset.market?.tokenPriceUpdatedAt)), "each live representation must carry the dedicated price endpoint's update timestamp");
  assert.deepEqual(
    payload.assets?.map((asset) => sdkIdentity(asset as Required<Pick<typeof asset, "chainId" | "platformId" | "contractAddress">>)).sort(),
    sdkAssets.map(sdkIdentity).sort(),
    "standalone SDK and natural-language MCP must return the same exact representation identities"
  );
  assert.ok(payload.assets?.every((asset) => {
    const market = asset.market;
    return market?.provenance?.some((source) => source.provider === "Binance Web3" && source.endpoint === "/api/v1/dex/market/rwa/price" && source.assetUpdatedAtMs === market.tokenPriceUpdatedAt);
  }), "MCP must expose the provider, price endpoint and distinct per-asset update time");
  assert.ok(payload.assets?.every((asset) => asset.market?.provenance?.some((source) => source.endpoint === "/api/v1/dex/market/rwa/tokens")), "MCP must identify the catalog source for status and volume fields");
  assert.ok(payload.assets?.every((asset) => asset.metadata?.underlyingLogoUrl && asset.metadata.issuerLogoUrl && asset.issuer?.logoUrl), "research must preserve market-context underlying/issuer logos");
  assert.notEqual(payload.outcome?.status, "error");
  assert.equal(payload.outcome?.sideEffects, "none");
  assert.ok(payload.timing && [payload.timing.searchMs, payload.timing.marketContextMs, payload.timing.comparisonMs, payload.timing.presentationMs, payload.timing.totalMs].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0));
  const resolverCalls = payload.timing?.searchResolution?.calls;
  assert.equal(resolverCalls?.directSearch, 1);
  assert.ok(resolverCalls?.catalogRead === 0 || resolverCalls?.catalogRead === 1);
  assert.ok(resolverCalls?.resolvedSearch === 0 || resolverCalls?.resolvedSearch === 1);
  assert.ok(resolverCalls?.catalogRead || !resolverCalls?.resolvedSearch, "a ticker follow-up search must not occur without a preceding catalog read");
  assert.ok(payload.timing?.searchResolution && Object.values(payload.timing.searchResolution).slice(0, 4).every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0));
  assert.equal(payload.timing?.marketContextBatchCalls, 1);
  const searchResolution = payload.timing!.searchResolution!;
  const measuredSearchMs = searchResolution.directSearchMs! + searchResolution.catalogReadMs! + searchResolution.catalogMatchMs! + searchResolution.resolvedSearchMs!;
  assert.ok(measuredSearchMs <= payload.timing!.searchMs! + 2, "resolution substages must be accounted for by the enclosing search duration");
  assert.ok(payload.timing!.searchMs! + payload.timing!.marketContextMs! + payload.timing!.comparisonMs! + payload.timing!.presentationMs! <= payload.timing!.totalMs! + 2, "measured stages must be accounted for by the total handler duration");
  assert.match(payload.outcome?.nextAction ?? "", /no trading follow-up was requested/);
  assert.ok(payload.nextSteps?.every((step) => step.id !== "request_read_only_quote"));
  assert.ok(payload.nextSteps?.every((step) => step.id !== "read_wallet_exposure"));
  assert.match(payload.presentation ?? "", /Preferred next step: \*\*review the evidence and data gaps\*\*/);
  assert.doesNotMatch(payload.presentation ?? "", /request a quote/i, "no-trade research brief must not contain quote CTAs in nested sections");
  assert.match(payload.executionBoundary ?? "", /No quote, signature, transaction or broadcast/);
  assert.match(payload.presentation ?? "", /Data source: \*\*Binance Web3 \/api\/v1\/dex\/market\/rwa\/price/);
  assert.equal(liveEnv.ARIADNE_MODE, "live");

  const discoveryResult = await client.callTool({
    name: "discover_tokenized_assets",
    arguments: { query: "我想看 BNB Chain 上英伟达有哪些代币化股票发行方；不要交易。", chainId: "56" }
  });
  const discoveryText = (discoveryResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  assert.ok(discoveryText, "live asset discovery must return text");
  const discovery = JSON.parse(discoveryText!) as {
    assets?: Array<{ market?: { tokenPriceUpdatedAt?: number; provenance?: Array<{ provider?: string; endpoint?: string }> }; metadata?: { underlyingLogoUrl?: string; issuerLogoUrl?: string }; issuer?: { logoUrl?: string }; dataQuality?: { coverage?: { marketContext?: string } } }>;
    outcome?: { sideEffects?: string };
    presentation?: string;
  };
  assert.deepEqual(discoveryResult.structuredContent, discovery, "live discovery structuredContent must exactly match its text payload");
  assert.ok((discovery.assets?.length ?? 0) >= 2, "live discovery should return issuer representations");
  assert.ok(discovery.assets?.every((asset) => Number.isFinite(asset.market?.tokenPriceUpdatedAt)), "discovery must use timestamped market contexts for all representations");
  assert.ok(discovery.assets?.every((asset) => asset.market?.provenance?.some((source) => source.provider === "Binance Web3" && source.endpoint === "/api/v1/dex/market/rwa/price")), "discovery must retain the exact market-data source");
  assert.ok(discovery.assets?.every((asset) => asset.metadata?.underlyingLogoUrl && asset.metadata.issuerLogoUrl && asset.issuer?.logoUrl), "discovery must preserve market-context underlying/issuer logos");
  assert.ok(discovery.assets?.every((asset) => asset.dataQuality?.coverage?.marketContext === "fetched"));
  assert.equal(discovery.outcome?.sideEffects, "none");
  assert.doesNotMatch(discovery.presentation ?? "", /request a quote/i, "no-trade discovery must not suggest a quote");

  console.log(JSON.stringify({ mode: "live", standaloneSdkJourney: true, sdkMcpIdentityParity: true, sourceAndTimestampProvenance: true, liveTextStructuredParity: true, liveAppResourceLinked: true, naturalLanguageResearch: true, liveAssetDiscovery: true, resolvedQuery: payload.resolvedQuery, representations: payload.assets?.length, status: payload.outcome?.status, sideEffects: payload.outcome?.sideEffects, passed: true }, null, 2));
} finally {
  await client.close();
}
