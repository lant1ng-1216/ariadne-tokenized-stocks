import assert from "node:assert/strict";
import { compareAgentAssets, dataQualityFor, toAgentAsset } from "../src/domain/agent-normalizers.js";
import type { StockAsset } from "../src/domain/types.js";

const base: StockAsset = {
  assetId: "56:0xabc",
  chainId: "56",
  platformId: "bstock",
  contractAddress: "0xabc",
  tokenSymbol: "NVDAB",
  underlyingTicker: "NVDA",
  underlyingName: "NVIDIA Corporation"
};
const market = {
  asset: base,
  tokenPrice: "221.09",
  referencePrice: "220.92",
  priceGap: "0.17",
  priceGapPercent: "0.07695%",
  marketStatus: "unknown" as const,
  openState: true,
  liquidity: "1000000",
  dataWarnings: ["The platform did not provide a recognized marketStatus"]
};
const completeMetadata = { underlyingLogoUrl: "https://example.test/nvda.svg", issuerLogoUrl: "https://example.test/bstock.svg" };
const enriched = toAgentAsset(base, market, {}, completeMetadata);
assert.equal(enriched.issuer.name, "bStocks");
assert.equal(enriched.dataQuality.completeness, "complete");
assert.ok(enriched.links.some((link) => link.label === "explorer"));
assert.equal(dataQualityFor(base, market, {} as any).completeness, "partial");

const ondo = toAgentAsset({ ...base, assetId: "56:0xdef", platformId: "ondo", tokenSymbol: "NVDAon", contractAddress: "0xdef" }, { ...market, priceGapPercent: "0.02%" }, {}, completeMetadata);
const comparison = compareAgentAssets([enriched, ondo], { requireMarketPrice: true, maxPriceGapPercent: "0.05" });
assert.equal(comparison.rows.find((row) => row.rank === 1)?.asset.platformId, "ondo");
assert.equal(comparison.rows.find((row) => row.asset.platformId === "bstock")?.excludedReasons.length, 1);
assert.match(comparison.summary, /1 of 2/);
console.log(JSON.stringify({ model: "agent-native", issuer: enriched.issuer.name, completeness: enriched.dataQuality.completeness, rankedFirst: comparison.rows.find((row) => row.rank === 1)?.asset.platformId, passed: true }, null, 2));
