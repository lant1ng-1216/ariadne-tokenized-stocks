import assert from "node:assert/strict";
import { BinanceWeb3Client, type RequestObservation } from "../src/binance-web3-client.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const observations: RequestObservation[] = [];
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL, onRequest: (item) => observations.push(item) });
const response = await client.get<any>("/api/v1/dex/market/rwa/search", { keyword: "NVDA" });
assert.equal(response.success, true);
assert.equal(observations.length, 1);
assert.equal(observations[0]?.success, true);
assert.ok((observations[0]?.durationMs ?? 0) >= 0);
console.log(JSON.stringify({ observation: observations[0], rateLimitHeadersAvailable: Object.keys(observations[0]?.rateLimitHeaders ?? {}).length > 0, resultCount: response.data?.length ?? 0 }, null, 2));
