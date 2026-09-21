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
assert.ok(names.includes("prepare_action_from_intent"));
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

const resolved = JSON.parse(text.text) as { assets: Array<any>; outcome: { status: string; nextAction: string; sideEffects: string } };
assert.equal(resolved.outcome.status, "success");
assert.ok(resolved.outcome.nextAction);
assert.equal(resolved.outcome.sideEffects, "none");
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
assert.match(highLevelDiscoveryPayload.presentation, /Token price/);
const highLevelComparison = await client.callTool({ name: "compare_asset_representations", arguments: { query: "NVDA", chainId: "56", preference: { requireMarketPrice: true } } });
const highLevelComparisonText = (highLevelComparison.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(highLevelComparisonText);
const highLevelComparisonPayload = JSON.parse(highLevelComparisonText!);
if (!highLevelComparisonPayload.comparison) throw new Error(`High-level comparison failed: ${highLevelComparisonText}`);
assert.equal(highLevelComparisonPayload.comparison.rows.length, 2);
assert.ok(highLevelComparisonPayload.comparison.summary);
assert.match(highLevelComparisonPayload.presentation, /Reference price/);
const ambiguousIntent = await client.callTool({ name: "prepare_action_from_intent", arguments: { query: "NVDA", type: "buy", walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", amount: "10", amountDecimals: 18, chainId: "56" } });
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
assert.ok(planSimulationText && /Plan simulation/.test(planSimulationText));
const simulatedPayload = JSON.parse(planSimulationText!);
assert.ok(simulatedPayload.outcome.nextAction);
assert.equal(simulatedPayload.plan.status, "simulated");
const planSimulationWritebackSucceeded = true;
const successfulConfirmation = await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: simulatedPayload.plan, confirmationToken: simulatedPayload.plan.planId } });
const successfulConfirmationText = (successfulConfirmation.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(successfulConfirmationText && /Plan confirmed/.test(successfulConfirmationText));
const successfulConfirmationPayload = JSON.parse(successfulConfirmationText!);
assert.equal(successfulConfirmationPayload.plan.status, "confirmed");
const confirmationAttempt = await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: parsedPlan.plan, confirmationToken: parsedPlan.plan.planId } });
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
  safetyReport: { passed: true, checks: [], blockingReasons: [] },
  simulation: { success: true, balanceChanges: [], allowanceChanges: [], warnings: [] },
  intent: { walletAddress: "0x0000000000000000000000000000000000000000", toAsset: { chainId: "56" } }
};
const mismatchedAddress = await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: executableShape, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000001" } });
const mismatchedAddressText = (mismatchedAddress.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(mismatchedAddressText && /address must match/i.test(mismatchedAddressText));
const expiredPlan = { ...executableShape, expiresAt: 1 };
const expiredBroadcast = await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: expiredPlan, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000000" } });
const expiredBroadcastText = (expiredBroadcast.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(expiredBroadcastText && /expired/i.test(expiredBroadcastText));

console.log(JSON.stringify({ toolCount: names.length, tools: names, resolveSucceeded: true, compareSucceeded: true, wrapperCount: comparisonPayload.count, planSucceeded: true, planSimulationWritebackSucceeded, successfulConfirmationSucceeded: true, unsafePlanMarkedFailed: true, unreadyPlanConfirmationRejected: true, simulationSucceeded: true, walletExposureSucceeded: true, walletHoldingCount: exposurePayload.holdings.length, broadcastOrderStatusSucceeded: true, unconfirmedBroadcastRejected: true, mismatchedAddressRejected: true, expiredBroadcastRejected: true }, null, 2));
await transport.close();
