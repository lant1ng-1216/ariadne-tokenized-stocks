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
const result = await client.callTool({ name: "discover_tokenized_assets", arguments: { query: "NVDA", chainId: "56" } });
const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(text);
const payload = JSON.parse(text!);
assert.equal(payload.assets.length, 2);
assert.equal(payload.assets[0].market.dataWarnings[0], "Demo Mode data is deterministic and is not live market data");
const plan = await client.callTool({ name: "prepare_action_from_intent", arguments: { query: "NVDA", type: "buy", walletAddress: "0x0000000000000000000000000000000000000000", fromTokenAddress: "0x0000000000000000000000000000000000000000", amount: "10", amountDecimals: 18, chainId: "56", platformId: "bstock" } });
const planText = (plan.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
assert.ok(planText);
const planPayload = JSON.parse(planText!);
assert.equal(planPayload.outcome.status, "blocked");
assert.match(planPayload.plan.safetyReport.blockingReasons[0], /Demo Mode/);
console.log(JSON.stringify({ demoMode: true, assets: payload.assets.length, actionBlocked: true, passed: true }, null, 2));
await transport.close();
