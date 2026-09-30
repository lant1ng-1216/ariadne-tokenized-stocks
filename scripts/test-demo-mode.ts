import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
const result = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "NVDA", chainId: "56" } });
const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(text);
const payload = JSON.parse(text!);
assert.equal(payload.assets.length, 2);
assert.equal(payload.assets[0].market.dataWarnings[0], "Demo Mode data is deterministic and is not live market data");
const naturalLanguageResult = await client.callTool({
  name: "research_tokenized_stock",
  arguments: { query: "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，比较价格和数据缺口；不要交易。", chainId: "56" }
});
const naturalLanguageText = (naturalLanguageResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(naturalLanguageText);
const naturalLanguage = JSON.parse(naturalLanguageText!);
assert.equal(naturalLanguage.resolvedQuery, "NVDA");
assert.equal(naturalLanguage.assets.length, 2);
assert.equal(naturalLanguage.outcome.sideEffects, "none");
assertResearchTiming(naturalLanguage);
assert.deepEqual(naturalLanguage.timing.searchResolution.calls, { directSearch: 1, catalogRead: 1, resolvedSearch: 1 });
assert.equal("marketContextFailureCategory" in naturalLanguage.timing, false, "successful demo enrichment must not report a failure category");
assert.match(naturalLanguage.outcome.nextAction, /no trading follow-up was requested/);
assert.ok(naturalLanguage.nextSteps.every((step: { id: string }) => step.id !== "request_read_only_quote"));
assert.ok(naturalLanguage.nextSteps.every((step: { id: string }) => step.id !== "read_wallet_exposure"));
assert.match(naturalLanguage.presentation, /Preferred next step: \*\*review the evidence and data gaps\*\*/);
assert.doesNotMatch(naturalLanguage.presentation, /Preferred next step: \*\*review a specific representation before requesting a quote\*\*/);

const directResearchResult = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
const directResearchText = (directResearchResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(directResearchText);
const directResearch = JSON.parse(directResearchText!);
assertResearchTiming(directResearch);
assert.deepEqual(directResearch.timing.searchResolution.calls, { directSearch: 1, catalogRead: 0, resolvedSearch: 0 }, "a direct ticker research request must use the no-catalog fast path");
assert.doesNotMatch(naturalLanguage.presentation, /request a quote/i, "explicit no-trade request must suppress quote CTAs throughout the rendered brief");
const ambiguousResult = await client.callTool({ name: "research_tokenized_stock", arguments: { query: "比较 NVDA 和 TSLA", chainId: "56" } });
const ambiguousText = (ambiguousResult.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(ambiguousText);
const ambiguous = JSON.parse(ambiguousText!);
assert.equal(ambiguous.outcome.status, "blocked");
assert.deepEqual(ambiguous.candidateTickers.sort(), ["NVDA", "TSLA"]);
const plan = await client.callTool({ name: "prepare_action_from_intent", arguments: { query: "NVDA", type: "buy", walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x0000000000000000000000000000000000000000", amount: "10", amountDecimals: 18, chainId: "56", platformId: "bstock" } });
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
const forgedConfirmation = readOutcome(await client.callTool({ name: "confirm_stock_action_plan", arguments: { plan: forgedPlan, confirmationToken: forgedPlan.planId } }));
assert.equal(forgedConfirmation.outcome.status, "error");
const forgedBroadcast = readOutcome(await client.callTool({ name: "broadcast_confirmed_transaction", arguments: { plan: { ...forgedPlan, status: "confirmed" }, signedTransaction: "0x01", address: "0x0000000000000000000000000000000000000000" } }));
assert.equal(forgedBroadcast.outcome.status, "error");
assert.match(forgedBroadcast.summary, /not created in this MCP session/);
const forgedRfq = readOutcome(await client.callTool({ name: "submit_signed_rfq_order", arguments: { plan: { ...forgedPlan, status: "confirmed" }, requestId: "00000000-0000-4000-8000-000000000001", userSignature: `0x${"0".repeat(130)}`, vendor: "PcsXRfq", quoteId: "fake-quote" } }));
assert.equal(forgedRfq.outcome.status, "error");
assert.match(forgedRfq.summary, /not created in this MCP session/);
console.log(JSON.stringify({ demoMode: true, assets: payload.assets.length, naturalLanguageResolved: true, ambiguityBlocked: true, actionBlocked: true, forgedPlanRejected: true, passed: true }, null, 2));
await transport.close();
