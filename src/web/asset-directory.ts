import type { RwaPlatform, TokenizedStockListing } from "../domain/types.js";

export type AssetDirectoryItem = {
  id: string;
  underlying: { ticker: string; name: string; nameZh?: string; logoUrl?: string };
  token: { name?: string; symbol: string; contractAddress: string; chainId: string; ratio?: string };
  issuer: { id: string; name: string; logoUrl?: string; website?: string };
  market: TokenizedStockListing["market"] & { marketCap?: string; peRatioTTM?: string; volume24H?: string };
  tags: string[];
};

export type AssetDirectoryView = {
  kind: "tokenized_stock_directory";
  query: { text?: string; chainId: string; platformId?: string; offset: number; limit: number };
  summary: { totalRepresentations: number; distinctTickerValues: number; issuerCount: number; returned: number };
  platforms: RwaPlatform[];
  items: AssetDirectoryItem[];
  pagination: { offset: number; limit: number; returned: number; hasMore: boolean };
  provenance: {
    source: "binance_web3_rwa";
    tokenLogos: "api";
    issuerLogos: "api";
    inferredLogos: false;
    /** Time the provider generated the catalog response, distinct from any token's quote-update time. */
    sourceResponseTimestampMs?: number;
    /** Time the provider generated platform count metadata, not necessarily the same snapshot as the token list. */
    platformMetadataResponseTimestampMs?: number;
  };
  boundary: { sideEffects: "none"; transactionCreated: false; signatureRequested: false; broadcastAttempted: false };
};

function issuerName(platformId: string): string {
  if (platformId === "ondo") return "Ondo";
  if (platformId === "bstock") return "bStocks";
  if (platformId === "xstocks") return "xStocks";
  return platformId;
}

export function buildAssetDirectoryView(
  listings: TokenizedStockListing[],
  platforms: RwaPlatform[],
  input: {
    text?: string;
    chainId?: string;
    platformId?: string;
    offset?: number;
    limit?: number;
    sourceResponseTimestampMs?: number;
    platformMetadataResponseTimestampMs?: number;
  } = {}
): AssetDirectoryView {
  const text = input.text?.trim().toLowerCase();
  const chainId = input.chainId ?? "56";
  const offset = Math.max(0, input.offset ?? 0);
  // The website loads one bounded source snapshot and paginates it locally.
  // Keep this response cap explicit; provider-side pagination is undocumented.
  const limit = Math.min(1_000, Math.max(1, input.limit ?? 36));
  const filtered = listings.filter((item) => {
    if (item.chainId !== chainId) return false;
    if (input.platformId && item.platformId !== input.platformId) return false;
    if (!text) return true;
    return [item.underlyingTicker, item.underlyingName, item.tokenSymbol, item.tokenName, item.contractAddress]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text));
  }).sort((a, b) => a.underlyingTicker.localeCompare(b.underlyingTicker) || a.platformId.localeCompare(b.platformId) || a.chainId.localeCompare(b.chainId) || a.contractAddress.localeCompare(b.contractAddress));
  const items = filtered.slice(offset, offset + limit).map((item) => ({
    id: item.assetId,
    underlying: { ticker: item.underlyingTicker, name: item.underlyingName, nameZh: item.underlyingNameZh, logoUrl: item.tokenLogoUrl },
    token: { name: item.tokenName, symbol: item.tokenSymbol, contractAddress: item.contractAddress, chainId: item.chainId, ratio: item.tokenToShareRatio },
    issuer: { id: item.platformId, name: issuerName(item.platformId), logoUrl: item.issuerLogoUrl, website: item.issuerWebsite },
    market: { ...item.market, marketCap: item.marketCap, peRatioTTM: item.peRatioTTM, volume24H: item.market.volume24H },
    tags: [...item.tags]
  }));
  return {
    kind: "tokenized_stock_directory",
    query: { text: input.text, chainId, platformId: input.platformId, offset, limit },
    summary: {
      totalRepresentations: filtered.length,
      // This is a raw distinct-ticker-string count, not a normalized security count.
      distinctTickerValues: new Set(filtered.map((item) => item.underlyingTicker)).size,
      issuerCount: new Set(filtered.map((item) => item.platformId)).size,
      returned: items.length
    },
    platforms,
    items,
    pagination: { offset, limit, returned: items.length, hasMore: offset + items.length < filtered.length },
    provenance: {
      source: "binance_web3_rwa",
      tokenLogos: "api",
      issuerLogos: "api",
      inferredLogos: false,
      ...(typeof input.sourceResponseTimestampMs === "number" && Number.isFinite(input.sourceResponseTimestampMs) && input.sourceResponseTimestampMs > 0
        ? { sourceResponseTimestampMs: input.sourceResponseTimestampMs }
        : {}),
      ...(typeof input.platformMetadataResponseTimestampMs === "number" && Number.isFinite(input.platformMetadataResponseTimestampMs) && input.platformMetadataResponseTimestampMs > 0
        ? { platformMetadataResponseTimestampMs: input.platformMetadataResponseTimestampMs }
        : {})
    },
    boundary: { sideEffects: "none", transactionCreated: false, signatureRequested: false, broadcastAttempted: false }
  };
}
