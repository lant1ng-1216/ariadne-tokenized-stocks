import type { TokenizedStockListing } from "../domain/types.js";
import type { OutputLanguage } from "../presentation/language.js";
import type { TokenizedStockCatalogSnapshot } from "../services/tokenized-stocks.js";

export type CatalogBrowseFilters = {
  issuerIds?: string[];
  assetTypes?: number[];
  multiIssuerOnly?: boolean;
  offset?: number;
  limit?: number;
};

export type CatalogBrowsePayload = ReturnType<typeof buildCatalogBrowsePayload>;

const issuerName = (platformId: string) => platformId === "bstock" ? "bStocks" : platformId === "ondo" ? "Ondo" : platformId;
const assetTypeName = (assetType: number, language: OutputLanguage) => assetType === 1
  ? language === "zh-CN" ? "股票" : "Stock"
  : assetType === 2 ? "Pre-IPO"
    : assetType === 3 ? "ETF"
      : language === "zh-CN" ? `其他类型 ${assetType}` : `Other type ${assetType}`;
const unique = <T>(values: T[]) => [...new Set(values)];
const tickerKey = (listing: TokenizedStockListing) => listing.underlyingTicker.trim().toUpperCase();
const representationKey = (listing: TokenizedStockListing) => `${listing.chainId}:${listing.platformId}:${listing.contractAddress.toLowerCase()}`;

function dedupeListings(listings: TokenizedStockListing[]) {
  return [...new Map(listings.map((listing) => [representationKey(listing), listing])).values()];
}

function groupUnderlyings(listings: TokenizedStockListing[]) {
  const groups = new Map<string, TokenizedStockListing[]>();
  for (const listing of listings) groups.set(tickerKey(listing), [...(groups.get(tickerKey(listing)) ?? []), listing]);
  return groups;
}

export function buildCatalogBrowsePayload(
  snapshot: TokenizedStockCatalogSnapshot,
  filters: CatalogBrowseFilters,
  language: OutputLanguage,
) {
  const allListings = dedupeListings(snapshot.listings.filter((listing) => listing.chainId === "56"));
  const allGroups = groupUnderlyings(allListings);
  const multiIssuerTickers = new Set([...allGroups.entries()]
    .filter(([, listings]) => new Set(listings.map((listing) => listing.platformId)).size > 1)
    .map(([ticker]) => ticker));
  const selectedIssuers = new Set((filters.issuerIds ?? []).map((issuer) => issuer.trim().toLowerCase()).filter(Boolean));
  const selectedAssetTypes = new Set(filters.assetTypes ?? []);
  const filteredListings = allListings.filter((listing) =>
    (!selectedIssuers.size || selectedIssuers.has(listing.platformId.toLowerCase())) &&
    (!selectedAssetTypes.size || (listing.assetType !== undefined && selectedAssetTypes.has(listing.assetType))) &&
    (!filters.multiIssuerOnly || multiIssuerTickers.has(tickerKey(listing)))
  );
  const filteredGroups = groupUnderlyings(filteredListings);
  const items = [...filteredGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ticker, listings]) => ({
      underlyingTicker: ticker,
      underlyingName: listings.find((listing) => listing.underlyingName)?.underlyingName ?? ticker,
      ...(listings.find((listing) => listing.underlyingNameZh)?.underlyingNameZh ? { underlyingNameZh: listings.find((listing) => listing.underlyingNameZh)!.underlyingNameZh } : {}),
      representationCount: listings.length,
      issuerCount: new Set(listings.map((listing) => listing.platformId)).size,
      assetTypes: unique(listings.flatMap((listing) => listing.assetType === undefined ? [] : [listing.assetType])).sort((a, b) => a - b),
      issuers: [...new Map(listings.map((listing) => [listing.platformId, {
        platformId: listing.platformId,
        name: issuerName(listing.platformId),
        tokenSymbols: unique(listings.filter((candidate) => candidate.platformId === listing.platformId).map((candidate) => candidate.tokenSymbol)).sort(),
        logoUrl: listing.issuerLogoUrl,
        website: listing.issuerWebsite,
      }])).values()].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  const offset = Math.max(0, filters.offset ?? 0);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 24));
  const pageItems = items.slice(offset, offset + limit);
  const issuerRows = [...new Set(allListings.map((listing) => listing.platformId))].sort().map((platformId) => {
    const listings = allListings.filter((listing) => listing.platformId === platformId);
    const first = listings[0]!;
    return {
      platformId,
      name: issuerName(platformId),
      representationCount: listings.length,
      underlyingCount: new Set(listings.map(tickerKey)).size,
      logoUrl: first.issuerLogoUrl,
      website: first.issuerWebsite,
    };
  });
  const assetTypes = [...new Set(allListings.flatMap((listing) => listing.assetType === undefined ? [] : [listing.assetType]))]
    .sort((a, b) => a - b)
    .map((assetType) => ({
      code: assetType,
      label: assetTypeName(assetType, language),
      representationCount: allListings.filter((listing) => listing.assetType === assetType).length,
      underlyingCount: new Set(allListings.filter((listing) => listing.assetType === assetType).map(tickerKey)).size,
    }));
  const dualIssuerUnderlyings = [...multiIssuerTickers].sort().map((ticker) => {
    const listings = allGroups.get(ticker) ?? [];
    return {
      underlyingTicker: ticker,
      underlyingName: listings[0]?.underlyingName ?? ticker,
      issuers: unique(listings.map((listing) => listing.platformId)).sort(),
    };
  });

  return {
    language,
    chainId: "56",
    source: "Binance Web3",
    scope: {
      representationCount: allListings.length,
      uniqueUnderlyingCount: allGroups.size,
      issuerCount: issuerRows.length,
      wording: language === "zh-CN" ? "本次 Binance Web3 返回" : "Returned by Binance Web3 in this request",
    },
    filters: {
      issuerIds: [...selectedIssuers],
      assetTypes: [...selectedAssetTypes],
      multiIssuerOnly: filters.multiIssuerOnly === true,
    },
    filtered: {
      representationCount: filteredListings.length,
      uniqueUnderlyingCount: items.length,
    },
    issuers: issuerRows,
    assetTypes,
    dualIssuer: {
      underlyingCount: dualIssuerUnderlyings.length,
      underlyings: dualIssuerUnderlyings.slice(0, 100),
    },
    items: pageItems,
    pagination: {
      offset,
      limit,
      total: items.length,
      returned: pageItems.length,
      hasMore: offset + pageItems.length < items.length,
      nextOffset: offset + pageItems.length < items.length ? offset + pageItems.length : undefined,
    },
    sourceTimes: {
      catalogResponseTimestampMs: snapshot.sourceResponseTimestampMs,
      platformMetadataResponseTimestampMs: snapshot.platformMetadataResponseTimestampMs,
    },
    warnings: [...new Set(snapshot.warnings)],
  };
}
