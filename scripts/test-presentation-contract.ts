import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { renderAssetCard, renderComparisonTable, renderResearchBrief, researchNextSteps } from "../src/presentation/asset-view.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";

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
const filteredComparison = renderComparisonTable(comparison);
assert.match(filteredComparison, /request a quote/);
assert.match(filteredComparison, /Filter status: \*\*Matches filters\*\*/);
assert.match(filteredComparison, /Price-gap rank: \*\*1\*\*/);
assert.doesNotMatch(filteredComparison, /\bEligible\b|Eligibility:/i, "criteria match must not be presented as execution eligibility");
const unfilteredComparison = renderComparisonTable(compareAgentAssets(enriched));
assert.match(unfilteredComparison, /Filter status: \*\*No filters applied\*\*/);
assert.match(unfilteredComparison, /Price-gap rank:/);
assert.match(unfilteredComparison, /Neither indicates tradability or recommends a trade/);
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

const fidelityMarket = {
  ...enriched[0]!.market!,
  tokenPrice: "123.45",
  referencePrice: "234.56",
  priceGap: "-111.11",
  priceGapPercent: "-47.35%",
  liquidity: undefined,
  marketStatus: "unknown" as const,
  openState: true,
  tokenPriceUpdatedAt: 1_790_603_000_123,
  provenance: [{
    provider: "Binance Web3" as const,
    endpoint: "/fixture/rwa/price",
    fields: ["tokenPrice", "referencePrice", "tokenPriceUpdatedAt"],
    responseTimestampMs: 1_790_603_000_200,
    assetUpdatedAtMs: 1_790_603_000_123
  }],
  dataWarnings: ["Liquidity was not provided and must not be interpreted as zero", "The platform did not provide a recognized marketStatus", "Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified"]
};
const fidelityAsset = toAgentAsset(enriched[0]!, fidelityMarket);
const fidelityComparison = compareAgentAssets([fidelityAsset]);
const chineseFidelityCard = renderAssetCard(fidelityAsset, { language: "zh-CN", allowQuoteFollowUp: false });
const englishFidelityCard = renderAssetCard(fidelityAsset, { language: "en", allowQuoteFollowUp: false });
assert.equal(fidelityAsset.market?.liquidity, undefined, "an absent liquidity observation stays absent in structured evidence");
assert.ok(fidelityAsset.dataQuality.missingFields.includes("liquidity"));
assert.ok(fidelityAsset.dataQuality.missingFields.includes("marketStatus"));
assert.match(chineseFidelityCard, /代币观测价格：\*\*123\.45\*\* · 标的参考价格：\*\*234\.56\*\*/);
assert.match(englishFidelityCard, /Observed price: \*\*123\.45\*\* · Reference price: \*\*234\.56\*\*/);
assert.match(chineseFidelityCard, /市场状态未知（上游报告开放标记，但未确认）/);
assert.match(englishFidelityCard, /Market status unknown \(provider open flag is unconfirmed\)/);
assert.match(chineseFidelityCard, /未提供流动性数据；不得将其理解为 0/);
assert.match(englishFidelityCard, /Liquidity was not provided and must not be interpreted as zero/);
assert.match(chineseFidelityCard, /仅凭上游时间戳无法保证行情数据新鲜度；尚未验证行情数据服务等级/);
assert.match(englishFidelityCard, /Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified/);
assert.doesNotMatch(chineseFidelityCard, /流动性(?:数据)?[：:]\s*0(?:\.0+)?/);
assert.doesNotMatch(englishFidelityCard, /liquidity(?: data)?\s*[:=]\s*0(?:\.0+)?/i);

const fidelityNextStepsZh = researchNextSteps([fidelityAsset], fidelityComparison, {
  allowQuoteFollowUp: false,
  allowWalletExposureFollowUp: false,
  language: "zh-CN"
});
const fidelityBriefZh = renderResearchBrief([fidelityAsset], fidelityComparison, undefined, fidelityNextStepsZh, { language: "zh-CN", allowQuoteFollowUp: false });
const fidelityBriefEn = renderResearchBrief([fidelityAsset], fidelityComparison, undefined, [], { language: "en", allowQuoteFollowUp: false });
assert.match(fidelityBriefZh, /代币观测价格：\*\*123\.45\*\* · 标的参考价格：\*\*234\.56\*\*/);
assert.match(fidelityBriefEn, /Observed price: \*\*123\.45\*\* · Reference price: \*\*234\.56\*\*/);
assert.doesNotMatch(fidelityBriefZh, /下一步[^\n]*(?:request a quote|请求报价)/i);

const fidelityViewInput = (query: string) => ({
  query,
  resolvedQuery: "NVDA",
  assets: [fidelityAsset],
  comparison: fidelityComparison,
  outcome: { status: "warning", warnings: fidelityAsset.dataQuality.warnings }
});
const fidelityUiZh = renderResearchView(fidelityViewInput("研究 NVDA；行情未知，不要交易"));
const fidelityUiEn = renderResearchView(fidelityViewInput("Research NVDA; status is unknown, no trading"));
for (const [surface, ui, statusLabel, warning] of [
  ["Chinese", fidelityUiZh, "市场状态未知（上游报告开放标记，但未确认）", "未提供流动性数据；不得将其理解为 0"],
  ["English", fidelityUiEn, "market status unknown (provider open flag is unconfirmed)", "Liquidity was not provided and must not be interpreted as zero"]
] as const) {
  assert.ok(ui.includes("123.45") && ui.includes("234.56"), `${surface} native view retains the separate exact observed/reference prices`);
  assert.ok(ui.includes(statusLabel), `${surface} native view preserves unknown market status`);
  assert.ok(ui.includes(warning), `${surface} native view discloses missing liquidity without converting it to zero`);
  assert.ok(ui.includes(surface === "Chinese" ? "仅凭上游时间戳无法保证行情数据新鲜度；尚未验证行情数据服务等级" : "Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified"), `${surface} native view says provider timestamps do not establish a freshness guarantee`);
  assert.ok(ui.includes("/fixture/rwa/price"), `${surface} native view retains the supplied source endpoint`);
}

console.log(JSON.stringify({
  identityCoverage: identityView.dataQuality.coverage,
  marketCoverage: enriched.map((asset) => asset.dataQuality.coverage.marketContext),
  comparisonUsesStableList: true,
  bilingualEvidenceUnknownAndZeroParity: true,
  nextStepCount: nextSteps.length,
  passed: true
}, null, 2));
