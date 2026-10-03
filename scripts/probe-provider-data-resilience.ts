import { BinanceWeb3Client, type BinanceResponse } from "../src/binance-web3-client.js";
import { BinanceWeb3Error } from "../src/errors.js";
import { compareRepresentationIdentities, representationIdentityKey, summarizeTokenPriceProbe } from "../src/services/asset-coverage-audit.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

type RawListing = {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  tokenPriceUpdatedAt?: number;
  statusInfo?: { marketStatus?: string };
  marketStatus?: string;
  status?: string | { marketStatus?: string };
  liquidity?: unknown;
};
type RawPlatform = {
  platformId: string;
  chainDistribution?: Array<{ binanceChainId: string; tokenCount: number }>;
};
type SearchRow = { ticker: string; assets: Array<{ binanceChainId: string; tokenContractAddress: string; platformId: string }> };
type PriceRow = { binanceChainId: string; tokenContractAddress: string; platformId: string; tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number };

const observations: Array<{ endpoint: string; status?: number; durationMs: number; success: boolean; attempt: number }> = [];
const partialEvidence: Record<string, unknown> = {};
const failedRequests: Array<{ endpoint: string; category: string; httpStatus: number | null }> = [];
const client = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL,
  timeoutMs: 8_000,
  maxRetries: 0,
  onRequest: ({ path, status, durationMs, success, attempt }) => observations.push({ endpoint: endpointLabel(path), status, durationMs, success, attempt })
});

async function get<T>(path: string, params: Record<string, string>): Promise<BinanceResponse<T>> {
  return client.get<T>(path, params);
}

async function read<T>(path: string, params: Record<string, string>): Promise<BinanceResponse<T> | undefined> {
  const endpoint = endpointLabel(`${path}?${new URLSearchParams(params).toString()}`);
  try {
    return await get<T>(path, params);
  } catch (error) {
    failedRequests.push({
      endpoint,
      category: error instanceof BinanceWeb3Error ? error.status === 0 ? "network_failure" : "provider_failure" : "unexpected_failure",
      httpStatus: error instanceof BinanceWeb3Error && error.status > 0 ? error.status : null
    });
    return undefined;
  }
}

function identities(rows: Array<{ binanceChainId: string; tokenContractAddress: string; platformId: string }>) {
  return rows.map((row) => ({ chainId: row.binanceChainId, contractAddress: row.tokenContractAddress, platformId: row.platformId }));
}

function endpointLabel(path: string): string {
  const [pathname, query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  if (pathname.endsWith("/platforms")) return "platforms";
  if (pathname.endsWith("/tokens")) return params.has("tabId") ? `tokens:tab-${params.get("tabId")}` : "tokens:chain-filter";
  if (pathname.endsWith("/search")) return "search:NVDA";
  if (pathname.endsWith("/price")) return "price:NVDA";
  return "other-approved-read";
}

function marketStatusFor(row: RawListing): string | undefined {
  const candidate = row.statusInfo?.marketStatus ?? row.marketStatus ??
    (typeof row.status === "object" && row.status !== null ? row.status.marketStatus : undefined) ??
    (typeof row.status === "string" ? row.status : undefined);
  return typeof candidate === "string" && candidate.trim() ? candidate.trim().toLowerCase() : undefined;
}

function summarizeListings(rows: RawListing[]) {
  const statuses = rows.reduce<Record<string, number>>((counts, row) => {
    const status = marketStatusFor(row);
    const category = status === undefined ? "missing"
      : ["open", "regular"].includes(status) ? "open"
      : ["closed", "paused", "pause", "halted"].includes(status) ? "closed"
          : ["offhours", "preopen", "afterhours", "premarket", "postmarket", "overnight"].includes(status) ? "offhours"
            : "other";
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  return {
    rows: rows.length,
    rowsWithPerTokenUpdateTimestamp: rows.filter((row) => typeof row.tokenPriceUpdatedAt === "number" && Number.isFinite(row.tokenPriceUpdatedAt) && row.tokenPriceUpdatedAt > 0).length,
    rowsWithStatusInfo: rows.filter((row) => row.statusInfo !== undefined && row.statusInfo !== null).length,
    statusFieldPresence: {
      statusInfoMarketStatus: rows.filter((row) => typeof row.statusInfo?.marketStatus === "string").length,
      topLevelMarketStatus: rows.filter((row) => typeof row.marketStatus === "string").length,
      statusField: rows.filter((row) => row.status !== undefined && row.status !== null).length
    },
    marketStatusCounts: statuses,
    rowsWithKnownMarketStatus: rows.filter((row) => ["open", "regular", "closed", "paused", "pause", "halted", "offhours", "preopen", "afterhours", "premarket", "postmarket", "overnight"].includes(marketStatusFor(row) ?? "")).length,
    rowsWithLiquidity: rows.filter((row) => row.liquidity !== undefined && row.liquidity !== null).length
  };
}

try {
  const chainId = "56";
  const platformResponse = await read<RawPlatform[]>("/api/v1/dex/market/rwa/platforms", {});
  const platforms = platformResponse?.data ?? [];
  const declaredBscTokens = platforms.reduce((total, platform) => total + (platform.chainDistribution?.find((item) => item.binanceChainId === chainId)?.tokenCount ?? 0), 0);
  partialEvidence.platformCatalog = { available: Boolean(platformResponse), rows: platformResponse ? platforms.length : null, declaredBscTokenCount: platformResponse ? declaredBscTokens : null, responseTimestampMs: platformResponse?.timestamp ?? null };
  const tokenResponse = await read<RawListing[]>("/api/v1/dex/market/rwa/tokens", { binanceChainId: chainId });
  const tokens = tokenResponse?.data ?? [];
  partialEvidence.tokenCatalog = tokenResponse ? { available: true, responseTimestampMs: tokenResponse.timestamp ?? null, ...summarizeListings(tokens) } : { available: false };
  const tabOneResponse = await read<RawListing[]>("/api/v1/dex/market/rwa/tokens", { binanceChainId: chainId, tabId: "1" });
  partialEvidence.tabId1ListingData = tabOneResponse ? summarizeListings(tabOneResponse.data ?? []) : { available: false };
  const tabThirteenResponse = await read<RawListing[]>("/api/v1/dex/market/rwa/tokens", { binanceChainId: chainId, tabId: "13" });
  partialEvidence.tabId13Rows = tabThirteenResponse ? (tabThirteenResponse.data ?? []).length : null;
  const searchResponse = await read<SearchRow[]>("/api/v1/dex/market/rwa/search", { keyword: "NVDA" });
  partialEvidence.searchRows = searchResponse ? (searchResponse.data ?? []).length : null;
  const nvda = (searchResponse?.data ?? []).flatMap((row) => row.assets).filter((asset) => asset.binanceChainId === chainId);
  const priceResponse = nvda.length
    ? await read<PriceRow[]>("/api/v1/dex/market/rwa/price", {
      binanceChainId: chainId,
      tokenContractAddresses: [...new Set(nvda.map((asset) => asset.tokenContractAddress))].join(",")
    })
    : undefined;
  partialEvidence.nvdaPriceRows = priceResponse ? (priceResponse.data ?? []).length : null;
  const nvdaPriceEvidence = priceResponse
    ? summarizeTokenPriceProbe(identities(nvda), priceResponse.data ?? [])
    : undefined;
  const catalogIdentities = identities(tokens);
  const tabOneEvidence = tokenResponse && tabOneResponse ? compareRepresentationIdentities(catalogIdentities, identities(tabOneResponse.data ?? [])) : undefined;
  const tabThirteenEvidence = tokenResponse && tabThirteenResponse ? compareRepresentationIdentities(catalogIdentities, identities(tabThirteenResponse.data ?? [])) : undefined;
  const observedAt = Date.now();
  const timestampOffsets = (priceResponse?.data ?? []).flatMap((row) => typeof row.tokenPriceUpdatedAt === "number" && Number.isFinite(row.tokenPriceUpdatedAt) && row.tokenPriceUpdatedAt > 0
    ? [observedAt - row.tokenPriceUpdatedAt]
    : []).sort((a, b) => a - b);
  const ages = timestampOffsets.filter((offset) => offset >= 0);
  const futureTimestampOffsets = timestampOffsets.filter((offset) => offset < 0).map((offset) => Math.abs(offset));
  const marketStatusCounts = tokens.reduce<Record<string, number>>((counts, row) => {
    const status = marketStatusFor(row);
    const category = status === undefined ? "missing"
      : ["open", "regular"].includes(status) ? "open"
        : ["closed", "paused", "pause", "halted"].includes(status) ? "closed"
          : ["offhours", "preopen", "afterhours", "premarket", "postmarket", "overnight"].includes(status) ? "offhours"
            : "other";
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  const identityKeys = tokens.map((row) => representationIdentityKey({ chainId: row.binanceChainId, platformId: row.platformId, contractAddress: row.tokenContractAddress }));
  const identitySet = new Set(identityKeys);
  const snapshot = {
    provider: "Binance Web3 RWA read endpoints",
    status: failedRequests.length ? "partial" : "observed",
    readOnly: true,
    boundedRequests: 6,
    completedRequests: observations.length,
    successfulRequests: observations.filter((item) => item.success).length,
    failedRequests,
    requestObservations: observations,
    observedAt: new Date(observedAt).toISOString(),
    bscCatalog: {
      available: Boolean(tokenResponse),
      rows: tokenResponse ? tokens.length : null,
      uniqueRepresentations: tokenResponse ? identitySet.size : null,
      duplicateRows: tokenResponse ? tokens.length - identitySet.size : null,
      byPlatform: tokenResponse ? Object.fromEntries([...new Set(tokens.map((row) => row.platformId))].sort().map((platformId) => [platformId, tokens.filter((row) => row.platformId === platformId).length])) : null,
      declaredPlatformBscTokenCount: platformResponse ? declaredBscTokens : null,
      countDifference: platformResponse && tokenResponse ? declaredBscTokens - tokens.length : null,
      tokenResponseTimestampMs: tokenResponse?.timestamp ?? null,
      platformResponseTimestampMs: platformResponse?.timestamp ?? null,
      responseTimestampSkewMs: typeof tokenResponse?.timestamp === "number" && typeof platformResponse?.timestamp === "number" ? tokenResponse.timestamp - platformResponse.timestamp : null,
      rowsWithPerTokenUpdateTimestamp: tokenResponse ? tokens.filter((row) => typeof row.tokenPriceUpdatedAt === "number" && Number.isFinite(row.tokenPriceUpdatedAt) && row.tokenPriceUpdatedAt > 0).length : null,
      marketStatusFieldPresence: {
        statusInfo: tokenResponse ? tokens.filter((row) => row.statusInfo !== undefined && row.statusInfo !== null).length : null,
        statusInfoMarketStatus: tokenResponse ? tokens.filter((row) => typeof row.statusInfo?.marketStatus === "string").length : null,
        topLevelMarketStatus: tokenResponse ? tokens.filter((row) => typeof row.marketStatus === "string").length : null,
        statusField: tokenResponse ? tokens.filter((row) => row.status !== undefined && row.status !== null).length : null
      },
      marketStatusCounts: tokenResponse ? marketStatusCounts : null,
      rowsWithKnownMarketStatus: tokenResponse ? tokens.filter((row) => ["open", "regular", "closed", "paused", "pause", "halted", "offhours", "preopen", "afterhours", "premarket", "postmarket", "overnight"].includes(marketStatusFor(row) ?? "")).length : null,
      rowsWithLiquidity: tokenResponse ? tokens.filter((row) => row.liquidity !== undefined && row.liquidity !== null).length : null
    },
    sampledSectorFilters: {
      tabId1MatchesUnfilteredIdentitySet: tabOneEvidence?.identityMatches ?? null,
      tabId1: tabOneEvidence ?? null,
      tabId13MatchesUnfilteredIdentitySet: tabThirteenEvidence?.identityMatches ?? null,
      tabId13: tabThirteenEvidence ?? null,
      interpretation: "Observed set equality/inequality only; this sample does not establish filter semantics."
    },
    sampledListingFields: {
      tabId1Available: Boolean(tabOneResponse),
      tabId1: partialEvidence.tabId1ListingData,
      interpretation: "A tab-filtered listing is reported as its own sample and is not silently substituted for a failed unfiltered catalog response."
    },
    nvdaDedicatedPriceEndpoint: {
      available: Boolean(searchResponse && nvda.length > 0 && priceResponse),
      ...(nvdaPriceEvidence ?? {}),
      responseTimestampMs: priceResponse?.timestamp ?? null,
      quoteAgeMs: ages,
      futureTimestampOffsetsMs: futureTimestampOffsets,
      freshnessSlaKnown: false,
      interpretation: "Offsets use the local observation clock; future-dated samples are reported separately. No freshness SLA is established."
    },
    limitations: [
      "No completeness claim: the provider list contract has no verified pagination or total-count marker in this probe.",
      "Only tabId 1 and 13 were sampled in this bounded recheck; prior all-tab evidence remains a separate historical observation.",
      "Directory-row quote freshness is not measurable when per-asset update timestamps are absent.",
      "Unknown market status and absent liquidity remain unknown/missing, never inferred from other fields."
    ],
    sideEffects: "none"
  };
  console.log(JSON.stringify(snapshot, null, 2));
  if (failedRequests.length) process.exitCode = 1;
} catch (error) {
  const failureCategory = error instanceof BinanceWeb3Error
    ? error.status === 0 ? "network_failure" : "provider_failure"
    : "unexpected_failure";
  console.log(JSON.stringify({
    status: "inconclusive",
    failureCategory,
    httpStatus: error instanceof BinanceWeb3Error && error.status > 0 ? error.status : null,
    requestCount: observations.length,
    requestObservations: observations,
    partialEvidence,
    timeoutPerRequestMs: 8_000,
    maxRetries: 0,
    sideEffects: "none",
    rawErrorSuppressed: true
  }, null, 2));
  process.exitCode = 1;
}
