import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";

const relaySecret = "purchase-intent-contract-secret-with-32-characters";
const relay = await createWalletHandoffRelayServer({ host: "127.0.0.1", port: 0, portalOrigin: "http://127.0.0.1:0", serviceSecret: relaySecret });
const address = relay.server.address();
assert.ok(address && typeof address === "object");
const relayOrigin = `http://127.0.0.1:${address.port}`;
const client = new Client({ name: "purchase-intent-contract-test", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: process.execPath, args: ["--import", "tsx", "scripts/mcp-transaction-closure-fixture-server.ts"], cwd: process.cwd(),
  env: { PATH: process.env.PATH ?? "", ARIADNE_TRANSPORT: "http", ARIADNE_WALLET_HANDOFF_RELAY_URL: relayOrigin, ARIADNE_WALLET_HANDOFF_RELAY_SECRET: relaySecret }, stderr: "pipe"
});

try {
  await client.connect(transport);
  const tool = (await client.listTools()).tools.find(({ name }) => name === "prepare_bsc_stock_purchase");
  assert.ok(tool, "the browser purchase-intent tool is registered");
  assert.match(tool.description ?? "", /ask only for the amount/i);
  assert.match(tool.description ?? "", /do not ask for or reuse a wallet address/i);
  assert.match(tool.description ?? "", /2% maximum slippage/i);
  assert.match(tool.description ?? "", /provider-derived network-fee estimate/i);
  const schema = tool.inputSchema as { required?: string[]; properties?: Record<string, unknown> };
  assert.deepEqual(schema.required?.sort(), ["amount", "inputTokenSymbol", "platformId", "query"].sort());
  for (const forbidden of ["walletAddress", "maxSlippageBps", "networkFeePolicy", "parametersConfirmed", "maxGasCostBnb"]) {
    assert.equal(forbidden in (schema.properties ?? {}), false, `${forbidden} is not a host prompt in the browser journey`);
  }
  const missingAmount = await client.callTool({ name: "prepare_bsc_stock_purchase", arguments: { query: "I want to buy bStocks NVIDIA", platformId: "bstock", inputTokenSymbol: "USDT" } });
  assert.equal(missingAmount.isError, true, "stock and issuer intent without an amount is rejected before provider work");

  const created = await client.callTool({ name: "prepare_bsc_stock_purchase", arguments: { query: "Buy bStocks NVIDIA", platformId: "bstock", inputTokenSymbol: "USDT", amount: "7" } });
  const output = created.content.find((item) => item.type === "text")?.text;
  assert.ok(output);
  const result = JSON.parse(output!);
  assert.equal(result.mode, "purchase_intent_review_monitor");
  assert.equal(result.language, "en");
  assert.equal(result.purchaseIntent.maxSlippageBps, 200);
  assert.equal(result.purchaseIntent.networkFeePolicy, "provider_estimated_max");
  assert.equal("walletAddress" in result.purchaseIntent, false);
  assert.equal("plan" in result, false, "no exact wallet-bound plan exists before the page resolves MetaMask");
  assert.match(result.browserOpenUrl, /\/open-external\/[a-f0-9]{32}#/);
  const internal = relay.store.readInternal(result.handoffId);
  assert.equal(internal.reviewMode, "purchase_intent");
  assert.equal(internal.purchaseIntent?.language, "en");
  assert.equal(internal.request, undefined);
  assert.equal(internal.originalPlan, undefined);
} finally {
  await transport.close().catch(() => undefined);
  relay.server.close();
}

const portReservation = createServer();
portReservation.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => { portReservation.once("listening", resolve); portReservation.once("error", reject); });
const reservedAddress = portReservation.address();
assert.ok(reservedAddress && typeof reservedAddress === "object");
const unavailableOrigin = `http://127.0.0.1:${reservedAddress.port}`;
await new Promise<void>((resolve) => portReservation.close(() => resolve()));
const unavailableClient = new Client({ name: "purchase-relay-preflight-test", version: "0.1.0" });
const unavailableTransport = new StdioClientTransport({
  command: process.execPath, args: ["--import", "tsx", "scripts/mcp-transaction-closure-fixture-server.ts"], cwd: process.cwd(),
  env: { PATH: process.env.PATH ?? "", ARIADNE_TRANSPORT: "http", ARIADNE_WALLET_HANDOFF_RELAY_URL: unavailableOrigin, ARIADNE_WALLET_HANDOFF_RELAY_SECRET: relaySecret }, stderr: "pipe"
});
try {
  await unavailableClient.connect(unavailableTransport);
  const unavailable = await unavailableClient.callTool({ name: "prepare_bsc_stock_purchase", arguments: { query: "NVDA", platformId: "bstock", inputTokenSymbol: "USDT", amount: "7" } });
  const unavailableText = unavailable.content.find((item) => item.type === "text")?.text;
  assert.ok(unavailableText);
  const unavailableResult = JSON.parse(unavailableText!);
  assert.equal(unavailableResult.outcome.status, "blocked");
  assert.equal(unavailableResult.diagnostics.stage, "wallet_handoff_readiness");
  assert.match(unavailableResult.diagnostics.reason, /relay is unreachable/i);
  assert.doesNotMatch(unavailableResult.diagnostics.reason, /fetch failed/i);
  assert.equal("plan" in unavailableResult, false);
  const countersText = (await unavailableClient.callTool({ name: "get_fixture_counters", arguments: {} })).content.find((item) => item.type === "text")?.text;
  assert.ok(countersText);
  assert.equal(JSON.parse(countersText!).fixtureProviderRequests, 0, "relay readiness is checked before market or quote work");
} finally {
  await unavailableTransport.close().catch(() => undefined);
}

console.log("Purchase-intent contract passed: the Agent asks only for amount, the link has no wallet-bound plan, product risk defaults are explicit, and relay failure blocks before provider work.");
