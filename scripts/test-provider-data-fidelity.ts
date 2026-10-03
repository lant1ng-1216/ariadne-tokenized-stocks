import assert from "node:assert/strict";
import type { BinanceWeb3Client } from "../src/binance-web3-client.js";
import type { ActionPlan } from "../src/domain/types.js";
import { evaluateSafety } from "../src/domain/safety.js";
import { normalizeMarketContext, normalizeStockAsset } from "../src/domain/normalizers.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { renderAssetCard, renderComparisonTable, renderResearchBrief, researchNextSteps } from "../src/presentation/asset-view.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const token = {
  binanceChainId: "56",
  tokenContractAddress: "0x1111111111111111111111111111111111111111",
  platformId: "ondo",
  tokenSymbol: "TESTon",
  underlyingTicker: "TEST",
  underlyingName: "Synthetic Test Asset",
  assetType: 2,
  tokenPrice: "12.50",
  referencePrice: "12.25",
  liquidity: "250000.00",
  volume24H: "54321.75",
  holders: 101,
  statusInfo: {
    openState: false,
    marketStatus: "pause",
    reasonCode: "ASSET_PAUSED",
    reasonMsg: "Halted <for review> & fixture only",
    nextOpenTime: 1_800_000_000_000,
    nextCloseTime: 1_800_003_600_000
  }
};
const client = {
  async get(path: string, params?: Record<string, string>) {
    if (path === "/api/v1/dex/market/rwa/search") {
      const assetType = params?.keyword === "FUTURE" ? 77 : params?.keyword === "NO_TYPE" ? undefined : token.assetType;
      return { data: [{ ticker: params?.keyword ?? "TEST", companyName: token.underlyingName, assets: [{
        platformId: token.platformId,
        binanceChainId: token.binanceChainId,
        tokenContractAddress: token.tokenContractAddress,
        tokenSymbol: token.tokenSymbol,
        assetType
      }] }] };
    }
    if (path === "/api/v1/dex/market/rwa/tokens") return { data: [token], timestamp: 1_800_000_100_000 };
    if (path === "/api/v1/dex/market/rwa/price") return { data: [{ ...token, tokenPriceUpdatedAt: 1_800_000_300_000 }], timestamp: 1_800_000_200_000 };
    if (path === "/api/v1/dex/market/rwa/platforms") return { data: [{
      platformId: "ondo",
      tickerCount: 1,
      chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }]
    }] };
    throw new Error(`Unexpected synthetic-only request path: ${path}`);
  }
} as unknown as BinanceWeb3Client;

const service = new TokenizedStocksService(client);
const searchResults = await service.search("TEST", { chainId: "56" });
const listing = (await service.listSnapshot({ chainId: "56" })).listings[0];
assert.ok(listing);
assert.equal(searchResults[0]?.assetType, 2, "search preserves the source Pre-IPO code");
assert.equal(listing.assetType, 2, "directory preserves the source Pre-IPO code");
assert.equal(listing.market.marketStatus, "closed", "provider pause remains conservatively non-tradable");
assert.equal(listing.market.providerMarketStatus, "pause", "the exact provider enum is retained separately");
assert.equal(listing.market.openState, false);
assert.equal(listing.market.reasonCode, "ASSET_PAUSED");
assert.equal(listing.market.reasonMsg, token.statusInfo.reasonMsg);
assert.equal(listing.market.nextOpenTime, token.statusInfo.nextOpenTime);
assert.equal(listing.market.nextCloseTime, token.statusInfo.nextCloseTime);
const agentAsset = toAgentAsset(searchResults[0]!, listing.market);
const fractionalTypeAsset = { ...agentAsset, assetType: 2.5 };
assert.doesNotMatch(renderAssetCard(fractionalTypeAsset), /Asset type:/, "Agent text does not label fractional values as asset-type codes");
assert.doesNotMatch(renderResearchView({
  query: "Research TEST",
  resolvedQuery: "TEST",
  assets: [fractionalTypeAsset],
  comparison: compareAgentAssets([fractionalTypeAsset]),
  outcome: { status: "warning", warnings: [], sideEffects: "none" }
}), /asset-type-badge/, "native UI does not label fractional values as asset-type codes");
const structuredContent = JSON.parse(JSON.stringify({ assets: [agentAsset] })) as { assets: Array<typeof agentAsset> };
const comparison = compareAgentAssets([agentAsset]);

const futureTypeResult = await service.search("FUTURE");
assert.equal(futureTypeResult[0]?.assetType, 77, "unrecognized numeric asset-type codes are not relabeled as Stock");
assert.equal(normalizeStockAsset({
  binanceChainId: "56",
  tokenContractAddress: "0xfractional",
  assetType: 2.5
}).assetType, undefined, "fractional values are not accepted as integer provider asset-type codes");
for (const [assetType, englishLabel, chineseLabel] of [
  [1, "Stock (1)", "股票 (1)"],
  [2, "Pre-IPO (2)", "Pre-IPO (2)"],
  [3, "ETF (3)", "ETF (3)"],
  [77, "Unknown type (77)", "未知类型 (77)"]
] as const) {
  const normalized = normalizeStockAsset({
    binanceChainId: "56",
    tokenContractAddress: `0x${String(assetType).padStart(40, "0")}`,
    assetType
  });
  assert.equal(normalized.assetType, assetType, `domain normalization preserves asset type ${assetType}`);
  const typedAsset = { ...toAgentAsset(searchResults[0]!, listing.market), assetType };
  const typedComparison = compareAgentAssets([typedAsset]);
  assert.ok(renderAssetCard(typedAsset, { language: "en", allowQuoteFollowUp: false }).includes(englishLabel));
  assert.ok(renderAssetCard(typedAsset, { language: "zh-CN", allowQuoteFollowUp: false }).includes(chineseLabel));
  const typedNativeView = renderResearchView({
    query: "Research TEST",
    resolvedQuery: "TEST",
    assets: [typedAsset],
    comparison: typedComparison,
    outcome: { status: "warning", warnings: [], sideEffects: "none" }
  });
  assert.ok(typedNativeView.includes(englishLabel), `native MCP UI labels asset type ${assetType}`);
}
const searchWithoutType = (await service.search("NO_TYPE", { chainId: "56" }))[0];
assert.ok(searchWithoutType);
const recoveredMarket = await service.marketContext(searchWithoutType);
assert.equal(recoveredMarket.asset.assetType, 2, "market-context path recovers assetType from the documented token-list item");
assert.equal(recoveredMarket.marketStatus, "closed", "marketContext returns the conservative normalized status");
assert.equal(recoveredMarket.providerMarketStatus, "pause", "marketContext preserves the exact provider enum");
assert.equal(recoveredMarket.openState, false);
assert.equal(recoveredMarket.reasonCode, "ASSET_PAUSED");
assert.equal(recoveredMarket.reasonMsg, token.statusInfo.reasonMsg);
assert.equal(recoveredMarket.nextOpenTime, token.statusInfo.nextOpenTime);
assert.equal(recoveredMarket.nextCloseTime, token.statusInfo.nextCloseTime);
assert.equal(recoveredMarket.tokenPrice, "12.50");
assert.equal(recoveredMarket.referencePrice, "12.25");
assert.equal(recoveredMarket.priceGap, "0.25");
assert.equal(recoveredMarket.priceGapPercent, "2.040816326530612244%");
assert.equal(recoveredMarket.tokenPriceUpdatedAt, 1_800_000_300_000);
assert.equal(recoveredMarket.volume24H, "54321.75");
assert.equal(recoveredMarket.liquidity, "250000.00");
assert.equal(recoveredMarket.holders, 101);
const marketContextAgent = toAgentAsset(recoveredMarket.asset, recoveredMarket);
assert.deepEqual(marketContextAgent.market, recoveredMarket, "all supported market-context fields remain exact in the Agent asset");
assert.equal(marketContextAgent.assetType, 2);
assert.equal(marketContextAgent.market?.providerMarketStatus, "pause");
assert.equal(marketContextAgent.market?.reasonMsg, token.statusInfo.reasonMsg);
const marketContextCardEn = renderAssetCard(marketContextAgent, { language: "en", allowQuoteFollowUp: false });
assert.match(marketContextCardEn, /Provider status: pause/);
assert.match(marketContextCardEn, /Reason code: ASSET\\_PAUSED/);
assert.match(marketContextCardEn, /Provider note: Halted \\<for review\\> & fixture only/);
assert.match(marketContextCardEn, /Provider open-state flag: false/);
assert.match(marketContextCardEn, /24h volume: 54321\\\.75/);
assert.match(marketContextCardEn, /Provider liquidity field: 250000\\\.00/);
assert.match(marketContextCardEn, /Provider holder-count field: 101/);
assert.match(marketContextCardEn, new RegExp(`Next open: ${new Date(token.statusInfo.nextOpenTime).toISOString()}`));
assert.match(marketContextCardEn, new RegExp(`Next close: ${new Date(token.statusInfo.nextCloseTime).toISOString()}`));
const marketContextNativeView = renderResearchView({
  query: "Research TEST",
  resolvedQuery: "TEST",
  assets: [marketContextAgent],
  comparison: compareAgentAssets([marketContextAgent]),
  outcome: { status: "warning", warnings: [], sideEffects: "none" }
});
assert.match(marketContextNativeView, /Provider status: pause/);
assert.match(marketContextNativeView, /Reason code: ASSET_PAUSED/);
assert.match(marketContextNativeView, /Provider note: Halted &lt;for review&gt; &amp; fixture only/);
assert.match(marketContextNativeView, /Provider open-state flag: false/);
assert.match(marketContextNativeView, /24h volume: 54321\.75/);
assert.match(marketContextNativeView, /Provider liquidity field: 250000\.00/);
assert.match(marketContextNativeView, /Provider holder-count field: 101/);
assert.ok(marketContextNativeView.includes(new Date(token.statusInfo.nextCloseTime).toISOString()));
const tokenProvenance = recoveredMarket.provenance?.find((entry) => entry.endpoint.endsWith("/rwa/tokens"));
const priceProvenance = recoveredMarket.provenance?.find((entry) => entry.endpoint.endsWith("/rwa/price"));
assert.equal(priceProvenance?.responseTimestampMs, 1_800_000_200_000, "price envelope timestamp stays distinct from per-asset quote time");
assert.equal(priceProvenance?.assetUpdatedAtMs, 1_800_000_300_000);
assert.equal(tokenProvenance?.responseTimestampMs, 1_800_000_100_000);
assert.ok(tokenProvenance?.fields.includes("assetType"));
assert.ok(tokenProvenance?.fields.includes("reasonCode"));
assert.ok(tokenProvenance?.fields.includes("reasonMsg"));
assert.ok(tokenProvenance?.fields.includes("nextCloseTime"));
const unknownMarket = normalizeMarketContext(listing, { statusInfo: { marketStatus: "future-status" } });
assert.equal(unknownMarket.marketStatus, "unknown");
assert.equal(unknownMarket.providerMarketStatus, "future-status", "unrecognized status remains visible as raw source data");
assert.equal(normalizeMarketContext(listing, { statusInfo: { nextOpenTime: "1800000000000", nextCloseTime: Number.NaN } }).nextOpenTime, undefined);
assert.equal(normalizeMarketContext(listing, { statusInfo: { nextCloseTime: 8_640_000_000_000_001 } }).nextCloseTime, undefined);
for (const invalidTimestamp of [0, -1, 1.5, 8_640_000_000_000_001, Number.POSITIVE_INFINITY]) {
  const invalidTimestampContext = normalizeMarketContext(listing, {
    tokenPriceUpdatedAt: invalidTimestamp,
    statusInfo: { nextOpenTime: invalidTimestamp, nextCloseTime: invalidTimestamp }
  });
  assert.equal(invalidTimestampContext.tokenPriceUpdatedAt, undefined, "invalid quote timestamps are withheld");
  assert.equal(invalidTimestampContext.nextOpenTime, undefined, "invalid next-open timestamps are withheld");
  assert.equal(invalidTimestampContext.nextCloseTime, undefined, "invalid next-close timestamps are withheld");
  assert.ok(invalidTimestampContext.dataWarnings.some((warning) => /quote timestamp is invalid/.test(warning)));
}

assert.equal(structuredContent.assets[0]?.assetType, 2);
assert.equal(structuredContent.assets[0]?.market?.reasonCode, "ASSET_PAUSED");
assert.equal(structuredContent.assets[0]?.market?.reasonMsg, token.statusInfo.reasonMsg);

const safeNextSteps = researchNextSteps([agentAsset], comparison, { allowQuoteFollowUp: false, allowWalletExposureFollowUp: false });
const briefEn = renderResearchBrief([agentAsset], comparison, undefined, safeNextSteps, { language: "en", allowQuoteFollowUp: false });
const cardZh = renderAssetCard(agentAsset, { language: "zh-CN", allowQuoteFollowUp: false });
const comparisonEn = renderComparisonTable(comparison, { language: "en", allowQuoteFollowUp: false });
assert.match(briefEn, /Asset type: \*\*Pre-IPO \(2\)\*\*/);
assert.match(briefEn, /Provider status: pause/);
assert.match(briefEn, /Reason code: ASSET\\_PAUSED/);
assert.match(briefEn, /Provider note: Halted \\<for review\\> & fixture only/);
assert.match(briefEn, new RegExp(`Next open: ${new Date(token.statusInfo.nextOpenTime).toISOString()}`));
assert.match(briefEn, new RegExp(`Next close: ${new Date(token.statusInfo.nextCloseTime).toISOString()}`));
assert.match(cardZh, /资产类型：\*\*Pre-IPO \(2\)\*\*/);
assert.match(cardZh, /上游状态：pause/);
assert.match(cardZh, /原因代码：ASSET\\_PAUSED/);
assert.match(comparisonEn, /Provider status: pause/);
assert.match(comparisonEn, /Asset type: \*\*Pre-IPO \(2\)\*\*/);
const markdownAttack = renderAssetCard({ ...agentAsset, market: { ...agentAsset.market!, reasonMsg: "Paused\n\n# forged section\n- forged instruction" } }, { language: "en", allowQuoteFollowUp: false });
assert.ok(!markdownAttack.includes("\n\n# forged section"), "provider notes cannot create Markdown sections");
assert.ok(!markdownAttack.includes("\n- forged instruction"), "provider notes cannot inject Markdown list items");

const nativeView = renderResearchView({
  query: "Research TEST",
  resolvedQuery: "TEST",
  assets: structuredContent.assets,
  comparison,
  outcome: { status: "warning", warnings: [], sideEffects: "none" }
});
assert.match(nativeView, /Pre-IPO \(2\)/);
assert.match(nativeView, /class="provider-market-details"/);
assert.match(nativeView, /Provider status: pause/);
assert.match(nativeView, /Reason code: ASSET_PAUSED/);
assert.match(nativeView, /Provider note: Halted &lt;for review&gt; &amp; fixture only/, "provider text is escaped in HTML while the structured field stays exact");
assert.ok(nativeView.includes(new Date(token.statusInfo.nextCloseTime).toISOString()));
assert.match(nativeView, /class="market-status"[^>]*>closed</, "the native card uses the conservative normalized state");
const conflictMarket = { ...recoveredMarket, marketStatus: "open" as const, openState: false };
const conflictAgent = toAgentAsset(recoveredMarket.asset, conflictMarket);
const conflictNativeView = renderResearchView({
  query: "Research TEST",
  resolvedQuery: "TEST",
  assets: [conflictAgent],
  comparison: compareAgentAssets([conflictAgent]),
  outcome: { status: "warning", warnings: [], sideEffects: "none" }
});
assert.match(conflictNativeView, /Not open \(provider status fields conflict\)/, "native UI cannot imply an open market when openState is false");
assert.match(renderAssetCard(conflictAgent, { language: "en", allowQuoteFollowUp: false }), /Not open \(provider status fields conflict\)/);
assert.match(renderAssetCard(conflictAgent, { language: "zh-CN", allowQuoteFollowUp: false }), /非开放（上游状态字段矛盾）/);
const invalidTimestampAsset = { ...agentAsset, market: { ...agentAsset.market!, tokenPriceUpdatedAt: Number.POSITIVE_INFINITY } };
assert.doesNotThrow(() => renderAssetCard(invalidTimestampAsset, { language: "en", allowQuoteFollowUp: false }), "an invalid injected quote timestamp cannot crash Agent rendering");
assert.match(renderAssetCard(invalidTimestampAsset, { language: "en", allowQuoteFollowUp: false }), /No valid source timestamp supplied/);
const invalidTimestampUiAsset = { ...agentAsset, market: { ...agentAsset.market!, tokenPriceUpdatedAt: 1.5, nextOpenTime: 1.5, nextCloseTime: 0 } };
const invalidTimestampNativeView = renderResearchView({
  query: "Research TEST",
  resolvedQuery: "TEST",
  assets: [invalidTimestampUiAsset],
  comparison: compareAgentAssets([invalidTimestampUiAsset]),
  outcome: { status: "warning", warnings: [], sideEffects: "none" }
});
assert.ok(invalidTimestampNativeView.includes("No source timestamp supplied"));
assert.ok(!invalidTimestampNativeView.includes("1970-01-01"), "native UI does not render fractional/zero provider timestamps as dates");

const actionPlan = { intent: { toAsset: listing } } as unknown as ActionPlan;
const pauseSafety = evaluateSafety({ plan: actionPlan, market: listing.market });
assert.equal(pauseSafety.passed, false, "the normalized provider pause remains a blocking closed-market state");
assert.ok(pauseSafety.blockingReasons.some((reason) => /closed or halted/.test(reason)));
const unknownStatusSafety = evaluateSafety({ plan: actionPlan, market: unknownMarket });
assert.equal(unknownStatusSafety.passed, false, "unknown market status must block an executable plan");
assert.ok(unknownStatusSafety.blockingReasons.some((reason) => /market status is unknown/i.test(reason)));
const conflictingOpenSafety = evaluateSafety({ plan: actionPlan, market: conflictMarket });
assert.equal(conflictingOpenSafety.passed, false, "contradictory provider market fields fail closed");
assert.ok(conflictingOpenSafety.blockingReasons.some((reason) => /marketstatus and openstate conflict/i.test(reason)));

console.log(JSON.stringify({
  searchAndDirectoryAssetTypeParity: true,
  unknownAssetTypePreserved: true,
  allDocumentedAssetTypesAndUnknownLabeledAcrossCards: true,
  marketContextAssetTypeFallbackAndProvenanceParity: true,
  marketContextAllFieldsPreservedAcrossAgentAndNativeUi: true,
  contradictoryMarketFlagsFailClosedAndRenderConservatively: true,
  completeMarketContextValuesAndDistinctSourceTimesVerified: true,
  quoteAndMarketTimestampsRequirePositiveSafeMilliseconds: true,
  nativeUiRejectsInvalidProviderTimes: true,
  detailedProviderStatusAndReasonParity: true,
  englishChineseAgentTextAndComparison: true,
  structuredContentAndNativeUiParity: true,
  hostileProviderTextEscapedInUi: true,
  hostileMarkdownProviderTextIsolated: true,
  invalidProviderTimestampsWithheld: true,
  pauseStillBlocksSafety: true,
  unknownStatusRemainsUnknownAndBlocksExecution: true,
  passed: true
}, null, 2));
