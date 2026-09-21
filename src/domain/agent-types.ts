import type { MarketContext, StockAsset } from "./types.js";

export type AssetLink = {
  label: "issuer" | "explorer" | "market" | "documentation" | string;
  url: string;
};

export type Issuer = {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  links: AssetLink[];
};

export type AssetMetadata = {
  underlyingLogoUrl?: string;
  issuerLogoUrl?: string;
  sector?: string;
  tags: string[];
  source: "api" | "metadata" | "user" | "unknown";
  updatedAt?: number;
};

export type DataQuality = {
  completeness: "complete" | "partial" | "limited";
  missingFields: string[];
  warnings: string[];
  lastUpdatedAt?: number;
};

export type AgentTokenizedAsset = StockAsset & {
  issuer: Issuer;
  metadata: AssetMetadata;
  market?: MarketContext;
  dataQuality: DataQuality;
  links: AssetLink[];
};

export type AssetPreference = {
  issuerIds?: string[];
  platforms?: string[];
  requireMarketPrice?: boolean;
  requireReferencePrice?: boolean;
  requireKnownMarketStatus?: boolean;
  maxPriceGapPercent?: string;
  sectors?: string[];
};

export type AssetComparisonRow = {
  asset: AgentTokenizedAsset;
  rank?: number;
  matchReasons: string[];
  excludedReasons: string[];
};

export type AssetComparison = {
  underlyingTicker: string;
  underlyingName: string;
  rows: AssetComparisonRow[];
  criteria: AssetPreference;
  summary: string;
  warnings: string[];
};
