import { makeAssetId } from "../domain/normalizers.js";
import { toAgentAsset } from "../domain/agent-normalizers.js";
import type { AgentTokenizedAsset, MarketContextFailureCategory } from "../domain/agent-types.js";
import type { MarketContext, StockAsset } from "../domain/types.js";
import { BinanceWeb3Error } from "../errors.js";
import { performance } from "node:perf_hooks";
import { DEMO_DATA_WARNING } from "../services/demo-tokenized-stocks.js";

export type MarketContextReader = {
  marketContexts(assets: StockAsset[]): Promise<MarketContext[]>;
  dataMode?: "synthetic";
};

export type MarketContextEnrichmentDiagnostics = {
  batchCalls: number;
  assetsRequested: number;
  durationMs: number;
  failureCategory?: MarketContextFailureCategory;
};

class MarketContextIntegrityError extends Error {}

function failureCategoryFor(error: unknown): MarketContextFailureCategory {
  if (error instanceof MarketContextIntegrityError) return "data_integrity_failure";
  if (error instanceof BinanceWeb3Error) return error.status === 0 ? "network_failure" : "provider_failure";
  return "unexpected_failure";
}

const elapsedMs = (startedAt: number) => Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100);

export async function enrichAgentAssets(
  stocks: MarketContextReader,
  assets: StockAsset[],
  requestMarketContext = true,
  onDiagnostics?: (diagnostics: MarketContextEnrichmentDiagnostics) => void
): Promise<AgentTokenizedAsset[]> {
  if (!requestMarketContext) {
    onDiagnostics?.({ batchCalls: 0, assetsRequested: assets.length, durationMs: 0 });
    return assets.map((asset) => toAgentAsset(asset, undefined, {}, stocks.dataMode ? { source: stocks.dataMode } : {}));
  }

  const startedAt = performance.now();
  try {
    const contexts = await stocks.marketContexts(assets);
    if (contexts.length !== assets.length) throw new MarketContextIntegrityError("Market-context result count does not match requested asset count");

    const contextsByAsset = new Map(contexts.map((context) => [
      `${makeAssetId(context.asset.chainId, context.asset.contractAddress)}:${context.asset.platformId}`,
      context
    ]));
    const enriched = assets.map((asset) => {
      const key = `${makeAssetId(asset.chainId, asset.contractAddress)}:${asset.platformId}`;
      const context = contextsByAsset.get(key);
      if (!context) throw new MarketContextIntegrityError("Market context does not match the requested asset set");
      const enrichedAsset: StockAsset = {
        ...asset,
        tokenName: context.asset.tokenName ?? asset.tokenName,
        tokenLogoUrl: context.asset.tokenLogoUrl ?? asset.tokenLogoUrl,
        issuerLogoUrl: context.asset.issuerLogoUrl ?? asset.issuerLogoUrl,
        issuerWebsite: context.asset.issuerWebsite ?? asset.issuerWebsite
      };
      const isSynthetic = stocks.dataMode === "synthetic" || context.dataWarnings.includes(DEMO_DATA_WARNING);
      return toAgentAsset(enrichedAsset, context, {}, isSynthetic ? { source: "synthetic" } : {}, { marketContextRequested: true });
    });
    onDiagnostics?.({ batchCalls: 1, assetsRequested: assets.length, durationMs: elapsedMs(startedAt) });
    return enriched;
  } catch (error) {
    const failureCategory = failureCategoryFor(error);
    onDiagnostics?.({ batchCalls: 1, assetsRequested: assets.length, durationMs: elapsedMs(startedAt), failureCategory });
    return assets.map((asset) => toAgentAsset(asset, undefined, {}, stocks.dataMode ? { source: stocks.dataMode } : {}, {
      marketContextRequested: true,
      marketContextUnavailable: true,
      marketContextFailureCategory: failureCategory
    }));
  }
}
