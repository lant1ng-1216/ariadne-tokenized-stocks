import assert from "node:assert/strict";
import { createWebDemoServer, createWebServer } from "../src/web/demo-server.js";
import { normalizeMarketCandles } from "../src/web/market-candles.js";

assert.deepEqual(normalizeMarketCandles([
  [10, 12, 9, 11, 200, 1790602860000, 7],
  [11, 10, 9, 10, 100, 1790602920000, 3],
  [12, 13, 11, 12, 90, 1790602800000, 2]
]).map(row => row.time), [1790602800000, 1790602860000]);

const server = createWebDemoServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const health = await fetch(`${baseUrl}/api/health`);
assert.equal(health.status, 200);
const healthPayload = await health.json() as { status: string; mode: string; sideEffects: string; researchOnly: boolean; credentials: string; capabilities: Record<string, boolean>; requestId: string };
assert.equal(healthPayload.status, "ok");
assert.equal(healthPayload.mode, "demo");
assert.equal(healthPayload.sideEffects, "none");
assert.equal(healthPayload.researchOnly, true);
assert.equal(healthPayload.credentials, "none");
assert.equal(healthPayload.capabilities.broadcast, false);
assert.match(healthPayload.requestId, /^[0-9a-f-]{36}$/);

const directory = await fetch(`${baseUrl}/api/assets?chainId=56&limit=6`);
assert.equal(directory.status, 200);
const directoryPayload = await directory.json() as { view: { kind: string; summary: { totalRepresentations: number; returned: number }; items: Array<{ underlying: { logoUrl?: string }; issuer: { logoUrl?: string } }>; provenance: { inferredLogos: boolean; sourceResponseTimestampMs?: number; platformMetadataResponseTimestampMs?: number }; boundary: { sideEffects: string } } };
assert.equal(directoryPayload.view.kind, "tokenized_stock_directory");
assert.ok(directoryPayload.view.summary.totalRepresentations >= 10);
assert.equal(directoryPayload.view.summary.returned, 6);
assert.ok(directoryPayload.view.items[0].underlying.logoUrl);
assert.ok(directoryPayload.view.items[0].issuer.logoUrl);
assert.equal(directoryPayload.view.provenance.inferredLogos, false);
assert.equal(directoryPayload.view.provenance.sourceResponseTimestampMs, undefined, "demo catalogs must not claim an upstream response timestamp");
assert.equal(directoryPayload.view.provenance.platformMetadataResponseTimestampMs, undefined, "demo catalogs must not claim upstream platform metadata time");
assert.equal(directoryPayload.view.boundary.sideEffects, "none");

const capturedPriceRequests: Array<{ chainId: string; platformId: string; contractAddress: string }[]> = [];
const timestampedServer = createWebServer("live-readonly", {
  async search() {
    return [{ underlyingTicker: "NVDA", platformId: "bstock", contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436" }];
  },
  async candles() {
    return [[10, 12, 9, 11, 100, 1_790_603_000_000, 5]];
  },
  async tokenPriceSnapshots(representations: Array<{ chainId: string; platformId: string; contractAddress: string }>) {
    capturedPriceRequests.push(representations);
    return representations.map((item) => ({ ...item, state: "available", tokenPrice: "12.5", referencePrice: "12", tokenPriceUpdatedAt: 1_790_603_000_000 }));
  }
} as any);
await new Promise<void>((resolve) => timestampedServer.listen(0, "127.0.0.1", resolve));
const timestampedAddress = timestampedServer.address();
assert.ok(timestampedAddress && typeof timestampedAddress === "object");
const timestampedBase = `http://127.0.0.1:${timestampedAddress.port}`;
const priceQuery = new URLSearchParams({ chainId: "56" });
priceQuery.append("representation", "ondo:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
priceQuery.append("representation", "bstock:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const timestampedResponse = await fetch(`${timestampedBase}/api/asset-prices?${priceQuery}`);
assert.equal(timestampedResponse.status, 200);
const timestampedPayload = await timestampedResponse.json() as { view: { kind: string; items: Array<{ state: string; tokenPriceUpdatedAt: number }> }; sideEffects: string };
assert.equal(timestampedPayload.view.kind, "timestamped_token_prices");
assert.equal(timestampedPayload.view.items.length, 2);
assert.ok(timestampedPayload.view.items.every((item) => item.state === "available" && item.tokenPriceUpdatedAt > 0));
assert.equal(timestampedPayload.sideEffects, "none");
assert.equal(capturedPriceRequests[0]?.length, 2, "repeated representation query parameters must survive the web proxy boundary");
const invalidTimestampedResponse = await fetch(`${timestampedBase}/api/asset-prices?chainId=1&representation=ondo%3Anot-an-address`);
assert.equal(invalidTimestampedResponse.status, 400);
assert.equal(capturedPriceRequests.length, 1, "invalid price requests must not reach the provider service");
const oversizedPriceQuery = new URLSearchParams({ chainId: "56" });
for (let index = 0; index < 101; index += 1) {
  oversizedPriceQuery.append("representation", `ondo:0x${(index + 1).toString(16).padStart(40, "0")}`);
}
const oversizedTimestampedResponse = await fetch(`${timestampedBase}/api/asset-prices?${oversizedPriceQuery}`);
assert.equal(oversizedTimestampedResponse.status, 400);
assert.equal(capturedPriceRequests.length, 1, "over-limit price requests must not reach the provider service");
const liveCandleResponse = await fetch(`${timestampedBase}/api/candles?query=NVDA&chainId=56&platformId=bstock&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&bar=1m`);
assert.equal(liveCandleResponse.status, 200);
const liveCandlePayload = await liveCandleResponse.json() as { view: { state: string; candles: Array<{ time: number }>; chainId: string; platformId: string; contractAddress: string; asOf: number | null; sourceResponseTimestampMs: number | null }; sideEffects: string };
assert.equal(liveCandlePayload.view.state, "ready");
assert.equal(liveCandlePayload.view.chainId, "56");
assert.equal(liveCandlePayload.view.platformId, "bstock");
assert.equal(liveCandlePayload.view.contractAddress.toLowerCase(), "0x02fca66c1d1afb4e2a7884261eb00f63598a7436");
assert.equal(liveCandlePayload.view.asOf, liveCandlePayload.view.candles.at(-1)?.time);
assert.equal(liveCandlePayload.view.sourceResponseTimestampMs, null, "the client request time must not be fabricated as provider response time");
assert.equal(liveCandlePayload.sideEffects, "none");
await new Promise<void>((resolve, reject) => timestampedServer.close((error) => error ? reject(error) : resolve()));

const research = await fetch(`${baseUrl}/api/research?query=NVDA&chainId=56`);
assert.equal(research.status, 200);
const payload = await research.json() as { mode: string; view: { kind: string; state: string; representations: unknown[]; boundary: { sideEffects: string } } };
assert.equal(payload.mode, "demo");
assert.equal(payload.view.kind, "tokenized_stock_research");
assert.equal(payload.view.state, "partial");
assert.equal(payload.view.representations.length, 2);
assert.equal(payload.view.boundary.sideEffects, "none");

const exposure = await fetch(`${baseUrl}/api/exposure?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&chainId=56`);
assert.equal(exposure.status, 200);
const exposurePayload = await exposure.json() as { view: { kind: string; state: string; summary: { holdingsFound: number; matchedTokenizedStocks: number; unmatchedHoldings: number }; boundary: { sideEffects: string; privateKeyRequested: boolean; signatureRequested: boolean; broadcastAttempted: boolean }; holdings: Array<{ status: string }> } };
assert.equal(exposurePayload.view.kind, "wallet_exposure");
assert.equal(exposurePayload.view.state, "partial");
assert.equal(exposurePayload.view.summary.holdingsFound, 2);
assert.equal(exposurePayload.view.summary.matchedTokenizedStocks, 1);
assert.equal(exposurePayload.view.summary.unmatchedHoldings, 1);
assert.equal(exposurePayload.view.boundary.sideEffects, "none");
assert.equal(exposurePayload.view.boundary.privateKeyRequested, false);
assert.equal(exposurePayload.view.boundary.signatureRequested, false);
assert.equal(exposurePayload.view.boundary.broadcastAttempted, false);

const invalidExposure = await fetch(`${baseUrl}/api/exposure?walletAddress=not-an-address&query=NVDA&chainId=56`);
assert.equal(invalidExposure.status, 400);
assert.equal((await invalidExposure.json() as { error: { code: string } }).error.code, "invalid_wallet_address");

const quote = await fetch(`${baseUrl}/api/quote?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&amount=10&chainId=56`);
assert.equal(quote.status, 200);
const quotePayload = await quote.json() as { view: { kind: string; quote: { success: boolean; expectedOutput?: string; minimumOutputAvailable: boolean }; boundary: { sideEffects: string; actionPlanCreated: boolean; signatureRequested: boolean; broadcastAttempted: boolean }; warnings: string[] } };
assert.equal(quotePayload.view.kind, "read_only_quote");
assert.equal(quotePayload.view.quote.success, true);
assert.ok(quotePayload.view.quote.expectedOutput);
assert.equal(quotePayload.view.quote.minimumOutputAvailable, false);
assert.equal(quotePayload.view.boundary.sideEffects, "none");
assert.equal(quotePayload.view.boundary.actionPlanCreated, false);
assert.equal(quotePayload.view.boundary.signatureRequested, false);
assert.equal(quotePayload.view.boundary.broadcastAttempted, false);

const exactQuote = await fetch(`${baseUrl}/api/quote?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&amount=10&chainId=56`);
assert.equal(exactQuote.status, 200);
const wrongContractQuote = await fetch(`${baseUrl}/api/quote?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&contractAddress=0x1111111111111111111111111111111111111111&amount=10&chainId=56`);
assert.equal(wrongContractQuote.status, 404);
const demoCandles = await fetch(`${baseUrl}/api/candles?query=NVDA&chainId=56&platformId=bstock&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&bar=1m`);
assert.equal(demoCandles.status, 200);
const candlePayload = await demoCandles.json() as { view: { state: string; candles: unknown[]; sourceResponseTimestampMs: number | null } };
assert.equal(candlePayload.view.state, "unavailable");
assert.deepEqual(candlePayload.view.candles, []);
assert.equal(candlePayload.view.sourceResponseTimestampMs, null, "the client request time is not substituted for a missing provider response time");
const wrongPlatformCandles = await fetch(`${baseUrl}/api/candles?query=NVDA&chainId=56&platformId=ondo&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&bar=1m`);
assert.equal(wrongPlatformCandles.status, 404, "candle identity includes the issuer platform as well as ticker and contract");
const wrongContractCandles = await fetch(`${baseUrl}/api/candles?query=NVDA&chainId=56&platformId=bstock&contractAddress=0x1111111111111111111111111111111111111111&bar=1m`);
assert.equal(wrongContractCandles.status, 404, "candle identity rejects a different contract under the same ticker and platform");
const invalidPlatformCandles = await fetch(`${baseUrl}/api/candles?query=NVDA&chainId=56&platformId=&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&bar=1m`);
assert.equal(invalidPlatformCandles.status, 400);
const demoPreflight = await fetch(`${baseUrl}/api/preflight?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&amount=10&chainId=56`);
assert.equal(demoPreflight.status, 501);
assert.equal((await demoPreflight.json() as { sideEffects: string }).sideEffects, "none");

const invalidQuote = await fetch(`${baseUrl}/api/quote?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&amount=0&chainId=56`);
assert.equal(invalidQuote.status, 400);
assert.equal((await invalidQuote.json() as { error: { code: string } }).error.code, "invalid_quote_request");

const methodCheck = await fetch(`${baseUrl}/api/research`, { method: "POST" });
assert.equal(methodCheck.status, 405);
assert.equal(methodCheck.headers.get("allow"), "GET");
assert.equal((await methodCheck.json() as { capabilities: { signing: boolean } }).capabilities.signing, false);

const nonApiPage = await fetch(`${baseUrl}/`);
assert.equal(nonApiPage.status, 404, "The product API must not serve frontend pages");
assert.equal((await nonApiPage.json() as { error: { code: string } }).error.code, "not_found");

await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
console.log(JSON.stringify({
  health: true,
  directory: true,
  research: true,
  exposure: true,
  quote: true,
  apiOnly: true,
  demoOnly: true,
  sideEffects: "none",
  passed: true
}, null, 2));
