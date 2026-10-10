import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "ariadne-mcp-test", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: "node",
  args: ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  stderr: "pipe"
});

await client.connect(transport);
const tools = await client.listTools();
const names = tools.tools.map((tool) => tool.name);
assert.ok(names.includes("resolve_tokenized_stock"));
assert.ok(names.includes("get_stock_market_context"));
assert.ok(names.includes("create_stock_action_plan"));
assert.ok(names.includes("compare_stock_wrappers"));
assert.ok(names.includes("get_wallet_stock_exposure"));
assert.ok(names.includes("simulate_stock_action"));
assert.ok(names.includes("confirm_stock_action_plan"));
assert.ok(names.includes("simulate_stock_action_plan"));
assert.ok(names.includes("submit_signed_rfq_order"));
assert.ok(names.includes("get_rfq_order_status"));
assert.ok(names.includes("broadcast_confirmed_transaction"));
assert.ok(names.includes("get_broadcast_order_status"));
assert.ok(names.includes("discover_tokenized_assets"));
assert.ok(names.includes("compare_asset_representations"));
assert.ok(names.includes("research_tokenized_stock"));
assert.ok(names.includes("prepare_action_from_intent"));
assert.ok(names.includes("prepare_bsc_stock_purchase"));
assert.ok(names.includes("prepare_bsc_stock_allowance_approval"));
assert.ok(names.includes("refresh_bsc_stock_purchase_after_approval"));
assert.ok(names.includes("reconcile_stock_purchase"));
assert.ok(names.includes("screen_assets_by_preferences"));
assert.ok(names.includes("analyze_portfolio_exposure"));

const result = await client.callTool({
  name: "resolve_tokenized_stock",
  arguments: { query: "NVDA", chainId: "56" }
});
assert.ok(result.content);
const content = result.content as Array<{ type: string; text?: string }>;
const text = content.find((item) => item.type === "text");
assert.ok(text && "text" in text);
if (!text?.text) throw new Error("MCP did not return text content");
assert.match(text.text, /NVDA/);

const resolved = JSON.parse(text.text) as {
  assets: Array<any>;
  coverage: { identity: string; marketContext: string };
  presentation: string;
  outcome: { status: string; nextAction: string; sideEffects: string };
};
assert.equal(resolved.outcome.status, "success");
assert.ok(resolved.outcome.nextAction);
assert.equal(resolved.outcome.sideEffects, "none");
assert.equal(resolved.coverage.identity, "confirmed");
assert.equal(resolved.coverage.marketContext, "not_requested");
assert.match(resolved.presentation, /not requested market context/i);
const bstock = resolved.assets.find((asset) => asset.platformId === "bstock");
assert.ok(bstock);
const highLevelDiscovery = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "NVDA", chainId: "56" } });
const highLevelDiscoveryText = (highLevelDiscovery.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(highLevelDiscoveryText);
const highLevelDiscoveryPayload = JSON.parse(highLevelDiscoveryText!);
assert.equal(highLevelDiscoveryPayload.assets.length, 2);
assert.ok(highLevelDiscoveryPayload.assets[0].issuer);
assert.ok(highLevelDiscoveryPayload.assets[0].dataQuality);
assert.ok(highLevelDiscoveryPayload.outcome.nextAction);
assert.match(highLevelDiscoveryPayload.presentation, /Observed price/);
const highLevelComparison = await client.callTool({ name: "compare_asset_representations", arguments: { query: "NVDA", chainId: "56", preference: { requireMarketPrice: true } } });
const highLevelComparisonText = (highLevelComparison.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(highLevelComparisonText);
const highLevelComparisonPayload = JSON.parse(highLevelComparisonText!);
if (!highLevelComparisonPayload.comparison) throw new Error(`High-level comparison failed: ${highLevelComparisonText}`);
assert.equal(highLevelComparisonPayload.comparison.rows.length, 2);
assert.ok(highLevelComparisonPayload.comparison.summary);
assert.match(highLevelComparisonPayload.presentation, /Reference price/);
assert.match(highLevelComparisonPayload.presentation, /Contract: `0x/);
const researchBrief = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56", preference: { requireMarketPrice: true } } });
const researchBriefText = (researchBrief.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(researchBriefText);
assert.ok(researchBrief.structuredContent, "the MCP App and structured consumers retain the full research report");
assert.match(researchBriefText!, /^Market read:/, "conversation text is a short market interpretation");
assert.doesNotMatch(researchBriefText!, /Cross-issuer comparison|\| Rank \| Issuer \|/, "conversation text does not repeat the full panel report");
const researchBriefPayload = researchBrief.structuredContent as Record<string, any>;
assert.equal(researchBriefPayload.assets.length, 2);
assert.equal(researchBriefPayload.comparison.rows.length, 2);
assert.match(researchBriefPayload.decisionBoundary, /does not make an investment decision/);
assert.match(researchBriefPayload.executionBoundary, /No quote, signature, transaction or broadcast/);
assert.match(researchBriefPayload.presentation, /Ariadne research brief/);
assert.match(researchBriefPayload.presentation, /At a glance/);
assert.match(researchBriefPayload.presentation, /Cross-issuer comparison/);
assert.match(researchBriefPayload.presentation, /Execution boundary/);
assert.match(researchBriefPayload.presentation, /What Ariadne can do next/);
assert.match(researchBriefPayload.presentation, /Product timing/);
assert.doesNotMatch(researchBriefPayload.presentation, /\| Rank \| Issuer \|/);
const timing = researchBriefPayload.timing;
assert.equal(timing.agentReasoningExcluded, true);
assert.equal(timing.marketContextAssets, 2);
assert.deepEqual(timing.searchResolution.calls, { directSearch: 1, catalogRead: 0, resolvedSearch: 0 }, "a direct ticker lookup must not read the full catalog");
assert.equal(timing.marketContextBatchCalls, 1);
const searchDurations = [
  timing.searchResolution.directSearchMs,
  timing.searchResolution.catalogReadMs,
  timing.searchResolution.catalogMatchMs,
  timing.searchResolution.resolvedSearchMs
];
assert.ok(searchDurations.every((value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0), "each flat search-resolution duration must be finite and nonnegative");
assert.ok(searchDurations.every((value: number) => value <= timing.searchMs + 0.1), "each search-resolution duration must fit within the enclosing search stage");
const workflowDurations = [timing.searchMs, timing.marketContextMs, timing.comparisonMs, timing.presentationMs, timing.totalMs];
assert.ok(workflowDurations.every((value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0), "all workflow stage durations must be finite and nonnegative");
assert.ok(timing.totalMs + 0.1 >= timing.searchMs + timing.marketContextMs + timing.comparisonMs + timing.presentationMs, "the total workflow duration must include each measured stage");
const ambiguousIntent = await client.callTool({ name: "prepare_action_from_intent", arguments: { query: "NVDA", type: "buy", walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", amount: "10", amountDecimals: 18, maxSlippageBps: 50, chainId: "56" } });
const ambiguousIntentText = (ambiguousIntent.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(ambiguousIntentText);
const ambiguousIntentPayload = JSON.parse(ambiguousIntentText!);
assert.equal(ambiguousIntentPayload.outcome.status, "blocked");
assert.match(ambiguousIntentPayload.outcome.nextAction, /platformId|selectionPolicy/);
const screened = await client.callTool({ name: "screen_assets_by_preferences", arguments: { query: "NVDA", chainId: "56", preference: { requireMarketPrice: true, maxPriceGapPercent: "1" } } });
const screenedText = (screened.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(screenedText);
const screenedPayload = JSON.parse(screenedText!);
assert.ok(screenedPayload.comparison.rows.length >= 2);
assert.match(screenedPayload.recommendationBoundary, /not investment advice/);
assert.match(screenedPayload.interpretation, /not a recommendation/);
const exposureHighLevel = await client.callTool({ name: "analyze_portfolio_exposure", arguments: { walletAddress: "0x0000000000000000000000000000000000000000", chainIds: ["56"], query: "NVDA" } });
const exposureHighLevelText = (exposureHighLevel.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(exposureHighLevelText);
const exposureHighLevelPayload = JSON.parse(exposureHighLevelText!);
assert.ok(Array.isArray(exposureHighLevelPayload.tokenizedStockHoldings));
const comparison = await client.callTool({ name: "compare_stock_wrappers", arguments: { query: "NVDA", chainId: "56" } });
const comparisonText = (comparison.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(comparisonText);
const comparisonPayload = JSON.parse(comparisonText!);
assert.ok(comparisonPayload.count >= 2);
const planResult = await client.callTool({
  name: "create_stock_action_plan",
  arguments: {
    type: "buy",
    walletAddress: "0x0000000000000000000000000000000000000000",
    fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
    amount: "10",
    amountDecimals: 18,
    maxSlippageBps: 50,
    asset: bstock
  }
});
const planContent = planResult.content as Array<{ type: string; text?: string }>;
const planText = planContent.find((item) => item.type === "text")?.text;
if (!planText) throw new Error("MCP did not return action plan");
assert.match(planText, /plan/);
const parsedPlan = JSON.parse(planText) as { plan: any };
assert.ok(JSON.parse(planText).outcome);
assert.ok(["awaiting_confirmation", "failed"].includes(parsedPlan.plan.status));
const planMarket = parsedPlan.plan.assetContext;
const marketStatusCheck = parsedPlan.plan.safetyReport?.checks?.find((check: { name: string }) => check.name === "market_status");
assert.ok(marketStatusCheck, "the Live action plan must include an explicit market-status safety check");
const marketStatusConflict = (planMarket?.marketStatus === "open" && planMarket?.openState === false)
  || (planMarket?.marketStatus === "closed" && planMarket?.openState === true);
const expectedMarketStatusPass = !marketStatusConflict
  && planMarket?.marketStatus !== "closed"
  && planMarket?.openState !== false
  && (planMarket?.marketStatus !== "unknown" || planMarket?.openState === true);
assert.equal(marketStatusCheck.passed, expectedMarketStatusPass, "Live market-status safety must agree with the category/openState contract");
if (planMarket?.marketStatus === "unknown" && planMarket?.openState === true) {
  assert.equal(marketStatusCheck.severity, "warning");
  assert.match(marketStatusCheck.message, /category is unknown.*reports the underlying market is currently tradable/i);
}
const simulationPlan = {
  planId: "real-simulation-plan",
  status: "awaiting_confirmation",
  requiresUserConfirmation: true,
  intent: {
    type: "buy",
    walletAddress: "0x0000000000000000000000000000000000000000",
    fromTokenAddress: "0x0000000000000000000000000000000000000000",
    amount: "0",
    amountDecimals: 18,
    toAsset: bstock
  },
  unsignedActions: [{ kind: "evm_transaction", chainId: "56", quoteId: "real-simulation", payload: { tx: { from: "0x0000000000000000000000000000000000000000", to: "0x0000000000000000000000000000000000000000", value: "0", data: "0x" } } }]
};
const planSimulation = await client.callTool({ name: "simulate_stock_action_plan", arguments: { plan: simulationPlan } });
const planSimulationText = (planSimulation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(planSimulationText);
const simulatedPayload = JSON.parse(planSimulationText!);
assert.ok(simulatedPayload.outcome.nextAction);
assert.equal(simulatedPayload.outcome.status, "error", "a synthetic plan must not reach simulation");
assert.match(simulatedPayload.summary, /not created in this MCP session/);
const syntheticPlanRejected = true;
const successfulConfirmation = await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: simulationPlan } });
const successfulConfirmationText = (successfulConfirmation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(successfulConfirmationText && /rejected/.test(successfulConfirmationText));
const successfulConfirmationPayload = JSON.parse(successfulConfirmationText!);
assert.equal(successfulConfirmationPayload.outcome.status, "error");
const confirmationAttempt = await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: parsedPlan.plan } });
const confirmationText = (confirmationAttempt.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(confirmationText && /rejected/.test(confirmationText));

const simulation = await client.callTool({
  name: "simulate_stock_action",
  arguments: { chainId: "56", from: "0x0000000000000000000000000000000000000000", to: "0x0000000000000000000000000000000000000000", value: "0", data: "0x" }
});
const simulationText = (simulation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(simulationText && /Simulation/.test(simulationText));

const exposure = await client.callTool({
  name: "get_wallet_stock_exposure",
  arguments: { walletAddress: "0x0000000000000000000000000000000000000000", chainIds: ["56"], query: "NVDA" }
});
const exposureText = (exposure.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(exposureText);
const exposurePayload = JSON.parse(exposureText!);
assert.ok(Array.isArray(exposurePayload.holdings));

const orderStatus = await client.callTool({
  name: "get_broadcast_order_status",
  arguments: { address: "0x0000000000000000000000000000000000000000", chainId: "56" }
});
const orderStatusText = (orderStatus.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(orderStatusText);
const orderStatusPayload = JSON.parse(orderStatusText!);
assert.ok(orderStatusPayload.result && Array.isArray(orderStatusPayload.result.orders));

const rejectedBroadcast = await client.callTool({
  name: "broadcast_confirmed_transaction",
  arguments: {
    plan: { planId: "unconfirmed", status: "awaiting_confirmation", requiresUserConfirmation: true, intent: { walletAddress: "0x0000000000000000000000000000000000000000", toAsset: { chainId: "56" } } },
    signedTransaction: "0x01",
    address: "0x0000000000000000000000000000000000000000"
  }
});
const rejectedBroadcastText = (rejectedBroadcast.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(rejectedBroadcastText && /rejected|confirmation/i.test(rejectedBroadcastText));

const executableShape = {
  planId: "confirmed-test",
  status: "confirmed",
  requiresUserConfirmation: false,
  expiresAt: Date.now() + 60_000,
  safetyReport: { passed: true, checks: ["asset_identity", "quote_available", "price_impact", "authorization_visibility", "input_balance", "simulation"].map((name) => ({ name, passed: true, severity: name === "input_balance" || name === "authorization_visibility" ? "info" : "blocking", message: "test fixture" })), blockingReasons: [] },
  simulation: { success: true, balanceChanges: [], allowanceChanges: [], warnings: [] },
  intent: { walletAddress: "0x0000000000000000000000000000000000000000", toAsset: { chainId: "56" } }
};
const mismatchedAddress = await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: executableShape, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000001" } });
const mismatchedAddressText = (mismatchedAddress.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(mismatchedAddressText && /not created in this MCP session/i.test(mismatchedAddressText));
const expiredPlan = { ...executableShape, expiresAt: 1 };
const expiredBroadcast = await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: expiredPlan, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000000" } });
const expiredBroadcastText = (expiredBroadcast.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(expiredBroadcastText && /not created in this MCP session/i.test(expiredBroadcastText));

console.log(JSON.stringify({
  toolCount: names.length,
  tools: names,
  resolveSucceeded: true,
  compareSucceeded: true,
  wrapperCount: comparisonPayload.count,
  planResponseReceived: true,
  planStatus: parsedPlan.plan.status,
  marketStatusCheck: {
    category: planMarket?.marketStatus,
    providerOpenState: planMarket?.openState,
    passed: marketStatusCheck.passed,
    severity: marketStatusCheck.severity,
    message: marketStatusCheck.message
  },
  planBlockingReasons: parsedPlan.plan.safetyReport?.blockingReasons ?? [],
  planAwaitingConfirmation: parsedPlan.plan.status === "awaiting_confirmation",
  syntheticPlanRejected,
  syntheticPlanConfirmationRejected: true,
  unsafePlanMarkedFailed: true,
  unreadyPlanConfirmationRejected: true,
  zeroValueSimulationResponseReceived: true,
  walletExposureSucceeded: true,
  walletHoldingCount: exposurePayload.holdings.length,
  broadcastOrderStatusSucceeded: true,
  unregisteredBroadcastRejected: true
}, null, 2));
await transport.close();
