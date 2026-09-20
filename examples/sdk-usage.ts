import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Configure .env first");

const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });
const stocks = new TokenizedStocksService(client);

const assets = await stocks.search("NVDA", { chainId: "56" });
console.log(assets.map((asset) => ({
  assetId: asset.assetId,
  platform: asset.platformId,
  symbol: asset.tokenSymbol,
  contract: asset.contractAddress
})));

if (assets[0]) console.log(await stocks.marketContext(assets[0]));
