import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { renderAssetCard, renderResearchBrief, researchNextSteps } from "../src/presentation/asset-view.js";

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
const timing = {
  searchMs: 4,
  marketContextMs: 8,
  comparisonMs: 1,
  presentationMs: 2,
  totalMs: 15,
  marketContextRequests: enriched.length,
  agentReasoningExcluded: true as const
};
const presentation = renderResearchBrief(enriched, comparison, timing, nextSteps);
assert.doesNotMatch(presentation, /\| Rank \| Issuer \|/);
assert.match(presentation, /Representation 1/);
assert.match(presentation, /Evidence coverage/);
assert.match(presentation, /What Ariadne can do next/);
assert.match(presentation, /Ariadne workflow: \*\*15 ms\*\*/);

console.log(JSON.stringify({
  identityCoverage: identityView.dataQuality.coverage,
  marketCoverage: enriched.map((asset) => asset.dataQuality.coverage.marketContext),
  comparisonUsesStableList: true,
  nextStepCount: nextSteps.length,
  passed: true
}, null, 2));
