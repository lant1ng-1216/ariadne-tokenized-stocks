import assert from "node:assert/strict";
import { createWebLiveServer, createWebServer } from "../src/web/demo-server.js";

if (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET) {
  throw new Error("Missing BINANCE_WEB3_API_KEY or BINANCE_WEB3_API_SECRET");
}

const server = createWebLiveServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

const health = await fetch(`${baseUrl}/api/health`);
assert.equal(health.status, 200);
const healthPayload = await health.json() as { status: string; mode: string; sideEffects: string; researchOnly: boolean; credentials: string; capabilities: Record<string, boolean>; requestId: string };
assert.equal(healthPayload.status, "ok");
assert.equal(healthPayload.mode, "live-readonly");
assert.equal(healthPayload.sideEffects, "none");
assert.equal(healthPayload.researchOnly, true);
assert.equal(healthPayload.credentials, "server-only");
assert.equal(healthPayload.capabilities.broadcast, false);
assert.match(healthPayload.requestId, /^[0-9a-f-]{36}$/);

const directory = await fetch(`${baseUrl}/api/assets?chainId=56&limit=1000&offset=0`);
assert.equal(directory.status, 200);
const directoryPayload = await directory.json() as { requestId: string; view: { kind: string; summary: { totalRepresentations: number; distinctTickerValues: number; returned: number }; items: Array<{ underlying: { logoUrl?: string }; issuer: { logoUrl?: string } }>; provenance: { inferredLogos: boolean; sourceResponseTimestampMs?: number; platformMetadataResponseTimestampMs?: number }; boundary: { sideEffects: string } } };
assert.match(directoryPayload.requestId, /^[0-9a-f-]{36}$/);
assert.equal(directoryPayload.view.kind, "tokenized_stock_directory");
assert.ok(directoryPayload.view.summary.totalRepresentations > 100);
assert.ok(directoryPayload.view.summary.distinctTickerValues > 50);
assert.equal(directoryPayload.view.summary.returned, directoryPayload.view.summary.totalRepresentations);
assert.equal(directoryPayload.view.items.length, directoryPayload.view.summary.returned, "one local request returns one consistent observed catalog snapshot");
assert.equal(directoryPayload.view.items.length <= 1_000, true);
assert.ok(directoryPayload.view.items.every((item) => item.underlying.logoUrl));
assert.ok(directoryPayload.view.items.every((item) => item.issuer.logoUrl));
assert.equal(directoryPayload.view.provenance.inferredLogos, false);
assert.ok(Number.isFinite(directoryPayload.view.provenance.sourceResponseTimestampMs) && directoryPayload.view.provenance.sourceResponseTimestampMs! > 0, "live directory must preserve the provider catalog-response timestamp");
assert.ok(Number.isFinite(directoryPayload.view.provenance.platformMetadataResponseTimestampMs) && directoryPayload.view.provenance.platformMetadataResponseTimestampMs! > 0, "live directory must preserve the provider platform-metadata response timestamp separately");
assert.equal(directoryPayload.view.boundary.sideEffects, "none");

const quoteQuery = new URLSearchParams({ chainId: "56" });
quoteQuery.append("representation", "ondo:0xa9ee28c80f960b889dfbd1902055218cba016f75");
quoteQuery.append("representation", "bstock:0x02fca66c1d1afb4e2a7884261eb00f63598a7436");
const timestampedPrices = await fetch(`${baseUrl}/api/asset-prices?${quoteQuery}`);
assert.equal(timestampedPrices.status, 200);
const timestampedPayload = await timestampedPrices.json() as { view: { kind: string; items: Array<{ chainId: string; platformId: string; contractAddress: string; state: string; tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number }> }; sideEffects: string };
assert.equal(timestampedPayload.view.kind, "timestamped_token_prices");
assert.equal(timestampedPayload.view.items.length, 2);
assert.deepEqual(timestampedPayload.view.items.map((item) => item.platformId).sort(), ["bstock", "ondo"]);
assert.ok(timestampedPayload.view.items.every((item) => item.state === "available" && Number(item.tokenPrice) > 0 && typeof item.tokenPriceUpdatedAt === "number" && item.tokenPriceUpdatedAt > 0));
assert.equal(timestampedPayload.sideEffects, "none");

const research = await fetch(`${baseUrl}/api/research?query=NVDA&chainId=56`);
assert.equal(research.status, 200);
const payload = await research.json() as { mode: string; requestId: string; durationMs: number; view: { kind: string; representations: unknown[]; boundary: { sideEffects: string; transactionCreated: boolean; signatureRequested: boolean; broadcastAttempted: boolean } } };
assert.equal(payload.mode, "live-readonly");
assert.match(payload.requestId, /^[0-9a-f-]{36}$/);
assert.ok(payload.durationMs >= 0);
assert.equal(payload.view.kind, "tokenized_stock_research");
assert.ok(payload.view.representations.length > 0);
assert.equal(payload.view.boundary.sideEffects, "none");
assert.equal(payload.view.boundary.transactionCreated, false);
assert.equal(payload.view.boundary.signatureRequested, false);
assert.equal(payload.view.boundary.broadcastAttempted, false);
assert.equal(JSON.stringify(payload).includes(process.env.BINANCE_WEB3_API_SECRET ?? "__missing__"), false);

const exposure = await fetch(`${baseUrl}/api/exposure?walletAddress=0x0000000000000000000000000000000000000000&query=NVDA&chainId=56`);
assert.equal(exposure.status, 200);
const exposurePayload = await exposure.json() as { view: { kind: string; boundary: { sideEffects: string; privateKeyRequested: boolean; signatureRequested: boolean; broadcastAttempted: boolean } } };
assert.equal(exposurePayload.view.kind, "wallet_exposure");
assert.equal(exposurePayload.view.boundary.sideEffects, "none");
assert.equal(exposurePayload.view.boundary.privateKeyRequested, false);
assert.equal(exposurePayload.view.boundary.signatureRequested, false);
assert.equal(exposurePayload.view.boundary.broadcastAttempted, false);

const quote = await fetch(`${baseUrl}/api/quote?walletAddress=0x0000000000000000000000000000000000000000&query=NVDA&platformId=bstock&amount=10&chainId=56`);
assert.equal(quote.status, 200);
const quotePayload = await quote.json() as { view: { kind: string; boundary: { sideEffects: string; actionPlanCreated: boolean; signatureRequested: boolean; broadcastAttempted: boolean } } };
assert.equal(quotePayload.view.kind, "read_only_quote");
assert.equal(quotePayload.view.boundary.sideEffects, "none");
assert.equal(quotePayload.view.boundary.actionPlanCreated, false);
assert.equal(quotePayload.view.boundary.signatureRequested, false);
assert.equal(quotePayload.view.boundary.broadcastAttempted, false);

const candles = await fetch(`${baseUrl}/api/candles?query=NVDA&chainId=56&platformId=bstock&contractAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&bar=1m`);
assert.equal(candles.status, 200);
const candlePayload = await candles.json() as { view: { state: string; candles: Array<{ time: number; open: number; close: number }>; chainId: string; contractAddress: string; platformId: string; source: string; asOf: number | null; sourceResponseTimestampMs: number | null } };
assert.equal(candlePayload.view.chainId, "56");
assert.equal(candlePayload.view.contractAddress.toLowerCase(), "0x02fca66c1d1afb4e2a7884261eb00f63598a7436");
assert.equal(candlePayload.view.platformId, "bstock");
assert.equal(candlePayload.view.source, "binance_web3_market_api");
assert.equal(candlePayload.view.sourceResponseTimestampMs, null, "client request time is not asserted to be the provider's response time");
assert.equal(candlePayload.view.asOf, candlePayload.view.candles.at(-1)?.time ?? null, "asOf refers to the last bar timestamp");
assert.ok(candlePayload.view.candles.every((row) => row.time > 1_000_000_000_000 && row.open > 0 && row.close > 0));

const failingServer = createWebServer("live-readonly", {
  async search() { throw new Error("upstream secret should not be returned"); },
  async marketContext() { throw new Error("not reached"); },
  async marketContexts() { throw new Error("upstream secret should not be returned"); },
  async list() { throw new Error("upstream secret should not be returned"); },
  async listSnapshot() { throw new Error("upstream secret should not be returned"); },
  async platforms() { throw new Error("upstream secret should not be returned"); }
});
await new Promise<void>((resolve) => failingServer.listen(0, "127.0.0.1", resolve));
const failingAddress = failingServer.address();
assert.ok(failingAddress && typeof failingAddress === "object");
const failedResearch = await fetch(`http://127.0.0.1:${failingAddress.port}/api/research?query=NVDA&chainId=56`);
assert.equal(failedResearch.status, 502);
const failedPayload = await failedResearch.json() as { error: { code: string; message: string; retryable: boolean }; sideEffects: string };
assert.equal(failedPayload.error.code, "research_unavailable");
assert.equal(failedPayload.error.retryable, true);
assert.equal(failedPayload.error.message.includes("upstream secret"), false);
assert.equal(failedPayload.sideEffects, "none");
await new Promise<void>((resolve, reject) => failingServer.close((error) => error ? reject(error) : resolve()));

await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
console.log(JSON.stringify({
  health: true,
  directory: true,
  directoryRepresentations: directoryPayload.view.summary.totalRepresentations,
  research: true,
  representationCount: payload.view.representations.length,
  liveReadOnly: true,
  sideEffects: "none",
  passed: true
}, null, 2));
