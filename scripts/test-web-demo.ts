import assert from "node:assert/strict";
import { createWebDemoServer } from "../src/web/demo-server.js";

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

const invalidQuote = await fetch(`${baseUrl}/api/quote?walletAddress=0x1111111111111111111111111111111111111111&query=NVDA&platformId=bstock&amount=0&chainId=56`);
assert.equal(invalidQuote.status, 400);
assert.equal((await invalidQuote.json() as { error: { code: string } }).error.code, "invalid_quote_request");

const methodCheck = await fetch(`${baseUrl}/api/research`, { method: "POST" });
assert.equal(methodCheck.status, 405);
assert.equal(methodCheck.headers.get("allow"), "GET");
assert.equal((await methodCheck.json() as { capabilities: { signing: boolean } }).capabilities.signing, false);

const staticPage = await fetch(`${baseUrl}/`);
assert.equal(staticPage.status, 200);
assert.match(await staticPage.text(), /Ariadne/);

await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
console.log(JSON.stringify({
  health: true,
  research: true,
  exposure: true,
  quote: true,
  staticPage: true,
  demoOnly: true,
  sideEffects: "none",
  passed: true
}, null, 2));
