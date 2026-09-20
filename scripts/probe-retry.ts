import { BinanceWeb3Client } from "../src/binance-web3-client.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const observations: unknown[] = [];
const client = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL,
  timeoutMs: 5_000,
  maxRetries: 1,
  retryBaseDelayMs: 10,
  onRequest: (observation) => observations.push(observation)
});
const zero = "0x0000000000000000000000000000000000000000";
let result: unknown;
try {
  result = await client.post("/api/v1/defi/data/position/list", { addresses: [zero], binanceChainIds: ["56"] });
} catch (error) {
  result = { error: String(error) };
}
console.log(JSON.stringify({ result, observations }, null, 2));
