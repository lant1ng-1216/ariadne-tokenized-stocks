import { BinanceWeb3Client } from "../src/binance-web3-client.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const observations: unknown[] = [];
const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL, timeoutMs: 10_000, maxRetries: 0, onRequest: (observation) => observations.push(observation) });
const zero = "0x0000000000000000000000000000000000000000";
const bodies = [
  { variant: "documented", body: { addresses: [zero], binanceChainIds: ["56"] } },
  { variant: "chainIds-alias", body: { addresses: [zero], chainIds: ["56"] } },
  { variant: "documented-with-pagination", body: { addresses: [zero], binanceChainIds: ["56"], page: 1, size: 20 } }
];
const results = [];
for (const item of bodies) {
  try {
    const response = await client.post<any>("/api/v1/defi/data/position/list", item.body);
    results.push({ variant: item.variant, success: response.success, code: response.code, dataShape: Array.isArray(response.data) ? `array(${response.data.length})` : typeof response.data });
  } catch (error) {
    results.push({ variant: item.variant, error: String(error) });
  }
}
console.log(JSON.stringify({ results, observations }, null, 2));
