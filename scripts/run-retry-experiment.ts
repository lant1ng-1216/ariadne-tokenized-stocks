import { createServer } from "node:http";
import { appendFile } from "node:fs/promises";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";
import { recordFromObservation, type ExperimentRecord } from "../src/observability/experiment-recorder.js";

let calls = 0;
const server = createServer((_request, response) => {
  calls += 1;
  response.setHeader("content-type", "application/json");
  if (calls % 2 === 1) {
    response.setHeader("Retry-After", "0.01");
    response.end(JSON.stringify({ code: 42900, msg: "rate limited", data: null, timestamp: Date.now(), success: false }));
  } else response.end(JSON.stringify({ code: 0, msg: "success", data: { calls }, timestamp: Date.now(), success: true }));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test server did not start");
const records: ExperimentRecord[] = [];
const client = new BinanceWeb3Client({ apiKey: "test", apiSecret: "test", baseUrl: `http://127.0.0.1:${address.port}/build`, maxRetries: 1, retryBaseDelayMs: 1, onRequest: (observation: RequestObservation) => records.push(recordFromObservation({ scenarioId: "retry_policy", requestVariant: "deterministic-42900", observation, sourceRef: "scripts/run-retry-experiment.ts" })) });
for (let i = 0; i < 10; i += 1) await client.get("/rate-limited");
await new Promise<void>((resolve) => server.close(() => resolve()));
const output = "research/experiments/records/safety.jsonl";
await appendFile(output, records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
console.log(JSON.stringify({ status: "PASS", records: records.length, retries: records.filter((r) => r.response_class === "retryable_rate_limit").length, broadcasted: false }, null, 2));
