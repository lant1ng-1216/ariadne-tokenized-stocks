import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "ariadne-demo", version: "0.1.0" });
const transport = new StdioClientTransport({ command: "node", args: ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"], cwd: process.cwd(), stderr: "pipe" });
await client.connect(transport);
const call = async (name: string, args: Record<string, unknown>) => {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  if (!text) throw new Error(`No text returned by ${name}`);
  return JSON.parse(text);
};

const resolved = await call("resolve_tokenized_stock", { query: "NVDA", chainId: "56" });
const assets = resolved.assets ?? [];
const preferred = assets.find((asset: any) => asset.platformId === "bstock") ?? assets[0];
if (!preferred) throw new Error("No NVDA tokenized-stock asset found");
const compared = await call("compare_stock_wrappers", { query: "NVDA", chainId: "56" });
const planResult = await call("create_stock_action_plan", {
  type: "buy", walletAddress: "0x0000000000000000000000000000000000000000",
  fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955",
  amount: "10", amountDecimals: 18, asset: preferred
});
const builtTx = planResult.plan?.unsignedActions?.[0]?.payload?.tx;
if (!builtTx) throw new Error("Action plan did not contain a built unsigned EVM transaction");
const simulation = await call("simulate_stock_action", {
  chainId: "56", from: builtTx.from, to: builtTx.to, value: builtTx.value, data: builtTx.data
});
console.log(JSON.stringify({
  demo: "Ariadne Tokenized Stocks SDK + MCP",
  resolvedAssets: assets.length,
  comparedPlatforms: Object.keys(compared.groups ?? {}),
  selectedAsset: preferred,
  plan: planResult.plan,
  simulation,
  simulationPassed: simulation.simulation?.success === true && simulation.simulation?.status !== "FAILED",
  safetyBlockedAsExpected: simulation.simulation?.status === "FAILED" && simulation.simulation?.warnings?.length > 0,
  broadcasted: false
}, null, 2));
await transport.close();
