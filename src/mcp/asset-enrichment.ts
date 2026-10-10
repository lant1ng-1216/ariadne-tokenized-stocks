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
  failedGroups?: number;
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
  const assetsByChain = new Map<string, StockAsset[]>();
  for (const asset of assets) assetsByChain.set(asset.chainId, [...(assetsByChain.get(asset.chainId) ?? []), asset]);

  const enrichedByAsset = new Map<string, AgentTokenizedAsset>();
  const failureCategories: MarketContextFailureCategory[] = [];
  let failedGroups = 0;
  for (const chainAssets of assetsByChain.values()) {
    try {
      // The provider groups market-context requests by chain. Keep those groups
      // isolated so one unsupported chain cannot erase valid data from another.
      const contexts = await stocks.marketContexts(chainAssets);
      if (contexts.length !== chainAssets.length) throw new MarketContextIntegrityError("Market-context result count does not match requested asset count");

      const contextsByAsset = new Map(contexts.map((context) => [
        `${makeAssetId(context.asset.chainId, context.asset.contractAddress)}:${context.asset.platformId}`,
        context
      ]));
      const expectedKeys = new Set(chainAssets.map((asset) => `${makeAssetId(asset.chainId, asset.contractAddress)}:${asset.platformId}`));
      if (contextsByAsset.size !== contexts.length || contexts.some((context) => !expectedKeys.has(`${makeAssetId(context.asset.chainId, context.asset.contractAddress)}:${context.asset.platformId}`))) {
        throw new MarketContextIntegrityError("Market context does not match the requested asset set");
      }

      for (const asset of chainAssets) {
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
        enrichedByAsset.set(key, toAgentAsset(enrichedAsset, context, {}, isSynthetic ? { source: "synthetic" } : {}, { marketContextRequested: true }));
      }
    } catch (error) {
      failedGroups += 1;
      failureCategories.push(failureCategoryFor(error));
      const failureCategory = failureCategoryFor(error);
      for (const asset of chainAssets) {
        const key = `${makeAssetId(asset.chainId, asset.contractAddress)}:${asset.platformId}`;
        enrichedByAsset.set(key, toAgentAsset(asset, undefined, {}, stocks.dataMode ? { source: stocks.dataMode } : {}, {
          marketContextRequested: true,
          marketContextUnavailable: true,
          marketContextFailureCategory: failureCategory
        }));
      }
    }
  }

  const enriched = assets.map((asset) => enrichedByAsset.get(`${makeAssetId(asset.chainId, asset.contractAddress)}:${asset.platformId}`)!).filter(Boolean);
  const uniqueCategories = [...new Set(failureCategories)];
  onDiagnostics?.({
    batchCalls: assetsByChain.size,
    assetsRequested: assets.length,
    durationMs: elapsedMs(startedAt),
    ...(uniqueCategories.length === 1 ? { failureCategory: uniqueCategories[0] } : uniqueCategories.length > 1 ? { failureCategory: "unexpected_failure" as MarketContextFailureCategory } : {}),
    ...(failedGroups ? { failedGroups } : {})
  });
  return enriched;
}
