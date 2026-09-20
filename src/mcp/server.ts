import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import { WalletService } from "../services/wallet.js";
import { TransactionService } from "../services/transaction.js";
import { assertExecutable, attachSimulation, confirmPlan } from "../domain/action-plan.js";
import type { ActionPlan } from "../domain/types.js";

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
  return { content: [{ type: "text", text: JSON.stringify({ summary: `Found ${assets.length} tokenized stock assets`, assets }, null, 2) }] };
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
  return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] };
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
  return { content: [{ type: "text", text: JSON.stringify({ query, groups: grouped, count: assets.length }, null, 2) }] };
});

server.registerTool("get_wallet_stock_exposure", {
  description: "Read wallet token balances and resolve matching tokenized-stock identities. Read-only.",
  inputSchema: { walletAddress: z.string(), chainIds: z.array(z.string()).min(1), query: z.string().optional() }
}, async ({ walletAddress, chainIds, query }) => {
  const holdings = await wallet.holdings(walletAddress, chainIds);
  const assets = query ? await stocks.search(query) : [];
  const resolved = holdings.map((holding) => ({ ...holding, asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase()) }));
  return { content: [{ type: "text", text: JSON.stringify({ walletAddress, holdings: resolved }, null, 2) }] };
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
  return { content: [{ type: "text", text: JSON.stringify({ summary: simulation.success ? "Simulation succeeded; nothing broadcast" : "Simulation failed", simulation }, null, 2) }] };
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
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Plan simulation completed; nothing broadcast", plan: updated, broadcasted: false }, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Plan simulation failed", error: error instanceof Error ? error.message : String(error), broadcasted: false }, null, 2) }] };
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
  return { content: [{ type: "text", text: JSON.stringify({
    summary: plan.status === "failed" ? "Action plan could not be created" : "Action plan created; no transaction executed",
    plan
  }, null, 2) }] };
});

server.registerTool("confirm_stock_action_plan", {
  description: "Mark a simulated Ariadne action plan as explicitly user-confirmed. This never signs or broadcasts.",
  inputSchema: { plan: z.any(), confirmationToken: z.string().min(1) }
}, async ({ plan, confirmationToken }) => {
  try {
    const confirmed = confirmPlan(plan as ActionPlan, confirmationToken);
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Plan confirmed; signing and broadcast are still separate", plan: confirmed, broadcasted: false }, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Plan confirmation rejected", error: error instanceof Error ? error.message : String(error), broadcasted: false }, null, 2) }] };
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
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Signed RFQ submitted; poll status for settlement", order, privateKeyHandled: false }, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ summary: "RFQ submission failed", error: error instanceof Error ? error.message : String(error), privateKeyHandled: false }, null, 2) }] };
  }
});

server.registerTool("get_rfq_order_status", {
  description: "Read the settlement status of a previously submitted RFQ order. Read-only.",
  inputSchema: { orderId: z.string().min(1) }
}, async ({ orderId }) => {
  const status = await stocks.rfqOrderStatus(orderId);
  return { content: [{ type: "text", text: JSON.stringify({ orderId, status }, null, 2) }] };
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
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Signed transaction broadcast; query orders for status", result, signedInternally: false }, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ summary: "Broadcast rejected", error: error instanceof Error ? error.message : String(error), broadcasted: false }, null, 2) }] };
  }
});

server.registerTool("get_broadcast_order_status", {
  description: "Read broadcast order status for a wallet and chain. Read-only.",
  inputSchema: { address: z.string().min(1), chainId: z.string().min(1), orderId: z.string().optional(), txStatus: z.string().optional() }
}, async ({ address, chainId, orderId, txStatus }) => {
  const result = await transactions.broadcastOrders(address, chainId, { orderId, txStatus });
  return { content: [{ type: "text", text: JSON.stringify({ address, chainId, result }, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
