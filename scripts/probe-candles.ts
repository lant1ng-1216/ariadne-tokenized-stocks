import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const stocks = new TokenizedStocksService(new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL }));
const assets = await stocks.search("NVDA", { chainId: "56", platformId: "bstock" });
if (!assets[0]) throw new Error("No BSC bStocks NVDA asset found");
const candles = await stocks.candles(assets[0], { bar: "1m", limit: 5 });
console.log(JSON.stringify({ asset: assets[0], candleCount: candles.length, candles }, null, 2));
