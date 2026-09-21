import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { toAgentAsset, compareAgentAssets } from "../src/domain/agent-normalizers.js";
import type { MarketContext, StockAsset } from "../src/domain/types.js";

const demo = new DemoTokenizedStocksService({} as any);
assert.equal((await demo.search("UNKNOWN", { chainId: "56" })).length, 0, "unknown query must stay empty");
assert.equal((await demo.search("NVDA", { chainId: "56" })).length, 2, "demo must expose both issuers");

const base: StockAsset = {
  assetId: "56:0x0000000000000000000000000000000000000001",
  chainId: "56",
  platformId: "bstock",
  contractAddress: "0x0000000000000000000000000000000000000001",
  tokenSymbol: "TESTB",
  underlyingTicker: "TEST",
  underlyingName: "Test Corporation"
};
const missing = toAgentAsset(base, {
  asset: base,
  marketStatus: "unknown",
  openState: true,
  dataWarnings: ["Liquidity was not provided"]
});
assert.equal(missing.dataQuality.completeness, "limited");
assert.ok(missing.dataQuality.missingFields.includes("tokenPrice"));
assert.ok(missing.dataQuality.missingFields.includes("liquidity"));

const closedMarket: MarketContext = {
  asset: base,
  tokenPrice: "100",
  referencePrice: "100",
  priceGap: "0",
  priceGapPercent: "0%",
  marketStatus: "closed",
  openState: false,
  dataWarnings: ["Market is closed"]
};
const closed = toAgentAsset(base, closedMarket);
const closedComparison = compareAgentAssets([closed], { requireKnownMarketStatus: true });
assert.equal(closedComparison.rows[0].excludedReasons.length, 0, "known closed status is still known");
assert.equal(closed.market?.openState, false);

const representations = await demo.search("NVDA", { chainId: "56" });
const assets = await Promise.all(representations.map(async (asset) => toAgentAsset(asset, await demo.marketContext(asset))));
const comparison = compareAgentAssets(assets, { requireMarketPrice: true, requireReferencePrice: true, maxPriceGapPercent: "1" });
assert.equal(comparison.rows.length, 2);
assert.equal(comparison.rows.filter((row) => !row.excludedReasons.length).length, 2);
assert.ok(comparison.rows.every((row) => row.rank));

console.log(JSON.stringify({
  unknownAsset: "empty",
  missingData: missing.dataQuality.completeness,
  closedMarket: closed.market?.openState === false,
  issuerRepresentations: comparison.rows.length,
  passed: true
}, null, 2));
