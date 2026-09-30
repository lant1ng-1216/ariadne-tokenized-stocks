import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";

let calls = 0;
const pathCalls = new Map<string, number>();
const nonces: string[] = [];
const server = createServer((request, response) => {
  calls += 1;
  const path = request.url ?? "";
  const pathCall = (pathCalls.get(path) ?? 0) + 1;
  pathCalls.set(path, pathCall);
  nonces.push(String(request.headers["x-oc-nonce"] ?? ""));
  response.setHeader("content-type", "application/json");
  if (path === "/build/rate-limited" && pathCall === 1) {
    response.setHeader("Retry-After", "0.01");
    response.end(JSON.stringify({ code: 42900, msg: "rate limited", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  if (path === "/build/non-retryable") {
    response.statusCode = 400;
    response.end(JSON.stringify({ code: 40000, msg: "invalid request", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  if (path === "/build/retry-exhausted") {
    response.setHeader("Retry-After", "0");
    response.end(JSON.stringify({ code: 42900, msg: "rate limit persists", data: null, timestamp: Date.now(), success: false }));
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
assert.equal(new Set(nonces).size, 2);
assert.ok(nonces.every((nonce) => /^[0-9a-f-]{36}$/.test(nonce)));
assert.ok(elapsed >= 8, `Retry-After was not honored: ${elapsed}ms`);

const beforeNonRetryable = observations.length;
await assert.rejects(client.get("/non-retryable"), /Binance Web3 API 400.*invalid request/);
assert.equal(pathCalls.get("/build/non-retryable"), 1, "non-retryable client errors must not be retried");
assert.equal(observations.length, beforeNonRetryable + 1);
assert.equal(observations.at(-1)?.success, false, "non-retryable error must remain visible in request observations");

const beforeExhausted = observations.length;
await assert.rejects(client.get("/retry-exhausted"), /rate limit persists/);
assert.equal(pathCalls.get("/build/retry-exhausted"), 2, "retryable errors must be surfaced after the configured retry budget");
assert.equal(observations.length, beforeExhausted + 2);
assert.equal(observations.at(-1)?.success, false, "final retry failure must not be converted into success");
await new Promise<void>((resolve) => server.close(() => resolve()));
console.log(JSON.stringify({ rateLimitRetried: true, nonRetryableNotRetried: true, exhaustedRetriesRemainErrors: true, attempts: observations.length, uniqueNoncePerAttempt: true, retryAfterHonored: elapsed >= 8, elapsedMs: elapsed }, null, 2));
