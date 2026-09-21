import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

const now = () => Number(process.hrtime.bigint() / 1_000_000n);
const directObservations: RequestObservation[] = [];
const directClient = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL,
  onRequest: (observation) => directObservations.push(observation)
});
const directStocks = new TokenizedStocksService(directClient);

const directRuns: Array<Record<string, unknown>> = [];
for (let iteration = 1; iteration <= 3; iteration += 1) {
  directObservations.length = 0;
  const searchStarted = now();
  const assets = await directStocks.search("NVDA", { chainId: "56" });
  const searchMs = now() - searchStarted;
  const asset = assets.find((item) => item.platformId === "bstock") ?? assets[0];
  if (!asset) throw new Error("No NVDA asset returned");
  const marketStarted = now();
  await directStocks.marketContext(asset);
  const marketMs = now() - marketStarted;
  directRuns.push({
    iteration,
    searchMs,
    marketMs,
    apiRequests: directObservations.map((item) => ({ path: item.path.split("?", 1)[0], durationMs: item.durationMs, attempt: item.attempt, success: item.success }))
  });
}

const transport = new StdioClientTransport({
  command: "node",
  args: ["--env-file=.env", "--import", "tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  stderr: "pipe"
});
const mcpClient = new Client({ name: "ariadne-latency-harness", version: "0.1.0" });
const processStarted = now();
await mcpClient.connect(transport);
const mcpConnectMs = now() - processStarted;
const mcpRuns: Array<Record<string, unknown>> = [];
for (let iteration = 1; iteration <= 3; iteration += 1) {
  const searchStarted = now();
  const search = await mcpClient.callTool({ name: "resolve_tokenized_stock", arguments: { query: "NVDA", chainId: "56" } });
  const searchMs = now() - searchStarted;
  const searchText = (search.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text")?.text;
  if (!searchText) throw new Error("MCP search returned no text payload");
  const payload = JSON.parse(searchText) as { assets?: Array<Record<string, string>> };
  const asset = payload.assets?.find((item) => item.platformId === "bstock") ?? payload.assets?.[0];
  if (!asset) throw new Error("MCP search returned no NVDA asset");
  const marketStarted = now();
  await mcpClient.callTool({
    name: "get_stock_market_context",
    arguments: {
      chainId: asset.chainId,
      contractAddress: asset.contractAddress,
      platformId: asset.platformId,
      tokenSymbol: asset.tokenSymbol,
      underlyingTicker: asset.underlyingTicker,
      underlyingName: asset.underlyingName
    }
  });
  const marketMs = now() - marketStarted;
  mcpRuns.push({ iteration, searchMs, marketMs });
}
await transport.close();

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  repeats: 3,
  directSdk: directRuns,
  mcp: { connectMs: mcpConnectMs, runs: mcpRuns },
  limitations: [
    "These measurements cover SDK/API and MCP client timing, not the time Codex spends reasoning or rendering a final answer.",
    "No signing, broadcast or transaction side effect is performed."
  ]
}, null, 2));
