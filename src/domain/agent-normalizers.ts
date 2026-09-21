import type { AssetComparison, AssetComparisonRow, AgentTokenizedAsset, AssetMetadata, AssetPreference, DataQuality, Issuer } from "./agent-types.js";
import type { MarketContext, StockAsset } from "./types.js";

const knownIssuers: Record<string, string> = {
  ondo: "Ondo",
  bstock: "bStocks",
  xstocks: "xStocks"
};

export function issuerFromPlatform(platformId: string, overrides: Partial<Issuer> = {}): Issuer {
  const id = platformId.toLowerCase();
  return {
    id,
    name: overrides.name ?? knownIssuers[id] ?? platformId,
    logoUrl: overrides.logoUrl,
    description: overrides.description,
    links: overrides.links ?? []
  };
}

export function assetLinks(asset: StockAsset, issuer: Issuer): AssetMetadata & { links: AgentTokenizedAsset["links"] } {
  const explorer = asset.chainId === "56"
    ? `https://bscscan.com/token/${asset.contractAddress}`
    : undefined;
  const links = [
    ...issuer.links,
    ...(explorer ? [{ label: "explorer" as const, url: explorer }] : [])
  ];
  return {
    tags: [],
    source: "api",
    links
  };
}

export function dataQualityFor(asset: StockAsset, market?: MarketContext, metadata?: AssetMetadata): DataQuality {
  const missingFields: string[] = [];
  if (!asset.tokenSymbol) missingFields.push("tokenSymbol");
  if (!asset.underlyingTicker) missingFields.push("underlyingTicker");
  if (!market?.tokenPrice) missingFields.push("tokenPrice");
  if (!market?.referencePrice) missingFields.push("referencePrice");
  if (market?.liquidity == null) missingFields.push("liquidity");
  if (!metadata?.underlyingLogoUrl) missingFields.push("underlyingLogoUrl");
  if (!metadata?.issuerLogoUrl) missingFields.push("issuerLogoUrl");
  const warnings = [...(market?.dataWarnings ?? [])];
  if (missingFields.includes("underlyingLogoUrl")) warnings.push("Underlying asset logo metadata is unavailable");
  if (missingFields.includes("issuerLogoUrl")) warnings.push("Issuer logo metadata is unavailable");
  const completeness = missingFields.length === 0 ? "complete" : missingFields.length <= 2 ? "partial" : "limited";
  return { completeness, missingFields, warnings, lastUpdatedAt: market?.tokenPriceUpdatedAt };
}

export function toAgentAsset(asset: StockAsset, market?: MarketContext, issuerOverrides: Partial<Issuer> = {}, metadataOverrides: Partial<AssetMetadata> = {}): AgentTokenizedAsset {
  const issuer = issuerFromPlatform(asset.platformId, issuerOverrides);
  const generated = assetLinks(asset, issuer);
  const metadata: AssetMetadata = { ...generated, ...metadataOverrides, tags: metadataOverrides.tags ?? generated.tags };
  return {
    ...asset,
    issuer,
    metadata,
    market,
    dataQuality: dataQualityFor(asset, market, metadata),
    links: generated.links
  };
}

function gapPercentNumber(asset: AgentTokenizedAsset): number | undefined {
  const value = asset.market?.priceGapPercent?.replace(/%$/, "");
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.abs(parsed) : undefined;
}

function matchesPreference(asset: AgentTokenizedAsset, preference: AssetPreference): { reasons: string[]; exclusions: string[] } {
  const reasons: string[] = [];
  const exclusions: string[] = [];
  if (preference.issuerIds?.length && !preference.issuerIds.includes(asset.issuer.id)) exclusions.push("issuer is outside the requested set");
  if (preference.platforms?.length && !preference.platforms.includes(asset.platformId)) exclusions.push("platform is outside the requested set");
  if (preference.requireMarketPrice && !asset.market?.tokenPrice) exclusions.push("token price is unavailable");
  if (preference.requireReferencePrice && !asset.market?.referencePrice) exclusions.push("reference price is unavailable");
  if (preference.requireKnownMarketStatus && (!asset.market || asset.market.marketStatus === "unknown")) exclusions.push("market status is unknown");
  const gap = gapPercentNumber(asset);
  if (preference.maxPriceGapPercent !== undefined && (gap === undefined || gap > Number(preference.maxPriceGapPercent))) exclusions.push("price gap exceeds the requested limit or is unavailable");
  if (!exclusions.length) reasons.push("matches the requested asset criteria");
  return { reasons, exclusions };
}

export function compareAgentAssets(assets: AgentTokenizedAsset[], criteria: AssetPreference = {}): AssetComparison {
  const rows: AssetComparisonRow[] = assets.map((asset) => {
    const match = matchesPreference(asset, criteria);
    return { asset, matchReasons: match.reasons, excludedReasons: match.exclusions };
  });
  const eligible = rows.filter((row) => row.excludedReasons.length === 0);
  eligible.sort((a, b) => (gapPercentNumber(a.asset) ?? Number.POSITIVE_INFINITY) - (gapPercentNumber(b.asset) ?? Number.POSITIVE_INFINITY));
  eligible.forEach((row, index) => { row.rank = index + 1; });
  const ticker = assets[0]?.underlyingTicker ?? "unknown";
  const name = assets[0]?.underlyingName ?? ticker;
  return {
    underlyingTicker: ticker,
    underlyingName: name,
    rows,
    criteria,
    summary: eligible.length ? `${eligible.length} of ${assets.length} representations match the requested criteria` : "No representation matches the requested criteria",
    warnings: rows.flatMap((row) => row.asset.dataQuality.warnings).filter((warning, index, all) => all.indexOf(warning) === index)
  };
}
