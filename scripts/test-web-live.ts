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

const failingServer = createWebServer("live-readonly", {
  async search() { throw new Error("upstream secret should not be returned"); },
  async marketContext() { throw new Error("not reached"); }
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
  research: true,
  representationCount: payload.view.representations.length,
  liveReadOnly: true,
  sideEffects: "none",
  passed: true
}, null, 2));
