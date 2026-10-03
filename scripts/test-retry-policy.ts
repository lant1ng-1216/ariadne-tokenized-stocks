import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";
import { BinanceWeb3Error } from "../src/errors.js";

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
  if (path === "/build/retry-after-too-long") {
    response.setHeader("Retry-After", "0.2");
    response.end(JSON.stringify({ code: 42900, msg: "rate limit persists", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  if (path === "/build/retry-after-date-too-long") {
    response.setHeader("Retry-After", new Date(Date.now() + 3_000).toUTCString());
    response.end(JSON.stringify({ code: 42900, msg: "rate limit persists", data: null, timestamp: Date.now(), success: false }));
    return;
  }
  if (path === "/build/invalid-json") {
    response.end("private marker should never be reflected");
    return;
  }
  if (path === "/build/invalid-envelope") {
    response.end("null");
    return;
  }
  if (path === "/build/timeout") {
    setTimeout(() => { if (!response.destroyed) response.end(JSON.stringify({ code: 0, msg: "late", data: {}, timestamp: Date.now(), success: true })); }, 100);
    return;
  }
  response.end(JSON.stringify({ code: 0, msg: "success", data: { calls }, timestamp: Date.now(), success: true }));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test server did not start");
const observations: RequestObservation[] = [];
const baseUrl = `http://127.0.0.1:${address.port}/build`;
const client = new BinanceWeb3Client({ apiKey: "test", apiSecret: "test", baseUrl, maxRetries: 1, maxRetryDelayMs: 50, retryBaseDelayMs: 1, onRequest: (item) => observations.push(item) });
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
await assert.rejects(client.get("/retry-after-too-long"), (error: unknown) => error instanceof BinanceWeb3Error && error.code === "RETRY_DELAY_EXCEEDS_BUDGET");
assert.equal(pathCalls.get("/build/retry-after-too-long"), 1, "an excessive Retry-After must fail fast instead of sleeping or retrying early");
await assert.rejects(client.get("/retry-after-date-too-long"), (error: unknown) => error instanceof BinanceWeb3Error && error.code === "RETRY_DELAY_EXCEEDS_BUDGET");
assert.equal(pathCalls.get("/build/retry-after-date-too-long"), 1, "an HTTP-date Retry-After must be parsed and must not be retried early");

const beforeInvalidJson = pathCalls.get("/build/invalid-json") ?? 0;
await assert.rejects(client.get("/invalid-json"), (error: unknown) => error instanceof BinanceWeb3Error && error.code === "INVALID_JSON" && !error.message.includes("private marker"));
assert.equal(pathCalls.get("/build/invalid-json"), beforeInvalidJson + 1, "malformed JSON is a non-retryable provider response");
await assert.rejects(client.get("/invalid-envelope"), (error: unknown) => error instanceof BinanceWeb3Error && error.code === "INVALID_RESPONSE");
assert.equal(pathCalls.get("/build/invalid-envelope"), 1, "a malformed provider envelope must not be retried");

const timeoutObservations: RequestObservation[] = [];
const timeoutClient = new BinanceWeb3Client({ apiKey: "test", apiSecret: "test", baseUrl, maxRetries: 1, maxRetryDelayMs: 0, retryBaseDelayMs: 0, timeoutMs: 20, onRequest: (item) => timeoutObservations.push(item) });
await assert.rejects(timeoutClient.get("/timeout"), (error: unknown) => error instanceof BinanceWeb3Error && error.code === "NETWORK_TIMEOUT");
assert.equal(pathCalls.get("/build/timeout"), 2, "timeout retries are bounded by the configured attempt count");
assert.ok(timeoutObservations.every((item) => !item.success && item.code === "NETWORK_TIMEOUT"));
assert.throws(() => new BinanceWeb3Client({ apiKey: "test", apiSecret: "test", maxRetries: 6 }), /between 0 and 5/);
await new Promise<void>((resolve) => server.close(() => resolve()));
console.log(JSON.stringify({ rateLimitRetried: true, nonRetryableNotRetried: true, exhaustedRetriesRemainErrors: true, retryAfterBudgetEnforced: true, retryAfterDateBudgetEnforced: true, malformedResponsesFailClosed: true, timeoutAttemptBudgetEnforced: true, attempts: observations.length, uniqueNoncePerAttempt: true, retryAfterHonored: elapsed >= 8, elapsedMs: elapsed }, null, 2));
