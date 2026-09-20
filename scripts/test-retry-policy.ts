import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";

let calls = 0;
const server = createServer((request, response) => {
  calls += 1;
  response.setHeader("content-type", "application/json");
  if (request.url === "/build/rate-limited" && calls === 1) {
    response.setHeader("Retry-After", "0.01");
    response.end(JSON.stringify({ code: 42900, msg: "rate limited", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  response.end(JSON.stringify({ code: 0, msg: "success", data: { calls }, timestamp: Date.now(), success: true }));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test server did not start");
const observations: RequestObservation[] = [];
const client = new BinanceWeb3Client({ apiKey: "test", apiSecret: "test", baseUrl: `http://127.0.0.1:${address.port}/build`, maxRetries: 1, retryBaseDelayMs: 1, onRequest: (item) => observations.push(item) });
const started = Date.now();
const response = await client.get<{ calls: number }>("/rate-limited");
const elapsed = Date.now() - started;
assert.equal(response.success, true);
assert.equal(calls, 2);
assert.equal(observations.length, 2);
assert.equal(observations[0]?.code, 42900);
assert.equal(observations[0]?.success, false);
assert.equal(observations[1]?.success, true);
assert.ok(elapsed >= 8, `Retry-After was not honored: ${elapsed}ms`);
await new Promise<void>((resolve) => server.close(() => resolve()));
console.log(JSON.stringify({ rateLimitRetried: true, attempts: observations.length, retryAfterHonored: elapsed >= 8, elapsedMs: elapsed }, null, 2));
