import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Configure .env first");

const client = new BinanceWeb3Client({ apiKey, apiSecret, proxyUrl: process.env.BINANCE_WEB3_PROXY_URL });
const stocks = new TokenizedStocksService(client);

const assets = await stocks.search("NVDA", { chainId: "56" });
if (assets.length === 0) throw new Error("No NVDA representation was returned");

console.log("Returned issuer representations:");
for (const asset of assets) console.log({
  assetId: asset.assetId,
  platform: asset.platformId,
  symbol: asset.tokenSymbol,
  contract: asset.contractAddress
});

const selectedAssetId = process.argv[2]?.trim();
if (!selectedAssetId) {
  console.info("Choose one exact assetId from the list, then run: npm run example:sdk -- <assetId>");
  process.exitCode = 2;
} else {
  const selectedAsset = assets.find((asset) => asset.assetId === selectedAssetId);
  if (!selectedAsset) throw new Error(`The selected assetId was not returned by this search: ${selectedAssetId}`);
  console.log("Market context for the explicitly selected representation:");
  console.log(await stocks.marketContext(selectedAsset));
}
