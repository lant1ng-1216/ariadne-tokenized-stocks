import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { recordFromObservation, type ExperimentRecord } from "../src/observability/experiment-recorder.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

const output = resolve("research/experiments/records/readonly.jsonl");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, "", "utf8");

let activeScenario = "";
let activeVariant = "";
let records: ExperimentRecord[] = [];
const snapshots: Array<Record<string, unknown>> = [];
const onRequest = (observation: RequestObservation) => {
  records.push(recordFromObservation({
    scenarioId: activeScenario,
    requestVariant: activeVariant,
    observation,
    sourceRef: "scripts/run-readonly-experiments.ts"
  }));
};
const client = new BinanceWeb3Client({ apiKey, apiSecret, baseUrl: process.env.BINANCE_WEB3_BASE_URL, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL, onRequest });
const stocks = new TokenizedStocksService(client);
const repeat = Number(process.env.EXPERIMENT_REPEAT ?? 10);
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 20) throw new Error("EXPERIMENT_REPEAT must be an integer from 1 to 20");

async function runScenario(scenario: string, variant: string, operation: () => Promise<unknown>) {
  activeScenario = scenario;
  activeVariant = variant;
  for (let index = 0; index < repeat; index += 1) {
    try {
      const result = await operation();
      snapshots.push({ observed_at: new Date().toISOString(), scenario_id: scenario, request_variant: variant, result });
    } catch (error) {
      snapshots.push({ observed_at: new Date().toISOString(), scenario_id: scenario, request_variant: variant, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

await runScenario("asset_resolution_ondo", "NVDA / chain 56 / platform ondo", () => stocks.search("NVDA", { chainId: "56", platformId: "ondo" }));
await runScenario("asset_resolution_bstock", "NVDA / chain 56 / platform bstock", () => stocks.search("NVDA", { chainId: "56", platformId: "bstock" }));

activeScenario = "asset_resolution_ondo";
activeVariant = "NVDA / chain 56 / platform ondo / seed lookup";
const ondoAssets = await stocks.search("NVDA", { chainId: "56", platformId: "ondo" }).catch(() => []);
activeScenario = "asset_resolution_bstock";
activeVariant = "NVDA / chain 56 / platform bstock / seed lookup";
const bstockAssets = await stocks.search("NVDA", { chainId: "56", platformId: "bstock" }).catch(() => []);

for (const asset of [...ondoAssets.slice(0, 1), ...bstockAssets.slice(0, 1)]) {
  const scenario = asset.platformId === "ondo" ? "market_context" : "market_context";
  await runScenario(scenario, `${asset.platformId} ${asset.tokenSymbol} / chain ${asset.chainId}`, () => stocks.marketContext(asset));
}

await appendFile(output, records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""), "utf8");
await writeFile(resolve("research/experiments/records/readonly-results.jsonl"), snapshots.map((snapshot) => JSON.stringify(snapshot)).join("\n") + (snapshots.length ? "\n" : ""), "utf8");
const counts = Object.fromEntries([...new Set(records.map((record) => record.scenario_id))].map((scenario) => [scenario, records.filter((record) => record.scenario_id === scenario).length]));
console.log(JSON.stringify({ status: "PASS", output, records: records.length, byScenario: counts, broadcasted: records.some((record) => record.broadcasted) }, null, 2));
