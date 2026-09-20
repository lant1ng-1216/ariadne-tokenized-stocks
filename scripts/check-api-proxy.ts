import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");
const secret = apiSecret;
const proxy = process.env.BINANCE_WEB3_PROXY_URL;

function get(path: string) {
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}GET${path}`, "utf8")
    .digest("base64");
  return spawnSync("curl", [
  "--silent", "--show-error", "--max-time", "20",
  ...(proxy ? ["--proxy", proxy] : []),
  "--header", `X-OC-APIKEY: ${apiKey}`,
  "--header", `X-OC-TIMESTAMP: ${timestamp}`,
  "--header", `X-OC-SIGN: ${signature}`,
  `https://web3.binance.com${path}`
  ], { encoding: "utf8" });
}

function post(path: string, body: string) {
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}POST${path}${body}`, "utf8")
    .digest("base64");
  return spawnSync("curl", [
    "--silent", "--show-error", "--max-time", "20",
    ...(proxy ? ["--proxy", proxy] : []),
    "--header", `X-OC-APIKEY: ${apiKey}`,
    "--header", `X-OC-TIMESTAMP: ${timestamp}`,
    "--header", `X-OC-SIGN: ${signature}`,
    "--header", "Content-Type: application/json",
    "--data-raw", body,
    `https://web3.binance.com${path}`
  ], { encoding: "utf8" });
}

function parse(result: ReturnType<typeof spawnSync>) {
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`curl exited with status ${result.status}: ${result.stderr}`);
  return JSON.parse(String(result.stdout)) as any;
}

const chains = parse(get("/build/api/v1/dex/market/supported/chain"));
const rwa = parse(get("/build/api/v1/dex/market/rwa/search?keyword=NVDA"));
const bscAssets = rwa.data?.[0]?.assets?.filter((asset: any) => asset.binanceChainId === "56") ?? [];
const addresses = bscAssets.map((asset: any) => asset.tokenContractAddress).join(",");
const rwaPrices = addresses
  ? parse(get(`/build/api/v1/dex/market/rwa/price?binanceChainId=56&tokenContractAddresses=${encodeURIComponent(addresses)}`))
  : { success: false, code: -1, msg: "No BSC NVDA assets found", data: [] };
const rwaTokens = parse(get("/build/api/v1/dex/market/rwa/tokens?binanceChainId=56"));
const marketInfo = addresses
  ? parse(post("/build/api/v1/dex/market/price-info", JSON.stringify(
    bscAssets.map((asset: any) => ({ binanceChainId: "56", tokenContractAddress: asset.tokenContractAddress }))
  )))
  : { success: false, code: -1, msg: "No BSC NVDA assets found", data: [] };
const usdt = "0x55d398326f99059fF775485246999027B3197955";
const quoteTargets = bscAssets.map((asset: any) => ({
  platformId: asset.platformId,
  tokenSymbol: asset.tokenSymbol,
  contract: asset.tokenContractAddress,
  quote: parse(get(`/build/api/v1/dex/aggregator/quote?binanceChainId=56&amount=10000000000000000000&fromTokenAddress=${usdt}&toTokenAddress=${asset.tokenContractAddress}`))
}));
const ondo = bscAssets.find((asset: any) => asset.platformId === "ondo");
const rfqQuote = ondo
  ? parse(get(`/build/api/v1/dex/aggregator/quote?binanceChainId=56&amount=10000000000000000000&fromTokenAddress=${usdt}&toTokenAddress=${ondo.tokenContractAddress}&userWalletAddress=0x0000000000000000000000000000000000000000`))
  : { success: false, code: -1, msg: "No Ondo BSC asset found", data: [] };
const bstockQuote = quoteTargets.find((entry: any) => entry.platformId === "bstock")?.quote;
const bstockRoute = bstockQuote?.data?.[0];
const swapBuild = bstockRoute
  ? parse(post("/build/api/v1/dex/aggregator/swap", JSON.stringify({
    binanceChainId: "56",
    quoteId: bstockRoute.quoteId,
    userWalletAddress: "0x0000000000000000000000000000000000000000"
  })))
  : { success: false, code: -1, msg: "No bStocks quote route", data: null };
const walletChains = parse(get("/build/api/v1/dex/balance/supported/chain?binanceChainId=56"));
const zeroBalances = parse(get("/build/api/v1/dex/balance/all-token-balances-by-address?address=0x0000000000000000000000000000000000000000&chains=56&excludeRiskToken=true&page=1&pageSize=20"));

console.log(JSON.stringify({
  chainQuery: { success: chains.success, code: chains.code, message: chains.msg },
  rwaSearch: {
    success: rwa.success,
    code: rwa.code,
    message: rwa.msg,
    results: rwa.data?.map((item: any) => ({
      ticker: item.ticker,
      companyName: item.companyName,
      assets: item.assets?.map((asset: any) => ({
        platformId: asset.platformId,
        tokenSymbol: asset.tokenSymbol,
        chainId: asset.binanceChainId,
        contract: asset.tokenContractAddress
      }))
    })) ?? []
  },
  rwaPrices: {
    success: rwaPrices.success,
    code: rwaPrices.code,
    message: rwaPrices.msg,
    results: rwaPrices.data?.map((item: any) => ({
      contract: item.tokenContractAddress,
      platformId: item.platformId,
      tokenPrice: item.tokenPrice,
      referencePrice: item.referencePrice,
      updatedAt: item.tokenPriceUpdatedAt
    })) ?? []
  },
  rwaTokenList: {
    success: rwaTokens.success,
    code: rwaTokens.code,
    message: rwaTokens.msg,
    resultCount: rwaTokens.data?.length ?? 0,
    nvdaMatches: rwaTokens.data?.filter((item: any) => item.underlyingTicker === "NVDA").map((item: any) => ({
      platformId: item.platformId,
      symbol: item.tokenSymbol,
      marketStatus: item.statusInfo?.marketStatus,
      openState: item.statusInfo?.openState,
      tokenPrice: item.tokenPrice,
      referencePrice: item.referencePrice,
      nextOpenTime: item.statusInfo?.nextOpenTime
    })) ?? []
  },
  marketInfo: {
    success: marketInfo.success,
    code: marketInfo.code,
    message: marketInfo.msg,
    results: marketInfo.data?.map((item: any) => ({
      contract: item.tokenContractAddress,
      price: item.price,
      liquidity: item.liquidity,
      volume24H: item.volume24H,
      holders: item.holders,
      priceChange24H: item.priceChange24H
    })) ?? []
  },
  quotes: quoteTargets.map((entry: any) => ({
    platformId: entry.platformId,
    tokenSymbol: entry.tokenSymbol,
    contract: entry.contract,
    success: entry.quote.success,
    code: entry.quote.code,
    message: entry.quote.msg,
    routes: entry.quote.data?.map((route: any) => ({
      quoteId: route.quoteId,
      toTokenAmount: route.toTokenAmount,
      minToTokenAmount: route.minToTokenAmount,
      priceImpact: route.priceImpact,
      dexName: route.dexName
    })) ?? []
  })),
  ondoRfqWithZeroAddress: {
    success: rfqQuote.success,
    code: rfqQuote.code,
    message: rfqQuote.msg,
    routeCount: rfqQuote.data?.length ?? 0
  },
  bstockSwapBuild: {
    success: swapBuild.success,
    code: swapBuild.code,
    message: swapBuild.msg,
    hasData: Boolean(swapBuild.data)
  },
  walletApi: {
    supportedChains: {
      success: walletChains.success,
      code: walletChains.code,
      count: walletChains.data?.length ?? 0
    },
    zeroAddressBalances: {
      success: zeroBalances.success,
      code: zeroBalances.code,
      message: zeroBalances.msg,
      data: zeroBalances.data
    }
  },
  chains: chains.data?.map((chain: any) => ({
    id: chain.binanceChainId,
    name: chain.name,
    shortName: chain.shortName
  })) ?? []
}, null, 2));
