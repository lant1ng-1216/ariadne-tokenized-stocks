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
  source: "api" | "metadata" | "user" | "synthetic" | "unknown";
  updatedAt?: number;
};

export type CoverageStatus = {
  identity: "confirmed" | "partial";
  marketContext: "fetched" | "not_requested" | "unavailable";
};

export type MarketContextFailureCategory =
  | "network_failure"
  | "provider_failure"
  | "data_integrity_failure"
  | "unexpected_failure";

export type DataQuality = {
  completeness: "complete" | "partial" | "limited";
  coverage: CoverageStatus;
  missingFields: string[];
  warnings: string[];
  marketContextFailureCategory?: MarketContextFailureCategory;
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

export type ResearchTiming = {
  searchMs: number;
  searchResolution?: {
    directSearchMs: number;
    catalogReadMs: number;
    catalogMatchMs: number;
    resolvedSearchMs: number;
    calls: {
      directSearch: number;
      catalogRead: number;
      resolvedSearch: number;
    };
  };
  marketContextMs: number;
  marketContextBatchCalls?: number;
  marketContextFailureCategory?: MarketContextFailureCategory;
  comparisonMs: number;
  presentationMs: number;
  totalMs: number;
  marketContextAssets: number;
  agentReasoningExcluded: true;
};

export type ResearchNextStep = {
  id: "inspect_representation" | "read_wallet_exposure" | "review_data_gaps";
  title: string;
  description: string;
  sideEffects: "none";
  requiresExplicitSelection?: boolean;
};
