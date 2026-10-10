import assert from "node:assert/strict";
import { fetch as undiciFetch, Headers as UndiciHeaders, Response as UndiciResponse } from "undici";
import { fetchBinanceWeb3Klines } from "../src/services/binance-web3-kline.js";

const identity = { chainId: "56" as const, platformId: "bstock" as const, contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436" };
let requestUrl: URL | undefined;
let userAgent: string | null = null;
const fetcher: typeof undiciFetch = async (input, init) => {
  requestUrl = new URL(input.toString());
  userAgent = new UndiciHeaders(init?.headers).get("user-agent");
  return new UndiciResponse(JSON.stringify({
    code: "000000",
    success: true,
    data: { klineInfos: [
      [1_800_000_060_000, "237.2", "238.0", "236.8", "237.8", "12", 1_800_000_359_999],
      [1_800_000_000_000, "237.0", "237.9", "236.9", "237.2", "8", 1_800_000_059_999],
      [1_800_000_060_000, "237.2", "238.0", "236.8", "237.8", "12", 1_800_000_359_999],
      [1_800_000_360_000, "238.0", "not-a-number", "237.0", "237.4", "4", 1_800_000_659_999],
      [1_800_000_660_000, "237.8", "237.7", "237.6", "237.9", "1", 1_800_000_959_999]
    ] }
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const candles = await fetchBinanceWeb3Klines(identity, "5m", 100, { fetcher });
assert.deepEqual(candles, [
  { time: 1_800_000_000, open: 237, high: 237.9, low: 236.9, close: 237.2, volume: 8 },
  { time: 1_800_000_060, open: 237.2, high: 238, low: 236.8, close: 237.8, volume: 12 }
]);
assert.equal(requestUrl?.origin, "https://www.binance.com");
assert.equal(requestUrl?.pathname, "/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/kline/ai");
assert.equal(requestUrl?.searchParams.get("chainId"), "56");
assert.equal(requestUrl?.searchParams.get("contractAddress"), identity.contractAddress);
assert.equal(requestUrl?.searchParams.get("interval"), "5m");
assert.equal(requestUrl?.searchParams.get("limit"), "100");
assert.equal(userAgent, "binance-web3/1.1 (Skill)");
await assert.rejects(() => fetchBinanceWeb3Klines({ ...identity, contractAddress: "0x123" }, "5m", 100, { fetcher }), /exact BSC token contract/i);
await assert.rejects(() => fetchBinanceWeb3Klines(identity, "5m", 301, { fetcher }), /between 20 and 300/i);

console.log("Binance Web3 K-line passed: exact BSC contract query, official candle shape, ordering, duplicate removal, and invalid-value rejection.");
