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

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

const client = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
});
const stocks = new TokenizedStocksService(client);
const wallet = new WalletService(client);
const transactions = new TransactionService(client);

const server = new McpServer({ name: "ariadne-tokenized-stocks", version: "0.1.0" });

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
