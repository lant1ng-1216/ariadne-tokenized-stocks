import { TokenizedStocksService } from "./tokenized-stocks.js";
import type { ActionPlan, MarketContext, StockAsset } from "../domain/types.js";

const demoAssets: StockAsset[] = [
  { assetId: "56:0xa9ee28c80f960b889dfbd1902055218cba016f75", chainId: "56", platformId: "ondo", contractAddress: "0xa9ee28c80f960b889dfbd1902055218cba016f75", tokenSymbol: "NVDAon", underlyingTicker: "NVDA", underlyingName: "NVIDIA Corporation" },
  { assetId: "56:0x02fca66c1d1afb4e2a7884261eb00f63598a7436", chainId: "56", platformId: "bstock", contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "NVIDIA Corporation" }
];

export class DemoTokenizedStocksService extends TokenizedStocksService {
  override async search(query: string, options: { chainId?: string; platformId?: string } = {}): Promise<StockAsset[]> {
    const normalized = query.trim().toLowerCase();
    if (!(normalized === "nvda" || normalized.includes("nvidia"))) return [];
    return demoAssets.filter((asset) => (!options.chainId || asset.chainId === options.chainId) && (!options.platformId || asset.platformId === options.platformId));
  }

  override async marketContext(asset: StockAsset): Promise<MarketContext> {
    return {
      asset,
      tokenPrice: asset.platformId === "ondo" ? "221.08" : "221.09",
      referencePrice: "220.92",
      priceGap: asset.platformId === "ondo" ? "0.16" : "0.17",
      priceGapPercent: asset.platformId === "ondo" ? "0.0724%" : "0.0770%",
      tokenPriceUpdatedAt: Date.now(),
      marketStatus: "unknown",
      openState: true,
      volume24H: "demo-data",
      dataWarnings: ["Demo Mode data is deterministic and is not live market data", "The platform did not provide a recognized marketStatus", "Liquidity was not provided and must not be interpreted as zero"]
    };
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
