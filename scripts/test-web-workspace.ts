import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { researchNextSteps } from "../src/presentation/asset-view.js";
import { buildResearchWorkspaceView } from "../src/web/research-workspace.js";

const service = new DemoTokenizedStocksService({} as any);
const assets = await service.search("NVDA", { chainId: "56" });
const agentAssets = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await service.marketContext(asset))));
const comparison = compareAgentAssets(agentAssets);
const view = buildResearchWorkspaceView(agentAssets, comparison, researchNextSteps(agentAssets, comparison));

assert.equal(view.kind, "tokenized_stock_research");
assert.equal(view.state, "partial");
assert.equal(view.query.ticker, "NVDA");
assert.equal(view.summary.representationsFound, 2);
assert.equal(view.representations.length, 2);
assert.equal(view.representations[0].issuer.logo.status, "unavailable");
  assert.equal(view.representations[0].underlying.logo.status, "unavailable");
  assert.equal(view.representations[0].metadataEvidence.find((item) => item.field === "issuerLogoUrl")?.status, "unavailable");
  assert.match(view.representations[0].metadataEvidence.find((item) => item.field === "issuerLogoUrl")?.explanation ?? "", /does not infer/);
assert.equal(view.representations[0].market.marketStatus, "unknown");
assert.equal(view.boundary.sideEffects, "none");
assert.equal(view.boundary.transactionCreated, false);
assert.ok(view.nextSteps.length > 0);

console.log(JSON.stringify({
  state: view.state,
  representationCount: view.summary.representationsFound,
  warningCount: view.summary.warningCount,
  nextStepCount: view.nextSteps.length,
  readOnly: view.boundary.sideEffects === "none",
  passed: true
}, null, 2));
