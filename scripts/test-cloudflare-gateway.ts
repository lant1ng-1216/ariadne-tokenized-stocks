import assert from "node:assert/strict";
import { handleGatewayRequest, type GatewayEnv } from "../deploy/cloudflare-binance-gateway/src/index.js";

const env: GatewayEnv = {
  ARIADNE_GATEWAY_TOKEN: "test-only-gateway-token-32-characters",
  BINANCE_WEB3_UPSTREAM_BASE_URL: "https://upstream.example/build"
};
const seen: Request[] = [];
const fetcher = async (request: Request) => {
  seen.push(request);
  return Response.json({ code: 0, msg: "ok", success: true, data: [{ symbol: "NVDAB" }], timestamp: 1 });
};
const call = (path: string, init: RequestInit = {}) => handleGatewayRequest(new Request(`https://gateway.example${path}`, init), env, fetcher);

assert.equal((await call("/healthz")).status, 200);
assert.equal((await call("/api/v1/dex/market/rwa/search?keyword=NVDA")).status, 401);
assert.equal((await call("/api/v1/dex/aggregator/swap", { method: "GET", headers: { "x-ariadne-gateway-token": env.ARIADNE_GATEWAY_TOKEN } })).status, 403);
assert.equal((await call("/api/v1/dex/market/rwa/search", { method: "POST", headers: { "x-ariadne-gateway-token": env.ARIADNE_GATEWAY_TOKEN } })).status, 405);

const response = await call("/api/v1/dex/market/rwa/search?keyword=NVDA", {
  headers: {
    "x-ariadne-gateway-token": env.ARIADNE_GATEWAY_TOKEN,
    "x-oc-apikey": "provider-key",
    "x-oc-sign": "provider-signature",
    "cookie": "must-not-forward"
  }
});
assert.equal(response.status, 200);
assert.equal(seen.length, 1);
assert.equal(seen[0]?.url, "https://upstream.example/build/api/v1/dex/market/rwa/search?keyword=NVDA");
assert.equal(seen[0]?.headers.get("x-oc-apikey"), "provider-key");
assert.equal(seen[0]?.headers.get("cookie"), null);
assert.deepEqual(await response.json(), { code: 0, msg: "ok", success: true, data: [{ symbol: "NVDAB" }], timestamp: 1 });
console.log(JSON.stringify({ health: true, authentication: true, readOnlyMethod: true, marketPathAllowlist: true, headerAllowlist: true, upstreamTargetBinding: true, passed: true }, null, 2));
