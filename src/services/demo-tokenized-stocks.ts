import { TokenizedStocksService } from "./tokenized-stocks.js";
import type { ActionPlan, MarketContext, RwaPlatform, StockAsset, TokenizedStockListing } from "../domain/types.js";

const issuerMetadata = {
  ondo: {
    logoUrl: "https://public.bnbstatic.com/images/w3w/openapi/ondo.png",
    website: "https://ondo.finance"
  },
  bstock: {
    logoUrl: "https://public.bnbstatic.com/images/w3w/openapi/bstocks.png",
    website: "https://www.binance.com/en/bstocks-landing"
  }
} as const;

const demoAssets: StockAsset[] = [
  { assetId: "56:0xa9ee28c80f960b889dfbd1902055218cba016f75", chainId: "56", platformId: "ondo", contractAddress: "0xa9ee28c80f960b889dfbd1902055218cba016f75", tokenSymbol: "NVDAon", tokenName: "NVIDIA (Ondo)", tokenLogoUrl: "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/4357ecbcd49d4dea9bca1072cb0da0f6.png", issuerLogoUrl: issuerMetadata.ondo.logoUrl, issuerWebsite: issuerMetadata.ondo.website, underlyingTicker: "NVDA", underlyingName: "NVIDIA Corporation" },
  { assetId: "56:0x02fca66c1d1afb4e2a7884261eb00f63598a7436", chainId: "56", platformId: "bstock", contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436", tokenSymbol: "NVDAB", tokenName: "NVIDIA (bStocks)", tokenLogoUrl: "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/9dc00cf6f4c44054b6be2d2e032b76c0.png", issuerLogoUrl: issuerMetadata.bstock.logoUrl, issuerWebsite: issuerMetadata.bstock.website, underlyingTicker: "NVDA", underlyingName: "NVIDIA Corporation" }
];
export const DEMO_DATA_WARNING = "Demo Mode data is synthetic, deterministic, and not live market data";
const DEMO_MARKET_UPDATED_AT = Date.parse("2026-09-30T04:00:00.000Z");
const DEMO_FIXED_SNAPSHOT_WARNING = "Demo snapshot timestamp is fixed for reproducibility and may be stale";

const catalogSeeds = [
  ["AAPL", "Apple Inc.", "AAPLon", "ondo", "0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/F728DD7CABE8942D7CC78CDCF757A895.png", "344.63", "343.47"],
  ["TSLA", "Tesla, Inc.", "TSLAon", "ondo", "0x2494b603319d4d9f9715c9f4496d9e0364b59d93", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/0801972E9B193A41F25981BCA9F31DCE.png", "376.84", "376.84"],
  ["TSLA", "Tesla, Inc.", "TSLAB", "bstock", "0x5b1910eaad6450e50f816082aa078c41f10c292f", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/3f0d2deb79c148d1be92596e3ca827d1.png", "376.68", "376.68"],
  ["MSFT", "Microsoft Corp", "MSFTB", "bstock", "0x80106cb3ead06659a5ad19df39d9b4733863b9b0", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/ba09db2c5dd94560ab772bd36d124ce9.png", "496.34", "495.69"],
  ["MSFT", "Microsoft Corp", "MSFTon", "ondo", "0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/E2451A2BC812A4FDD0E4A9EC3889D422.png", "501.17", "498.31"],
  ["AMZN", "Amazon.com Inc", "AMZNon", "ondo", "0x4553cfe1c09f37f38b12dc509f676964e392f8fc", "https://onchainos.bnbstatic.com/images/web3-data/public/token/logos/5A6A9D0CA5F6FBD3E321D63E62716E9C.png", "254.56", "254.56"],
  ["META", "Meta Platforms, Inc.", "METAB", "bstock", "0x7425889fe94f9d693e8daefe88bcced6acfef4c0", undefined, "645.12", "644.72"],
  ["COIN", "Coinbase Global, Inc.", "COINon", "ondo", "0xf8589b526fdd65f7f301c605a6e04f0f1b4b3620", undefined, "388.30", "387.91"]
] as const;

function catalogAssets(): StockAsset[] {
  return catalogSeeds.map(([ticker, name, symbol, platformId, contractAddress, tokenLogoUrl]) => ({
    assetId: `56:${contractAddress.toLowerCase()}`,
    chainId: "56",
    platformId,
    contractAddress,
    tokenSymbol: symbol,
    tokenName: `${name} (${platformId === "ondo" ? "Ondo" : "bStocks"})`,
    tokenLogoUrl,
    issuerLogoUrl: issuerMetadata[platformId].logoUrl,
    issuerWebsite: issuerMetadata[platformId].website,
    underlyingTicker: ticker,
    underlyingName: name
  }));
}

function allDemoAssets(): StockAsset[] {
  return [...demoAssets, ...catalogAssets()];
}

function priceFor(asset: StockAsset): { tokenPrice: string; referencePrice: string } {
  const seed = catalogSeeds.find((item) => item[2] === asset.tokenSymbol);
  return {
    tokenPrice: seed?.[6] ?? (asset.platformId === "ondo" ? "221.08" : "221.09"),
    referencePrice: seed?.[7] ?? "220.92"
  };
}

function gapPercent(tokenPrice: string, referencePrice: string): string {
  return `${(((Number(tokenPrice) - Number(referencePrice)) / Number(referencePrice)) * 100).toFixed(4)}%`;
}

export class DemoTokenizedStocksService extends TokenizedStocksService {
  readonly dataMode = "synthetic" as const;

  override async platforms(platformId?: string): Promise<RwaPlatform[]> {
    return ([
      { platformId: "ondo", name: "Ondo", tickerCount: 459, chainDistribution: [{ chainId: "56", tokenCount: 458 }], website: issuerMetadata.ondo.website, logoUrl: issuerMetadata.ondo.logoUrl },
      { platformId: "bstock", name: "bStocks", tickerCount: 77, chainDistribution: [{ chainId: "56", tokenCount: 77 }], website: issuerMetadata.bstock.website, logoUrl: issuerMetadata.bstock.logoUrl }
    ] satisfies RwaPlatform[]).filter((platform) => !platformId || platform.platformId === platformId);
  }

  override async list(options: { chainId?: string; platformId?: string } = {}): Promise<TokenizedStockListing[]> {
    const allAssets = allDemoAssets();
    return allAssets
      .filter((asset) => (!options.chainId || asset.chainId === options.chainId) && (!options.platformId || asset.platformId === options.platformId))
      .map((asset, index) => {
        const { tokenPrice, referencePrice } = priceFor(asset);
        return {
          ...asset,
          underlyingNameZh: asset.underlyingTicker === "NVDA" ? "英伟达" : undefined,
          tags: index < 6 ? ["featured"] : [],
          tokenToShareRatio: "1",
          market: {
            asset,
            tokenPrice,
            referencePrice,
            priceGap: (Number(tokenPrice) - Number(referencePrice)).toFixed(2),
            priceGapPercent: gapPercent(tokenPrice, referencePrice),
            tokenPriceUpdatedAt: DEMO_MARKET_UPDATED_AT,
            marketStatus: "unknown",
            openState: true,
            volume24H: `${(9_000_000_000 - index * 340_000_000).toFixed(0)}`,
            dataWarnings: [DEMO_DATA_WARNING, DEMO_FIXED_SNAPSHOT_WARNING, "The platform did not provide a recognized marketStatus", "Liquidity was not provided and must not be interpreted as zero"]
          },
          marketCap: `${5_000_000_000_000 - index * 180_000_000_000}`,
          peRatioTTM: `${24 + index}`
        };
      });
  }

  override async listSnapshot(options: { chainId?: string; platformId?: string } = {}) {
    return { listings: await this.list(options) };
  }

  override async search(query: string, options: { chainId?: string; platformId?: string } = {}): Promise<StockAsset[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return allDemoAssets().filter((asset) => {
      const matchesIdentity = [asset.underlyingTicker, asset.tokenSymbol, asset.underlyingName, asset.tokenName]
        .some((value) => value?.toLowerCase().includes(normalized));
      return matchesIdentity && (!options.chainId || asset.chainId === options.chainId) && (!options.platformId || asset.platformId === options.platformId);
    });
  }

  override async marketContext(asset: StockAsset): Promise<MarketContext> {
    const fixture = allDemoAssets().find((candidate) =>
      candidate.chainId === asset.chainId &&
      candidate.platformId === asset.platformId &&
      candidate.contractAddress.toLowerCase() === asset.contractAddress.toLowerCase()
    );
    if (!fixture) throw new Error("No deterministic Demo Mode market fixture exists for this representation");
    const { tokenPrice, referencePrice } = priceFor(fixture);
    return {
      asset: fixture,
      tokenPrice,
      referencePrice,
      priceGap: (Number(tokenPrice) - Number(referencePrice)).toFixed(2),
      priceGapPercent: gapPercent(tokenPrice, referencePrice),
      tokenPriceUpdatedAt: DEMO_MARKET_UPDATED_AT,
      marketStatus: "unknown",
      openState: true,
      volume24H: "demo-data",
      dataWarnings: [DEMO_DATA_WARNING, DEMO_FIXED_SNAPSHOT_WARNING, "The platform did not provide a recognized marketStatus", "Liquidity was not provided and must not be interpreted as zero"]
    };
  }

  override async marketContexts(assets: StockAsset[]): Promise<MarketContext[]> {
    return Promise.all(assets.map((asset) => this.marketContext(asset)));
  }

  override async createActionPlan(intent: ActionPlan["intent"]): Promise<ActionPlan> {
    const market = await this.marketContext(intent.toAsset);
    return {
      planId: `demo_plan_${Date.now()}`,
      status: "failed",
      intent,
      assetContext: market,
      safetyReport: { passed: false, checks: [], blockingReasons: ["Demo Mode does not create executable action plans"] },
      requiresUserConfirmation: true
    };
  }
}
