import assert from "node:assert/strict";
import { enrichAgentAssets, type MarketContextEnrichmentDiagnostics } from "../src/mcp/asset-enrichment.js";
import type { MarketContext, StockAsset } from "../src/domain/types.js";
import { BinanceWeb3Error } from "../src/errors.js";

const first: StockAsset = {
  assetId: "56:0xaaa",
  chainId: "56",
  platformId: "ondo",
  contractAddress: "0xaaa",
  tokenSymbol: "NVDAon",
  underlyingTicker: "NVDA",
  underlyingName: "NVIDIA Corporation"
};
const second: StockAsset = { ...first, assetId: "56:0xbbb", platformId: "bstock", contractAddress: "0xbbb", tokenSymbol: "NVDAB" };
const otherChain: StockAsset = { ...first, assetId: "1:0xaaa", chainId: "1", contractAddress: "0xaaa" };
const makeContext = (asset: StockAsset, timestamp: number): MarketContext => ({
  asset: {
    ...asset,
    tokenName: `${asset.tokenSymbol} issuer token`,
    tokenLogoUrl: `https://example.test/${asset.platformId}-token.svg`,
    issuerLogoUrl: `https://example.test/${asset.platformId}-issuer.svg`,
    issuerWebsite: `https://example.test/${asset.platformId}`
  },
  tokenPrice: String(timestamp),
  tokenPriceUpdatedAt: timestamp,
  marketStatus: "unknown",
  dataWarnings: []
});

let batchCalls = 0;
const received: StockAsset[][] = [];
let successfulDiagnostics: Parameters<NonNullable<Parameters<typeof enrichAgentAssets>[3]>>[0] | undefined;
const enriched = await enrichAgentAssets({
  async marketContexts(assets) {
    batchCalls += 1;
    received.push(assets);
    return [...assets].reverse().map((asset) => makeContext(asset, asset.chainId === "1" ? 300 : asset.contractAddress === second.contractAddress ? 200 : 100));
  }
}, [first, second, otherChain], true, (diagnostics) => { successfulDiagnostics = diagnostics; });
assert.equal(batchCalls, 2, "multi-chain research makes one service batch call per chain so one provider failure is isolated");
assert.deepEqual(received.map((group) => group.map((asset) => asset.assetId)), [[first.assetId, second.assetId], [otherChain.assetId]]);
assert.deepEqual(enriched.map((asset) => asset.market?.tokenPriceUpdatedAt), [100, 200, 300], "results remain attached to exact chain/contract/platform identity despite reordered responses");
assert.ok(enriched.every((asset) => asset.dataQuality.coverage.marketContext === "fetched"));
assert.equal(successfulDiagnostics?.batchCalls, 2);
assert.equal(successfulDiagnostics?.assetsRequested, 3);
assert.equal(successfulDiagnostics?.failedGroups, undefined);
assert.ok(Number.isFinite(successfulDiagnostics?.durationMs));
assert.equal(enriched[0]?.metadata.underlyingLogoUrl, "https://example.test/ondo-token.svg");
assert.equal(enriched[0]?.metadata.issuerLogoUrl, "https://example.test/ondo-issuer.svg");
assert.equal(enriched[0]?.issuer.logoUrl, "https://example.test/ondo-issuer.svg");
assert.ok(enriched.every((asset) => !asset.dataQuality.missingFields.includes("underlyingLogoUrl") && !asset.dataQuality.missingFields.includes("issuerLogoUrl")), "verified market-context logo metadata must reach the Agent asset and quality assessment");

let suppressedCalls = 0;
const withoutMarket = await enrichAgentAssets({
  async marketContexts() { suppressedCalls += 1; return []; }
}, [first, second], false);
assert.equal(suppressedCalls, 0, "includeMarketContext=false must not call the price service");
assert.ok(withoutMarket.every((asset) => asset.dataQuality.coverage.marketContext === "not_requested"));

let networkDiagnostics: MarketContextEnrichmentDiagnostics | undefined;
const unavailable = await enrichAgentAssets({
  async marketContexts() { throw new BinanceWeb3Error("sensitive network detail must not escape", 0, "NETWORK_TIMEOUT", true); }
}, [first, second], true, (diagnostics) => { networkDiagnostics = diagnostics; });
assert.ok(unavailable.every((asset) => asset.dataQuality.coverage.marketContext === "unavailable"));
assert.ok(unavailable.every((asset) => !asset.market), "failed batch must not leave partial or fabricated market context");
assert.ok(unavailable.every((asset) => asset.dataQuality.marketContextFailureCategory === "network_failure"));
assert.ok(unavailable.every((asset) => asset.dataQuality.warnings.some((warning) => warning.includes("provider connection failed"))));
assert.ok(!JSON.stringify(unavailable).includes("sensitive network detail"), "raw exception details must not be exposed in the agent result");
assert.equal(networkDiagnostics?.failureCategory, "network_failure");

const providerFailure = await enrichAgentAssets({
  async marketContexts() { throw new BinanceWeb3Error("provider response detail", 503, 503, true); }
}, [first], true);
assert.equal(providerFailure[0]?.dataQuality.marketContextFailureCategory, "provider_failure");

const unexpectedFailure = await enrichAgentAssets({
  async marketContexts() { throw new Error("internal detail must not escape"); }
}, [first]);
assert.equal(unexpectedFailure[0]?.dataQuality.marketContextFailureCategory, "unexpected_failure");
assert.ok(!JSON.stringify(unexpectedFailure).includes("internal detail"), "unexpected raw errors must remain private");

let isolatedCalls = 0;
let isolatedDiagnostics: MarketContextEnrichmentDiagnostics | undefined;
const isolatedFailure = await enrichAgentAssets({
  async marketContexts(assets) {
    isolatedCalls += 1;
    if (assets[0]?.chainId === "1") throw new BinanceWeb3Error("unsupported chain response", 400, 400, false);
    return assets.map((asset) => makeContext(asset, 250));
  }
}, [first, second, otherChain], true, (diagnostics) => { isolatedDiagnostics = diagnostics; });
assert.equal(isolatedCalls, 2);
assert.equal(isolatedFailure[0]?.dataQuality.coverage.marketContext, "fetched", "a failing chain must not discard successful market data from another chain");
assert.equal(isolatedFailure[1]?.dataQuality.coverage.marketContext, "fetched");
assert.equal(isolatedFailure[2]?.dataQuality.coverage.marketContext, "unavailable");
assert.equal(isolatedFailure[2]?.dataQuality.marketContextFailureCategory, "provider_failure");
assert.equal(isolatedDiagnostics?.failedGroups, 1);
assert.equal(isolatedDiagnostics?.failureCategory, "provider_failure");

const mismatch = await enrichAgentAssets({
  async marketContexts() { return [makeContext(first, 100), makeContext({ ...second, platformId: "other" }, 200)]; }
}, [first, second]);
assert.ok(mismatch.every((asset) => asset.dataQuality.coverage.marketContext === "unavailable"), "issuer mismatch must fail closed for the batch");
assert.ok(mismatch.every((asset) => asset.dataQuality.marketContextFailureCategory === "data_integrity_failure"));

const partial = await enrichAgentAssets({
  async marketContexts() { return [makeContext(first, 100)]; }
}, [first, second]);
assert.ok(partial.every((asset) => asset.dataQuality.coverage.marketContext === "unavailable"), "partial batch responses must not mix fresh and unavailable values");
assert.ok(partial.every((asset) => asset.dataQuality.marketContextFailureCategory === "data_integrity_failure"));

console.log(JSON.stringify({ batchServiceCalls: batchCalls, chainContractIssuerMatching: true, suppressedContextHonored: true, failuresFailClosed: true, sanitizedFailureCategories: true, passed: true }, null, 2));
