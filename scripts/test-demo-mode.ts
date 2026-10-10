import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";
import { DEMO_CATALOG_SCOPE_WARNING, DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";

const demoCatalogSnapshot = await new DemoTokenizedStocksService({} as any).listSnapshot({ chainId: "56" });
assert.deepEqual(demoCatalogSnapshot.warnings, [DEMO_CATALOG_SCOPE_WARNING], "SDK Demo snapshots must return the explicit limited-synthetic-sample warning");
const demoSearchResults = await new DemoTokenizedStocksService({} as any).search("NVDA", { chainId: "56" });
assert.ok(demoSearchResults.length > 0 && demoSearchResults.every((asset) => asset.collectionWarnings?.includes(DEMO_CATALOG_SCOPE_WARNING)), "SDK Demo search matches must disclose the limited synthetic sample");

const transport = new StdioClientTransport({
  command: "node",
  args: ["--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env, ARIADNE_MODE: "demo", BINANCE_WEB3_API_KEY: "", BINANCE_WEB3_API_SECRET: "" },
  stderr: "pipe"
});
const client = new Client({ name: "ariadne-demo-test", version: "0.1.0" });
await client.connect(transport);
const assertResearchTiming = (payload: Record<string, any>) => {
  const timing = payload.timing;
  assert.ok(timing && [timing.searchMs, timing.marketContextMs, timing.comparisonMs, timing.presentationMs, timing.totalMs].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0));
  const resolution = timing.searchResolution;
  assert.ok(resolution && [resolution.directSearchMs, resolution.catalogReadMs, resolution.catalogMatchMs, resolution.resolvedSearchMs].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0));
  const resolutionMs = resolution.directSearchMs + resolution.catalogReadMs + resolution.catalogMatchMs + resolution.resolvedSearchMs;
  assert.ok(resolutionMs <= timing.searchMs + 5, "substage durations must fit within the enclosing search measurement");
  assert.ok(timing.searchMs + timing.marketContextMs + timing.comparisonMs + timing.presentationMs <= timing.totalMs + 10, "sequential stage durations must fit within total handler time");
  assert.equal(timing.marketContextBatchCalls, 1);
  assert.equal(timing.marketContextAssets, payload.assets.length);
};
const readPayload = (result: Awaited<ReturnType<typeof client.callTool>>) => {
  if (result.structuredContent) return result.structuredContent as Record<string, any>;
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}";
  return JSON.parse(text) as Record<string, any>;
};
const result = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "NVDA", chainId: "56" } });
const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(text);
const payload = JSON.parse(text!);
assert.equal(payload.assets.length, 2);
assert.deepEqual(result.structuredContent, payload, "discovery text and structured content must be identical");
assert.ok(payload.assets.every((asset: Record<string, any>) => asset.metadata.source === "synthetic"));
assert.equal(payload.assets[0].market.dataWarnings[0], "Demo Mode data is synthetic, deterministic, and not live market data");
assert.ok(payload.outcome.warnings.includes("Demo Mode uses a limited synthetic sample and is not a complete live asset catalog"), "Demo MCP must disclose that its fixtures are not a complete live catalog");
assert.ok(payload.assets.every((asset: Record<string, any>) => asset.market.dataWarnings.includes("Demo snapshot timestamp is fixed for reproducibility and may be stale")));
assert.ok(payload.assets.every((asset: Record<string, any>) => asset.market.marketStatus === "unknown" && asset.market.liquidity === undefined));
assert.equal(payload.assets[0].market.tokenPriceUpdatedAt, payload.assets[1].market.tokenPriceUpdatedAt, "both issuer views use one stable fixture timestamp");
assert.ok(payload.presentation.includes("Synthetic Demo Mode fixture; not live market data"));
assert.doesNotMatch(payload.presentation, /request a quote|read-only quote/i, "discovery must not advertise an unavailable standalone quote step");
assert.match(payload.outcome.nextAction, /create a purchase plan only after deciding to continue/i);

const renderedDemoView = renderResearchView(result.structuredContent);
assert.match(renderedDemoView, /Synthetic demo data/);
assert.match(renderedDemoView, /fixed for reproducibility and may be stale/);
assert.match(renderedDemoView, /market status is unknown/i);
assert.match(renderedDemoView, /Liquidity was not provided and must not be interpreted as zero/);
assert.match(renderedDemoView, /Demo Mode uses a limited synthetic sample and is not a complete live asset catalog/, "the native Demo result must disclose that its sample is not a complete live catalog");

const fixtureCounts: Record<string, number> = { NVDA: 2, AAPL: 1, TSLA: 2, MSFT: 2, AMZN: 1, META: 1, COIN: 1 };
for (const [ticker, expectedCount] of Object.entries(fixtureCounts)) {
  const fixtureResult = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: ticker, chainId: "56" } });
  const fixturePayload = JSON.parse((fixtureResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
  assert.equal(fixturePayload.count, expectedCount, `${ticker} should be discoverable from the deterministic Demo catalogue`);
  assert.ok(fixturePayload.assets.every((asset: Record<string, any>) => asset.metadata.source === "synthetic"));
  assert.ok(fixturePayload.assets.every((asset: Record<string, any>) => asset.market.dataWarnings.includes("Demo Mode data is synthetic, deterministic, and not live market data")));
}

const platformFiltered = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "NVDA", chainId: "56", platforms: ["ondo"], includeMarketContext: false } });
const platformFilteredPayload = JSON.parse((platformFiltered.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
assert.equal(platformFilteredPayload.assets.length, 1);
assert.equal(platformFilteredPayload.assets[0].platformId, "ondo");
assert.equal(platformFilteredPayload.assets[0].metadata.source, "synthetic", "Demo identity remains labelled when market context is intentionally omitted");
assert.equal(platformFilteredPayload.assets[0].market, undefined);

const unsupported = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "BTC", chainId: "56" } });
const unsupportedPayload = readPayload(unsupported);
assert.equal(unsupportedPayload.outcome.status, "warning");
assert.equal(unsupportedPayload.assets.length, 0);
assert.equal(unsupportedPayload.presentation, "No specific underlying was identified, so issuer market data was not requested. Browse the BSC catalog first or name a ticker or company.");
assert.ok(unsupportedPayload.nextSteps.every((step: { id: string }) => step.id !== "read_wallet_exposure"), "empty research must not suggest wallet exposure");
assert.match((unsupported.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "", /no specific stock was identified/i);

const issuerComparisonResult = await client.callTool({ name: "compare_asset_representations", arguments: { query: "TSLA", chainId: "56" } });
const issuerComparison = JSON.parse((issuerComparisonResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
assert.deepEqual(issuerComparisonResult.structuredContent, issuerComparison, "comparison text and structured content must be identical");
assert.equal(issuerComparison.comparison.rows.length, 2, "Demo catalogue discovery must expose both seeded TSLA issuers");
assert.deepEqual(issuerComparison.comparison.rows.map((row: Record<string, any>) => row.asset.platformId).sort(), ["bstock", "ondo"]);
assert.match(issuerComparison.presentation, /No filters applied/);
assert.doesNotMatch(issuerComparison.presentation, /request a quote|read-only quote/i, "comparison must not advertise an unavailable standalone quote step");
assert.match(issuerComparison.outcome.nextAction, /create a purchase plan only after deciding to continue/i);

const screeningResult = await client.callTool({
  name: "screen_assets_by_preferences",
  arguments: { query: "TSLA", chainId: "56", preference: { requireMarketPrice: true } }
});
const screening = readPayload(screeningResult);
assert.doesNotMatch(screening.presentation, /request a quote|read-only quote/i, "screening must not advertise an unavailable standalone quote step");
assert.match(screening.outcome.nextAction, /create a purchase plan only after deciding to continue/i);

const wrapperComparisonResult = await client.callTool({ name: "compare_stock_wrappers", arguments: { query: "TSLA", chainId: "56" } });
const wrapperComparison = readPayload(wrapperComparisonResult);
assert.match(wrapperComparison.outcome.nextAction, /create a purchase plan only after deciding to continue/i);

const issuerFilteredComparisonResult = await client.callTool({
  name: "compare_asset_representations",
  arguments: { query: "TSLA", chainId: "56", preference: { platforms: ["ondo"] } }
});
const issuerFilteredComparison = JSON.parse((issuerFilteredComparisonResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
assert.equal(issuerFilteredComparison.comparison.rows.filter((row: Record<string, any>) => row.excludedReasons.length === 0).length, 1);
assert.ok(issuerFilteredComparison.comparison.rows.some((row: Record<string, any>) => row.asset.platformId === "bstock" && row.excludedReasons.length > 0));

const noKnownStatus = await client.callTool({
  name: "research_tokenized_stock",
  arguments: { query: "TSLA", chainId: "56", preference: { requireKnownMarketStatus: true } }
});
const noKnownStatusPayload = readPayload(noKnownStatus);
assert.equal(noKnownStatusPayload.outcome.status, "blocked");
assert.ok(noKnownStatusPayload.comparison.rows.every((row: Record<string, any>) => row.excludedReasons.some((reason: string) => reason.includes("market status is unknown"))));

const detailAsset = payload.assets[0];
const marketDetailResult = await client.callTool({
  name: "get_stock_market_context",
  arguments: {
    chainId: detailAsset.chainId,
    contractAddress: detailAsset.contractAddress,
    platformId: detailAsset.platformId,
    tokenSymbol: detailAsset.tokenSymbol,
    underlyingTicker: detailAsset.underlyingTicker,
    underlyingName: detailAsset.underlyingName
  }
});
const marketDetail = JSON.parse((marketDetailResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
assert.equal(marketDetail.tokenPriceUpdatedAt, detailAsset.market.tokenPriceUpdatedAt);
assert.equal(marketDetail.marketStatus, "unknown");
assert.ok(marketDetail.warnings.includes("Demo Mode data is synthetic, deterministic, and not live market data"));

const unknownDetailResult = await client.callTool({
  name: "get_stock_market_context",
  arguments: {
    chainId: "56",
    contractAddress: "0x0000000000000000000000000000000000000001",
    platformId: "ondo",
    tokenSymbol: "FAKE",
    underlyingTicker: "FAKE",
    underlyingName: "Unknown fixture"
  }
});
assert.equal(unknownDetailResult.isError, true, "Demo Mode must not fabricate a quote for an unregistered identity");

const malformed = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "", chainId: "56" } });
assert.equal(malformed.isError, true, "the MCP schema must reject malformed empty search input before service work");
const naturalLanguageResult = await client.callTool({
  name: "research_tokenized_stock",
  arguments: { query: "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，比较价格和数据缺口；不要交易。", chainId: "56" }
});
const naturalLanguageText = (naturalLanguageResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(naturalLanguageText);
assert.match(naturalLanguageText!, /^市场解读：/);
const naturalLanguage = readPayload(naturalLanguageResult);
assert.equal(naturalLanguage.resolvedQuery, "NVDA");
assert.equal(naturalLanguage.assets.length, 2);
assert.equal(naturalLanguage.outcome.sideEffects, "none");
assertResearchTiming(naturalLanguage);
assert.deepEqual(naturalLanguage.timing.searchResolution.calls, { directSearch: 1, catalogRead: 1, resolvedSearch: 1 });
assert.equal("marketContextFailureCategory" in naturalLanguage.timing, false, "successful demo enrichment must not report a failure category");
assert.match(naturalLanguage.outcome.nextAction, /未请求任何交易后续操作/);
assert.ok(naturalLanguage.nextSteps.every((step: { id: string }) => step.id !== "request_read_only_quote"));
assert.ok(naturalLanguage.nextSteps.every((step: { id: string }) => step.id !== "read_wallet_exposure"));
assert.match(naturalLanguage.presentation, /建议的下一步：\*\*查看证据和数据缺口；决定继续后再明确创建购买计划\*\*/);
assert.doesNotMatch(naturalLanguage.presentation, /下一步：[^\n]*请求报价|获取只读报价/);
assert.match(naturalLanguage.presentation, /研究简报/);
assert.match(naturalLanguage.presentation, /本研究仅为只读查询/);

const englishNoTradingResult = await client.callTool({
  name: "research_tokenized_stock",
  arguments: { query: "Research NVDA on BNB Chain. No trading.", chainId: "56" }
});
const englishNoTradingText = (englishNoTradingResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(englishNoTradingText);
assert.match(englishNoTradingText!, /^Market read:/);
const englishNoTrading = readPayload(englishNoTradingResult);
assert.equal(englishNoTrading.resolvedQuery, "NVDA");
assert.equal(englishNoTrading.outcome.sideEffects, "none");
assert.match(englishNoTrading.outcome.nextAction, /no trading follow-up was requested/);
assert.match(englishNoTrading.presentation, /Ariadne research brief/);
assert.ok(englishNoTrading.nextSteps.every((step: { id: string }) => step.id !== "request_read_only_quote"));
assert.ok(englishNoTrading.nextSteps.every((step: { id: string }) => step.id !== "read_wallet_exposure"));
assert.doesNotMatch(englishNoTrading.presentation, /request a quote/i);

const directResearchResult = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
const directResearchText = (directResearchResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(directResearchText);
const directResearch = readPayload(directResearchResult);
assert.deepEqual(
  naturalLanguage.assets.map((asset: Record<string, any>) => ({ id: asset.assetId, source: asset.metadata.source, market: asset.market })),
  payload.assets.map((asset: Record<string, any>) => ({ id: asset.assetId, source: asset.metadata.source, market: asset.market })),
  "discovery and natural-language research must preserve exact synthetic evidence and timestamps"
);
assertResearchTiming(directResearch);
assert.deepEqual(directResearch.timing.searchResolution.calls, { directSearch: 1, catalogRead: 0, resolvedSearch: 0 }, "a direct ticker research request must use the no-catalog fast path");
assert.ok(directResearch.nextSteps.every((step: { id: string }) => step.id !== "request_read_only_quote"), "ordinary research must never advertise an unavailable standalone quote step");
assert.doesNotMatch(directResearch.presentation, /request a quote|read-only quote/i, "ordinary research must not contain quote CTAs throughout the rendered brief");
assert.match(directResearch.outcome.nextAction, /create a purchase plan only after deciding to continue/i);
const ambiguousResult = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "比较 NVDA 和 TSLA", chainId: "56" } });
const ambiguousText = (ambiguousResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(ambiguousText);
const ambiguous = JSON.parse(ambiguousText!);
assert.equal(ambiguous.outcome.status, "blocked");
assert.deepEqual(ambiguous.candidateTickers.sort(), ["NVDA", "TSLA"]);
const plan = await client.callTool({ name: "prepare_action_from_intent", arguments: { query: "NVDA", type: "buy", walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x0000000000000000000000000000000000000000", amount: "10", amountDecimals: 18, chainId: "56", platformId: "bstock", maxSlippageBps: 50 } });
const planText = (plan.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(planText);
const planPayload = JSON.parse(planText!);
assert.equal(planPayload.outcome.status, "blocked");
assert.match(planPayload.plan.safetyReport.blockingReasons[0], /Demo Mode/);
const forgedPlan = { planId: "forged-plan", status: "awaiting_confirmation", intent: { walletAddress: "0x0000000000000000000000000000000000000000", toAsset: { chainId: "56" } }, unsignedActions: [{ payload: { tx: { from: "0x0000000000000000000000000000000000000000", to: "0x0000000000000000000000000000000000000000", value: "0", data: "0x" } } }] };
const readOutcome = (result: Awaited<ReturnType<typeof client.callTool>>) => JSON.parse((result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text ?? "{}");
const forgedSimulation = readOutcome(await client.callTool({ name: "simulate_stock_action_plan", arguments: { plan: forgedPlan } }));
assert.equal(forgedSimulation.outcome.status, "error");
assert.match(forgedSimulation.summary, /not created in this MCP session/);
const forgedConfirmation = readOutcome(await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: forgedPlan } }));
assert.equal(forgedConfirmation.outcome.status, "error");
const forgedBroadcast = readOutcome(await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: { ...forgedPlan, status: "confirmed" }, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000000" } }));
assert.equal(forgedBroadcast.outcome.status, "error");
assert.match(forgedBroadcast.summary, /not created in this MCP session/);
const forgedRfq = readOutcome(await client.callTool({ name: "submit_signed_rfq_order", arguments: { plan: { ...forgedPlan, status: "confirmed" }, requestId: "00000000-0000-4000-8000-000000000001", userSignature: `0x${"0".repeat(130)}`, vendor: "PcsXRfq", quoteId: "fake-quote" } }));
assert.equal(forgedRfq.outcome.status, "error");
assert.match(forgedRfq.summary, /not created in this MCP session/);
console.log(JSON.stringify({ demoMode: true, discoverableFixtureTickers: Object.keys(fixtureCounts), stableSyntheticSnapshot: true, visibleSyntheticDisclosure: true, unsupportedAndMalformedRequestsBounded: true, issuerAwareComparison: true, detailIdentityBound: true, naturalLanguageResolved: true, ambiguityBlocked: true, actionBlocked: true, forgedPlanRejected: true, passed: true }, null, 2));
await transport.close();
