import { BinanceWeb3Client } from "../src/binance-web3-client.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("Missing BINANCE_WEB3_API_KEY or BINANCE_WEB3_API_SECRET in .env");
}

const client = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL
});

const result = await client.get<Array<{ binanceChainId: string; name: string; shortName: string }>>(
  "/api/v1/dex/market/supported/chain"
);

console.log(JSON.stringify({
  success: result.success,
  code: result.code,
  chains: result.data?.map((chain) => ({
    id: chain.binanceChainId,
    name: chain.name,
    shortName: chain.shortName
  })) ?? []
}, null, 2));
