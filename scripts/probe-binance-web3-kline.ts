import { fetchBinanceWeb3Klines } from "../src/services/binance-web3-kline.js";

const candles = await fetchBinanceWeb3Klines({
  chainId: "56",
  platformId: "bstock",
  contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436"
}, "5m", 100, { proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });

console.log(JSON.stringify({
  source: "Binance Web3 tokenized-stock K-line API",
  chain: "BSC (56)",
  token: "bStocks NVDAB",
  interval: "5m",
  candleCount: candles.length,
  latestCandle: candles.at(-1),
  latestCandleTime: candles.length ? new Date(candles.at(-1)!.time * 1_000).toISOString() : undefined
}, null, 2));

if (candles.length === 0) process.exitCode = 1;
