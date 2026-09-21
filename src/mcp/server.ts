import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import { WalletService } from "../services/wallet.js";
import { TransactionService } from "../services/transaction.js";
import { assertExecutable, attachSimulation, confirmPlan } from "../domain/action-plan.js";
import type { ActionPlan } from "../domain/types.js";
import { errorOutcome, outcome, textResult } from "./response.js";
import { compareAgentAssets, toAgentAsset } from "../domain/agent-normalizers.js";
import type { AssetPreference } from "../domain/agent-types.js";
import { renderAssetCard, renderComparisonTable, renderResearchBrief } from "../presentation/asset-view.js";
import { DemoTokenizedStocksService } from "../services/demo-tokenized-stocks.js";

const demoMode = process.env.ARIADNE_MODE === "demo";
const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!demoMode && (!apiKey || !apiSecret)) throw new Error("Missing Binance Web3 credentials in .env. Set ARIADNE_MODE=demo for credential-free read-only exploration.");

const client = new BinanceWeb3Client({
  apiKey: apiKey ?? "demo",
  apiSecret: apiSecret ?? "demo",
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
});
const stocks = demoMode ? new DemoTokenizedStocksService(client) : new TokenizedStocksService(client);
const wallet = new WalletService(client);
const transactions = new TransactionService(client);

const server = new McpServer({ name: "ariadne-tokenized-stocks", version: "0.1.0" });

server.registerTool("discover_tokenized_assets", {
  description: "Discover and explain tokenized-stock representations for a natural-language ticker or company query. Returns issuer-aware asset views with market context, data quality and next actions.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    includeMarketContext: z.boolean().optional()
  }
}, async ({ query, chainId, platforms, includeMarketContext }) => {
  try {
    const assets = await stocks.search(query, { chainId });
    const filtered = platforms?.length ? assets.filter((asset) => platforms.includes(asset.platformId)) : assets;
    const enriched = await Promise.all(filtered.map(async (asset) => {
      const market = includeMarketContext === false ? undefined : await stocks.marketContext(asset);
      return toAgentAsset(asset, market);
    }));
    const warnings = enriched.flatMap((asset) => asset.dataQuality.warnings).filter((warning, index, all) => all.indexOf(warning) === index);
    return textResult(outcome({
      summary: enriched.length ? `Discovered ${enriched.length} tokenized-stock representations for ${query}` : `No tokenized-stock representations found for ${query}`,
      query,
      assets: enriched,
      count: enriched.length,
      presentation: enriched.map(renderAssetCard).join("\n\n---\n\n")
    }, enriched.length ? warnings.length ? "warning" : "success" : "warning", enriched.length ? "Compare the representations or request a focused market summary" : "Try a broader ticker or remove platform filters", { warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "asset_discovery_failed"));
  }
});

server.registerTool("compare_asset_representations", {
  description: "Compare issuer-aware tokenized-stock representations using optional user preferences. The Agent can use this instead of manually calling low-level search and market tools.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    }).optional()
  }
}, async ({ query, chainId, preference }) => {
  try {
    const assets = await stocks.search(query, { chainId });
    const enriched = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
    const comparison = compareAgentAssets(enriched, (preference ?? {}) as AssetPreference);
    return textResult(outcome({ summary: comparison.summary, comparison, presentation: renderComparisonTable(comparison) }, comparison.rows.some((row) => row.excludedReasons.length === 0) ? comparison.warnings.length ? "warning" : "success" : "blocked", comparison.rows.some((row) => row.excludedReasons.length === 0) ? "Review ranked representations and choose whether to request a quote" : "Relax the preference filters or inspect the exclusion reasons", { warnings: comparison.warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "asset_comparison_failed"));
  }
});

server.registerTool("research_tokenized_stock", {
  description: "Run an Agent-native tokenized-stock research workflow in one call: discover issuer representations, enrich market context, compare evidence and return a human-readable brief with the next safe action. The Agent can use this instead of manually chaining search, market and comparison tools. Read-only; never signs or broadcasts.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    }).optional()
  }
}, async ({ query, chainId, platforms, preference }) => {
  try {
    const assets = await stocks.search(query, { chainId });
    const filtered = platforms?.length ? assets.filter((asset) => platforms.includes(asset.platformId)) : assets;
    const enriched = await Promise.all(filtered.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
    const comparison = compareAgentAssets(enriched, (preference ?? {}) as AssetPreference);
    const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
    const warnings = [...new Set([
      ...comparison.warnings,
      ...enriched.flatMap((asset) => asset.dataQuality.warnings)
    ])];
    const status = !enriched.length ? "warning" : eligible.length ? warnings.length ? "warning" : "success" : "blocked";
    const nextAction = !enriched.length
      ? "Try a broader ticker or remove platform filters"
      : eligible.length
        ? "Review the evidence and request a quote only for an explicitly selected representation"
        : "Review exclusion reasons or relax the preference filters";
    return textResult(outcome({
      summary: enriched.length ? `Research brief for ${query}: ${enriched.length} issuer representations compared` : `No tokenized-stock representations found for ${query}`,
      query,
      chainId,
      assets: enriched,
      comparison,
      presentation: enriched.length ? renderResearchBrief(enriched, comparison) : "No representations available.",
      decisionBoundary: "Ariadne presents evidence and preference matches; it does not make an investment decision.",
      executionBoundary: "This workflow is read-only. No quote, signature, transaction or broadcast was performed."
    }, status, nextAction, { warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "stock_research_failed"));
  }
});

server.registerTool("prepare_action_from_intent", {
  description: "Translate a tokenized-stock purchase or sale intent into a platform-aware ActionPlan. If multiple representations exist and no explicit preference is provided, returns a comparison instead of choosing silently. Never signs or broadcasts.",
  inputSchema: {
    query: z.string().min(1),
    type: z.enum(["buy", "sell", "swap"]),
    walletAddress: z.string().min(1),
    fromTokenAddress: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
    amountDecimals: z.number().int().min(0).max(36),
    chainId: z.string().optional(),
    platformId: z.string().optional(),
    selectionPolicy: z.enum(["explicit_platform", "lowest_price_gap"]).optional(),
    maxSlippageBps: z.number().int().min(0).max(10_000).optional()
  }
}, async (input) => {
  try {
    const assets = await stocks.search(input.query, { chainId: input.chainId, platformId: input.platformId });
    if (!assets.length) return textResult(outcome({ summary: `No tokenized-stock representation found for ${input.query}`, assets: [] }, "warning", "Try a broader ticker or remove the platform filter", { warnings: ["No matching asset was found"] }));
    let selected = input.platformId ? assets.find((asset) => asset.platformId === input.platformId) : undefined;
    if (!selected && input.selectionPolicy === "lowest_price_gap") {
      const enriched = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
      const comparison = compareAgentAssets(enriched, { requireMarketPrice: true, requireReferencePrice: true });
      selected = comparison.rows.find((row) => !row.excludedReasons.length)?.asset;
    }
    if (!selected && assets.length > 1) {
      const enriched = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
      const comparison = compareAgentAssets(enriched, {});
      return textResult(outcome({ summary: "Multiple tokenized-stock representations require an explicit choice", comparison, presentation: renderComparisonTable(comparison) }, "blocked", "Choose a platformId or provide selectionPolicy=lowest_price_gap before preparing the ActionPlan", { warnings: ["Ariadne did not silently choose between multiple issuers"] }));
    }
    selected ??= assets[0];
    const plan = await stocks.createActionPlan({
      type: input.type,
      walletAddress: input.walletAddress,
      fromTokenAddress: input.fromTokenAddress,
      amount: input.amount,
      amountDecimals: input.amountDecimals,
      maxSlippageBps: input.maxSlippageBps,
      toAsset: selected
    });
    const status = plan.status === "failed" ? "blocked" : plan.assetContext?.dataWarnings.length ? "warning" : "success";
    return textResult(outcome({ summary: plan.status === "failed" ? "ActionPlan preparation was blocked by a readiness or safety condition" : "ActionPlan prepared; no signing or broadcast occurred", selectedAsset: selected, plan }, status, plan.status === "failed" ? "Resolve the blocking reasons before simulation" : "Simulate the ActionPlan before requesting confirmation", { warnings: plan.assetContext?.dataWarnings ?? [], sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Inspect the error and revise the intent before retrying", "intent_preparation_failed"));
  }
});

server.registerTool("screen_assets_by_preferences", {
  description: "Screen tokenized-stock representations by explicit issuer, platform, market-data, market-status and price-gap preferences. This is evidence-based screening, not investment advice.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    })
  }
}, async ({ query, chainId, preference }) => {
  try {
    const assets = await stocks.search(query, { chainId });
    const enriched = await Promise.all(assets.map(async (asset) => toAgentAsset(asset, await stocks.marketContext(asset))));
    const comparison = compareAgentAssets(enriched, preference as AssetPreference);
    const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
    return textResult(outcome({ summary: `${eligible.length} representations match the requested preferences`, comparison, presentation: renderComparisonTable(comparison), recommendationBoundary: "This is preference-based evidence screening, not investment advice", interpretation: "Eligibility reflects the supplied criteria and observed data; it is not a recommendation to buy or sell." }, eligible.length ? "success" : "blocked", eligible.length ? "Review the evidence and choose whether to request a quote" : "Relax the preferences or inspect exclusion reasons", { warnings: comparison.warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the query and preference values before retrying", "asset_screening_failed"));
  }
});

server.registerTool("analyze_portfolio_exposure", {
  description: "Read wallet holdings and summarize tokenized-stock exposure. Read-only; does not rebalance or execute anything.",
  inputSchema: { walletAddress: z.string().min(1), chainIds: z.array(z.string()).min(1), query: z.string().optional() }
}, async ({ walletAddress, chainIds, query }) => {
  try {
    const holdings = await wallet.holdings(walletAddress, chainIds);
    const assets = query ? await stocks.search(query, { chainId: chainIds.length === 1 ? chainIds[0] : undefined }) : [];
    const resolved = holdings.map((holding) => ({ ...holding, asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase()) }));
    const tokenized = resolved.filter((holding) => holding.asset);
    const warnings = resolved.flatMap((holding) => holding.warnings).filter((warning, index, all) => all.indexOf(warning) === index);
    return textResult(outcome({ walletAddress, holdings: resolved, tokenizedStockHoldings: tokenized, summary: `${tokenized.length} tokenized-stock holdings identified`, recommendationBoundary: "This is an exposure summary, not investment advice" }, warnings.length ? "warning" : "success", "Review exposure and warnings before considering a simulated action", { warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the wallet address, chain IDs and API availability", "portfolio_analysis_failed"));
  }
});

server.registerTool("resolve_tokenized_stock", {
  description: "Search BSC tokenized stocks and return platform-aware asset identities. Read-only.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platformId: z.string().optional()
  }
}, async ({ query, chainId, platformId }) => {
  const assets = await stocks.search(query, { chainId, platformId });
  return textResult(outcome({ summary: `Found ${assets.length} tokenized stock assets`, assets, count: assets.length }, assets.length ? "success" : "warning", assets.length ? "Select an asset and request market context" : "Try a broader ticker or omit platformId", { warnings: assets.length ? [] : ["No matching tokenized-stock asset was found"] }));
});

server.registerTool("get_stock_market_context", {
  description: "Return tokenized stock price, reference price, market status, timestamps and data warnings. Read-only.",
  inputSchema: { chainId: z.string(), contractAddress: z.string(), platformId: z.string(), tokenSymbol: z.string(), underlyingTicker: z.string(), underlyingName: z.string() }
}, async (input) => {
  const context = await stocks.marketContext({
    assetId: `${input.chainId}:${input.contractAddress.toLowerCase()}`,
    chainId: input.chainId,
    contractAddress: input.contractAddress,
    platformId: input.platformId,
    tokenSymbol: input.tokenSymbol,
    underlyingTicker: input.underlyingTicker,
    underlyingName: input.underlyingName
  });
  return textResult(outcome({ ...context, summary: "Market context retrieved", warnings: context.dataWarnings }, context.dataWarnings.length ? "warning" : "success", context.dataWarnings.length ? "Review warnings before creating a plan" : "Compare context with another wrapper or create a plan", { warnings: context.dataWarnings }));
});

server.registerTool("compare_stock_wrappers", {
  description: "Compare tokenized representations of the same stock across platforms and chains. Read-only.",
  inputSchema: { query: z.string().min(1), chainId: z.string().optional() }
}, async ({ query, chainId }) => {
  const assets = await stocks.search(query, { chainId });
  const grouped = assets.reduce<Record<string, typeof assets>>((acc, asset) => {
    (acc[asset.underlyingTicker || query.toUpperCase()] ??= []).push(asset);
    return acc;
  }, {});
  return textResult(outcome({ query, groups: grouped, count: assets.length, summary: `Compared ${assets.length} tokenized-stock representations` }, assets.length ? "success" : "warning", assets.length ? "Choose a platform-aware asset before requesting a quote" : "Try a broader ticker", { warnings: assets.length ? [] : ["No wrapper comparison result was found"] }));
});

server.registerTool("get_wallet_stock_exposure", {
  description: "Read wallet token balances and resolve matching tokenized-stock identities. Read-only.",
  inputSchema: { walletAddress: z.string(), chainIds: z.array(z.string()).min(1), query: z.string().optional() }
}, async ({ walletAddress, chainIds, query }) => {
  const holdings = await wallet.holdings(walletAddress, chainIds);
  const assets = query ? await stocks.search(query) : [];
  const resolved = holdings.map((holding) => ({ ...holding, asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase()) }));
  return textResult(outcome({ walletAddress, holdings: resolved, count: resolved.length, summary: `Read ${resolved.length} wallet holdings` }, "success", "Review holdings and warnings before preparing an action"));
});

server.registerTool("simulate_stock_action", {
  description: "Simulate an unsigned EVM transaction without broadcasting it. Read-only and no wallet signing.",
  inputSchema: {
    chainId: z.string(),
    from: z.string(),
    to: z.string(),
    value: z.string().regex(/^\d+$/),
    data: z.string().regex(/^0x[0-9a-fA-F]*$/).optional()
  }
}, async ({ chainId, from, to, value, data }) => {
  const simulation = await transactions.simulateEvm(chainId, { from, to, value, data });
  return textResult(outcome({ summary: simulation.success ? "Simulation succeeded; nothing broadcast" : "Simulation failed", simulation }, simulation.success ? "success" : "blocked", simulation.success ? "Review the simulation, then confirm the plan if appropriate" : "Inspect simulation warnings and revise the unsigned transaction", { warnings: simulation.warnings }));
});

server.registerTool("simulate_stock_action_plan", {
  description: "Simulate the unsigned transaction contained in an Ariadne action plan and write the result back to the plan. Never broadcasts.",
  inputSchema: { plan: z.any() }
}, async ({ plan }) => {
  try {
    const action = (plan as ActionPlan).unsignedActions?.[0] as any;
    const tx = action?.payload?.tx;
    if (!tx) throw new Error("Plan has no unsigned EVM transaction");
    const simulation = await transactions.simulateEvm((plan as ActionPlan).intent.toAsset.chainId, tx);
    const updated = attachSimulation(plan as ActionPlan, simulation);
    const simulationWarnings = (updated.simulation as { warnings?: string[] } | undefined)?.warnings ?? [];
    return textResult(outcome({ summary: "Plan simulation completed; nothing broadcast", plan: updated, broadcasted: false }, updated.status === "simulated" ? "success" : "blocked", updated.status === "simulated" ? "Request explicit confirmation before signing" : "Resolve the blocking safety checks", { warnings: simulationWarnings }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Provide a plan with an unsigned EVM transaction and retry", "simulation_failed"), broadcasted: false });
  }
});

server.registerTool("create_stock_action_plan", {
  description: "Create a tokenized-stock action plan with quote and market context. Does not execute or broadcast.",
  inputSchema: {
    type: z.enum(["buy", "sell", "swap"]),
    walletAddress: z.string(),
    fromTokenAddress: z.string(),
    amount: z.string().regex(/^\d+$/),
    amountDecimals: z.number().int().min(0).max(36),
    asset: z.object({
      assetId: z.string(),
      chainId: z.string(),
      platformId: z.string(),
      contractAddress: z.string(),
      tokenSymbol: z.string(),
      underlyingTicker: z.string(),
      underlyingName: z.string()
    })
  }
}, async ({ type, walletAddress, fromTokenAddress, amount, amountDecimals, asset }) => {
  const plan = await stocks.createActionPlan({
    type,
    walletAddress,
    fromTokenAddress,
    amount,
    amountDecimals,
    toAsset: asset
  });
  return textResult(outcome({
    summary: plan.status === "failed" ? "Action plan could not be created" : "Action plan created; no transaction executed",
    plan
  }, plan.status === "failed" ? "blocked" : "success", plan.status === "failed" ? "Resolve the blocking reasons before simulation" : "Simulate the plan before requesting confirmation", { warnings: plan.assetContext?.dataWarnings ?? [], sideEffects: "none" }));
});

server.registerTool("confirm_stock_action_plan", {
  description: "Mark a simulated Ariadne action plan as explicitly user-confirmed. This never signs or broadcasts.",
  inputSchema: { plan: z.any(), confirmationToken: z.string().min(1) }
}, async ({ plan, confirmationToken }) => {
  try {
    const confirmed = confirmPlan(plan as ActionPlan, confirmationToken);
    return textResult(outcome({ summary: "Plan confirmed; signing and broadcast are still separate", plan: confirmed, broadcasted: false }, "success", "Sign externally, then submit or broadcast the signed payload", { sideEffects: "external_signature_required" }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Simulate the plan and resolve all blocking checks before confirming", "confirmation_rejected"), broadcasted: false });
  }
});

server.registerTool("submit_signed_rfq_order", {
  description: "Submit an already EIP-712-signed RFQ order. The caller must sign externally; Ariadne never handles private keys.",
  inputSchema: {
    requestId: z.string().uuid(),
    userSignature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
    vendor: z.enum(["InchFusion", "CowSwap", "PcsXRfq"]),
    quoteId: z.string().min(1),
    signingScheme: z.string().optional()
  }
}, async (input) => {
  try {
    const order = await stocks.submitRfqOrder(input);
    return textResult(outcome({ summary: "Signed RFQ submitted; poll status for settlement", order, privateKeyHandled: false }, "success", "Poll RFQ order status; do not replay the signed order blindly", { sideEffects: "broadcast_possible" }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Inspect the error and query order status before retrying", "rfq_submission_failed"), privateKeyHandled: false });
  }
});

server.registerTool("get_rfq_order_status", {
  description: "Read the settlement status of a previously submitted RFQ order. Read-only.",
  inputSchema: { orderId: z.string().min(1) }
}, async ({ orderId }) => {
  const status = await stocks.rfqOrderStatus(orderId);
  return textResult(outcome({ orderId, status, summary: "RFQ order status retrieved" }, "success", "Use the returned settlement status to decide whether further action is required"));
});

server.registerTool("broadcast_confirmed_transaction", {
  description: "Broadcast an externally signed raw transaction only for an explicitly confirmed action plan. This sends a real transaction to the chain and never signs internally.",
  inputSchema: {
    plan: z.any(),
    signedTransaction: z.string().regex(/^0x[0-9a-fA-F]+$/),
    address: z.string().min(1),
    enableMevProtection: z.boolean().optional()
  }
}, async ({ plan, signedTransaction, address, enableMevProtection }) => {
  try {
    assertExecutable(plan as ActionPlan);
    if (address.toLowerCase() !== (plan as ActionPlan).intent.walletAddress.toLowerCase()) throw new Error("Broadcast address must match the confirmed plan wallet address");
    const result = await transactions.broadcastSigned((plan as ActionPlan).intent.toAsset.chainId, signedTransaction, address, enableMevProtection ?? false);
    return textResult(outcome({ summary: "Signed transaction broadcast; query orders for status", result, signedInternally: false }, "success", "Query broadcast order status; do not replay the signed transaction blindly", { sideEffects: "broadcast_possible" }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Resolve the plan or address rejection before attempting another broadcast", "broadcast_rejected"), broadcasted: false });
  }
});

server.registerTool("get_broadcast_order_status", {
  description: "Read broadcast order status for a wallet and chain. Read-only.",
  inputSchema: { address: z.string().min(1), chainId: z.string().min(1), orderId: z.string().optional(), txStatus: z.string().optional() }
}, async ({ address, chainId, orderId, txStatus }) => {
  const result = await transactions.broadcastOrders(address, chainId, { orderId, txStatus });
  return textResult(outcome({ address, chainId, result, summary: "Broadcast order status retrieved" }, "success", "Use the order status to determine whether the transaction settled"));
});

const transport = new StdioServerTransport();
await server.connect(transport);
