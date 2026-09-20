import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { TransactionService } from "../src/services/transaction.js";
import { recordFromObservation, type ExperimentRecord } from "../src/observability/experiment-recorder.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const output = resolve("research/experiments/records/safety.jsonl");
await mkdir(dirname(output), { recursive: true });
if (process.env.EXPERIMENT_RESET === "1") await writeFile(output, "", "utf8");
const zero = "0x0000000000000000000000000000000000000000";
const usdt = "0x55d398326f99059fF775485246999027B3197955";
let scenario = "";
let variant = "";
const records: ExperimentRecord[] = [];
const selected = new Set((process.env.EXPERIMENT_SCENARIOS ?? "quote_standard,quote_rfq,allowance_read,simulation_preview,defi_error_handling").split(",").map((value) => value.trim()).filter(Boolean));
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL, maxRetries: 0, timeoutMs: 10_000, onRequest: (observation: RequestObservation) => records.push(recordFromObservation({ scenarioId: scenario, requestVariant: variant, observation, sourceRef: "scripts/run-safety-experiments.ts" })) });
const stocks = new TokenizedStocksService(client);
const repeat = Number(process.env.EXPERIMENT_REPEAT ?? 10);
scenario = "asset_resolution_bstock";
variant = "seed lookup for safety experiment";
const bstock = (await stocks.search("NVDA", { chainId: "56", platformId: "bstock" }))[0];
scenario = "asset_resolution_ondo";
variant = "seed lookup for safety experiment";
const ondo = (await stocks.search("NVDA", { chainId: "56", platformId: "ondo" }))[0];
if (!bstock || !ondo) throw new Error("Required NVDA assets were not found");

async function run(id: string, label: string, operation: () => Promise<unknown>, count = repeat) {
  if (!selected.has(id)) return;
  scenario = id; variant = label;
  for (let i = 0; i < count; i += 1) {
    const before = records.length;
    try { await operation(); } catch { /* request records remain authoritative */ }
    const chunk = records.slice(before);
    if (chunk.length) await appendFile(output, chunk.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
  }
}
const bstockIntent = { type: "buy" as const, walletAddress: zero, fromTokenAddress: usdt, toAsset: bstock, amount: "10", amountDecimals: 18 };
const ondoIntent = { ...bstockIntent, toAsset: ondo };
await run("quote_standard", "bStocks NVDAB / zero address", () => stocks.quote(bstockIntent));
await run("quote_rfq", "Ondo NVDAon / zero address", () => stocks.quote(ondoIntent));
await run("allowance_read", "USDT allowance / zero address / bStocks spender", async () => {
  const quote = await stocks.quote(bstockIntent);
  const spender = quote.routes[0]?.approvalTarget;
  if (!spender) throw new Error("quote did not expose approval target");
  return new TransactionService(client).erc20Allowance("56", usdt, zero, spender);
});
await run("simulation_preview", "zero-value preview transaction", () => new TransactionService(client).simulateEvm("56", { from: zero, to: zero, value: "0", data: "0x" }));
await run("defi_error_handling", "documented request variants", async () => client.post("/api/v1/defi/data/position/list", { addresses: [zero], binanceChainIds: ["56"] }));
console.log(JSON.stringify({ status: "PASS", output, records: records.length, byScenario: Object.fromEntries([...new Set(records.map((r) => r.scenario_id))].map((id) => [id, records.filter((r) => r.scenario_id === id).length])), broadcasted: records.some((r) => r.broadcasted) }, null, 2));
