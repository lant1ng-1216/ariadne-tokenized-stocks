import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { renderAssetCard, renderComparisonTable, renderResearchBrief, researchNextSteps } from "../src/presentation/asset-view.js";

const demo = new DemoTokenizedStocksService({} as any);
const identities = await demo.search("NVDA", { chainId: "56" });
const identityView = toAgentAsset(identities[0]);
assert.equal(identityView.dataQuality.coverage.identity, "confirmed");
assert.equal(identityView.dataQuality.coverage.marketContext, "not_requested");
assert.ok(identityView.dataQuality.warnings.some((warning) => warning.includes("was not requested")));
assert.match(renderAssetCard(identityView), /not requested.*market context|market context.*not requested/i);
const unavailableView = toAgentAsset(identities[0], undefined, {}, {}, { marketContextRequested: true, marketContextUnavailable: true });
assert.equal(unavailableView.dataQuality.coverage.marketContext, "unavailable");
assert.ok(unavailableView.dataQuality.warnings.some((warning) => warning.includes("requested but is unavailable")));

const enriched = await Promise.all(identities.map(async (asset) => toAgentAsset(asset, await demo.marketContext(asset))));
const comparison = compareAgentAssets(enriched, { requireMarketPrice: true });
const nextSteps = researchNextSteps(enriched, comparison);
const researchOnlyNextSteps = researchNextSteps(enriched, comparison, { allowWalletExposureFollowUp: false });
assert.ok(nextSteps.some((step) => step.id === "read_wallet_exposure"), "wallet exposure remains available in the default research workflow");
assert.ok(researchOnlyNextSteps.every((step) => step.id !== "read_wallet_exposure"), "research-only flow can omit the unrelated wallet follow-up");
const timing = {
  searchMs: 4,
  marketContextMs: 8,
  comparisonMs: 1,
  presentationMs: 2,
  totalMs: 15,
  marketContextAssets: enriched.length,
  agentReasoningExcluded: true as const
};
const presentation = renderResearchBrief(enriched, comparison, timing, nextSteps);
const researchOnlyPresentation = renderResearchBrief(enriched, comparison, timing, researchOnlyNextSteps, { allowQuoteFollowUp: false });
assert.doesNotMatch(presentation, /\| Rank \| Issuer \|/);
assert.match(renderComparisonTable(comparison), /request a quote/);
assert.match(researchOnlyPresentation, /Next: review the evidence or data gaps\. No transaction was created\./);
assert.doesNotMatch(researchOnlyPresentation, /request a quote/i, "research-only brief must not contain a quote CTA in nested comparison content");
assert.equal((researchOnlyPresentation.match(/Warnings:/g) ?? []).length, 0, "brief should avoid repeating aggregate warnings after row-level evidence warnings");
assert.match(presentation, /Representation 1/);
assert.match(presentation, /Evidence coverage/);
assert.match(presentation, /What Ariadne can do next/);
assert.match(presentation, /Ariadne workflow: \*\*15 ms\*\*/);
assert.match(renderAssetCard(enriched[0]!), /Data source: \*\*Not supplied\*\*/, "demo data must not claim an upstream provider source it does not carry");
const sourcedAsset = {
  ...enriched[0]!,
  market: {
    ...enriched[0]!.market!,
    tokenPriceUpdatedAt: 1_790_603_000_123,
    provenance: [
    {
      provider: "Binance Web3" as const,
      endpoint: "/api/v1/dex/market/rwa/price",
        fields: ["tokenPrice", "referencePrice", "tokenPriceUpdatedAt"],
      responseTimestampMs: 1_790_603_000_200,
      assetUpdatedAtMs: 1_790_603_000_123
    },
    {
      provider: "Binance Web3" as const,
      endpoint: "/api/v1/dex/market/rwa/tokens",
      fields: ["marketStatus", "openState", "nextOpenTime", "volume24H"],
      responseTimestampMs: 1_790_603_000_300
    }
    ]
  }
};
const sourcedCard = renderAssetCard(sourcedAsset);
assert.match(sourcedCard, /Binance Web3 \/api\/v1\/dex\/market\/rwa\/price/);
assert.match(sourcedCard, /fields: tokenPrice, referencePrice, tokenPriceUpdatedAt/);
assert.match(sourcedCard, /Binance Web3 \/api\/v1\/dex\/market\/rwa\/tokens \[fields: marketStatus, openState, nextOpenTime, volume24H\]/);
assert.match(sourcedCard, /Last update: \*\*2026-09-28T/);
assert.match(sourcedCard, /response 2026-09-28T/);
assert.notEqual(sourcedAsset.market.tokenPriceUpdatedAt, sourcedAsset.market.provenance[0]?.responseTimestampMs, "asset update and API response timestamps remain separate");

console.log(JSON.stringify({
  identityCoverage: identityView.dataQuality.coverage,
  marketCoverage: enriched.map((asset) => asset.dataQuality.coverage.marketContext),
  comparisonUsesStableList: true,
  nextStepCount: nextSteps.length,
  passed: true
}, null, 2));
