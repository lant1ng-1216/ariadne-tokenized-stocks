import { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { compareRepresentationIdentities, representationIdentityKey, summarizeQuoteTimestampAges, summarizeTokenPriceProbe } from "../src/services/asset-coverage-audit.js";
import { buildAssetDirectoryView } from "../src/web/asset-directory.js";
import { normalizeProviderTimestamp } from "../src/domain/normalizers.js";

const apiKey = process.env.BINANCE_WEB3_API_KEY;
const apiSecret = process.env.BINANCE_WEB3_API_SECRET;
if (!apiKey || !apiSecret) throw new Error("Missing Binance Web3 credentials in .env");

const chainId = process.env.ASSET_COVERAGE_CHAIN_ID?.trim() || "56";
const client = new BinanceWeb3Client({
  apiKey,
  apiSecret,
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
});
const service = new TokenizedStocksService(client);
const catalogSnapshot = await service.listSnapshot({ chainId });
const platforms = await service.platforms();
const listings = catalogSnapshot.listings;
const observedAtMs = Date.now();
const allChainListings = await service.list();
const observedByChain: Record<string, { representations: number; uniqueUnderlyingTickerValues: number; byIssuer: Record<string, number> }> = {};
const representationKey = representationIdentityKey;
const declaredChainIds = new Set(platforms.flatMap((platform) => platform.chainDistribution.map((entry) => entry.chainId)));
const reconciledChainIds = [...new Set([...declaredChainIds, ...allChainListings.map((item) => item.chainId)])].sort();
const chainSetChecks: Record<string, { matchesUnfilteredSet: boolean; missingFromChainQuery: number; extraInChainQuery: number }> = {};
for (const observedChainId of reconciledChainIds) {
  const chainListings = observedChainId === chainId ? listings : await service.list({ chainId: observedChainId });
  const unfilteredSubset = allChainListings.filter((item) => item.chainId === observedChainId);
  const unfilteredIds = new Set(unfilteredSubset.map(representationKey));
  const chainIds = new Set(chainListings.map(representationKey));
  const missingFromChainQuery = [...unfilteredIds].filter((id) => !chainIds.has(id)).length;
  const extraInChainQuery = [...chainIds].filter((id) => !unfilteredIds.has(id)).length;
  chainSetChecks[observedChainId] = {
    matchesUnfilteredSet: missingFromChainQuery === 0 && extraInChainQuery === 0,
    missingFromChainQuery,
    extraInChainQuery
  };
  observedByChain[observedChainId] = {
    representations: chainListings.length,
    uniqueUnderlyingTickerValues: new Set(chainListings.map((item) => item.underlyingTicker)).size,
    byIssuer: Object.fromEntries([...new Set(chainListings.map((item) => item.platformId))].sort().map((platformId) => [
      platformId,
      chainListings.filter((item) => item.platformId === platformId).length
    ]))
  };
}

const directory = buildAssetDirectoryView(listings, platforms, { chainId, limit: 50, sourceResponseTimestampMs: catalogSnapshot.sourceResponseTimestampMs });
const nextPage = buildAssetDirectoryView(listings, platforms, { chainId, offset: 50, limit: 50, sourceResponseTimestampMs: catalogSnapshot.sourceResponseTimestampMs });
const firstPageIds = new Set(directory.items.map((item) => item.id));
const pageOverlap = nextPage.items.filter((item) => firstPageIds.has(item.id)).length;
const issuerCounts = Object.fromEntries(
  [...new Set(listings.map((item) => item.platformId))].sort().map((platformId) => [
    platformId,
    listings.filter((item) => item.platformId === platformId).length
  ])
);
const allChainCounts = Object.fromEntries(
  [...new Set(allChainListings.map((item) => item.chainId))].sort().map((observedChainId) => [
    observedChainId,
    {
      representations: allChainListings.filter((item) => item.chainId === observedChainId).length,
      uniqueUnderlyingTickerValues: new Set(allChainListings.filter((item) => item.chainId === observedChainId).map((item) => item.underlyingTicker)).size,
      byIssuer: Object.fromEntries([...new Set(allChainListings.filter((item) => item.chainId === observedChainId).map((item) => item.platformId))].sort().map((platformId) => [
        platformId,
        allChainListings.filter((item) => item.chainId === observedChainId && item.platformId === platformId).length
      ]))
    }
  ])
);
const metadataByPlatform = Object.fromEntries(platforms.map((platform) => [platform.platformId, {
  declaredTickerCount: platform.tickerCount ?? null,
  chainDistribution: platform.chainDistribution
} ]));
const fieldCoverage = {
  tokenLogoUrlNonEmpty: listings.filter((item) => Boolean(item.tokenLogoUrl?.trim())).length,
  issuerLogoUrlNonEmpty: listings.filter((item) => Boolean(item.issuerLogoUrl?.trim())).length,
  tokenPriceNonEmpty: listings.filter((item) => Boolean(item.market.tokenPrice?.trim())).length,
  referencePriceNonEmpty: listings.filter((item) => Boolean(item.market.referencePrice?.trim())).length,
  perRepresentationUpdateTimestampPresent: listings.filter((item) => normalizeProviderTimestamp(item.market.tokenPriceUpdatedAt) !== undefined).length,
  knownMarketStatus: listings.filter((item) => ["open", "closed", "offhours"].includes(item.market.marketStatus ?? "")).length
};
const quoteTimestampAge = summarizeQuoteTimestampAges(listings.map((item) => item.market.tokenPriceUpdatedAt), observedAtMs);
const nvda = await service.search("NVDA", { chainId });
const nvdaListings = listings.filter((item) => item.underlyingTicker.toUpperCase() === "NVDA");
const dedicatedPriceSnapshot = nvdaListings.length
  ? await client.get<Array<{ binanceChainId: string; tokenContractAddress: string; platformId: string; tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number }>>(
      "/api/v1/dex/market/rwa/price",
      { binanceChainId: chainId, tokenContractAddresses: nvdaListings.map((item) => item.contractAddress).join(",") }
    )
  : undefined;
const dedicatedPriceProbe = dedicatedPriceSnapshot
  ? summarizeTokenPriceProbe(nvdaListings.map((item) => ({ chainId: item.chainId, platformId: item.platformId, contractAddress: item.contractAddress })), dedicatedPriceSnapshot.data ?? [])
  : undefined;

const platformFilterChecks: Record<string, { returned: number; mismatches: number; matchesUnfilteredSet: boolean; missingFromFilter: number; extraInFilter: number }> = {};
for (const platformId of Object.keys(issuerCounts)) {
  const filtered = await service.list({ chainId, platformId });
  const baselineIds = new Set(listings.filter((asset) => asset.platformId === platformId).map(representationKey));
  const filteredIds = new Set(filtered.map(representationKey));
  const missingFromFilter = [...baselineIds].filter((id) => !filteredIds.has(id)).length;
  const extraInFilter = [...filteredIds].filter((id) => !baselineIds.has(id)).length;
  platformFilterChecks[platformId] = {
    returned: filtered.length,
    mismatches: filtered.filter((asset) => asset.platformId !== platformId || asset.chainId !== chainId).length,
    matchesUnfilteredSet: missingFromFilter === 0 && extraInFilter === 0,
    missingFromFilter,
    extraInFilter
  };
}

const sectorTabFilterChecks: Record<string, {
  returned: number;
  duplicateRepresentationRows: number;
  outsideUnfilteredCatalog: number;
  missingFromUnfilteredCatalog: number;
  chainMismatches: number;
  matchesUnfilteredSet: boolean;
}> = {};
const catalogRepresentationIds = new Set(listings.map(representationKey));
const unionOfSectorTabIds = new Set<string>();
for (const tabId of Array.from({ length: 13 }, (_, index) => index + 1)) {
  const response = await client.get<Array<{ binanceChainId: string; tokenContractAddress: string; platformId: string }>>(
    "/api/v1/dex/market/rwa/tokens",
    { binanceChainId: chainId, tabId: String(tabId) }
  );
  const tabListings = response.data ?? [];
  const tabIds = new Set(tabListings.map((item) => representationKey({
    chainId: item.binanceChainId,
    contractAddress: item.tokenContractAddress,
    platformId: item.platformId
  })));
  for (const id of tabIds) unionOfSectorTabIds.add(id);
  const outsideUnfilteredCatalog = [...tabIds].filter((id) => !catalogRepresentationIds.has(id)).length;
  const missingFromUnfilteredCatalog = [...catalogRepresentationIds].filter((id) => !tabIds.has(id)).length;
  sectorTabFilterChecks[String(tabId)] = {
    returned: tabListings.length,
    duplicateRepresentationRows: tabListings.length - tabIds.size,
    outsideUnfilteredCatalog,
    missingFromUnfilteredCatalog,
    chainMismatches: tabListings.filter((item) => item.binanceChainId !== chainId).length,
    matchesUnfilteredSet: outsideUnfilteredCatalog === 0 && missingFromUnfilteredCatalog === 0
  };
}
const unfilteredAssetsMissingFromAllSectorTabs = [...catalogRepresentationIds]
  .filter((id) => !unionOfSectorTabIds.has(id)).length;
const sectorResponseIdentityIntegrityPassed = Object.values(sectorTabFilterChecks)
  .every((result) => result.duplicateRepresentationRows === 0 && result.outsideUnfilteredCatalog === 0 && result.chainMismatches === 0);

const declaredChainCounts = Object.fromEntries(platforms.map((platform) => [
  platform.platformId,
  platform.chainDistribution?.find((entry) => entry.chainId === chainId)?.tokenCount ?? null
]));
const chainMismatchCount = listings.filter((item) => item.chainId !== chainId).length;
const filterMismatchCount = Object.values(platformFilterChecks).reduce((sum, item) => sum + item.mismatches, 0);

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  scope: { chainId, source: "Binance Web3 RWA token directory endpoint", readOnly: true },
  observedSnapshot: {
    sourceResponseTimestampMs: catalogSnapshot.sourceResponseTimestampMs ?? null,
    platformMetadataResponseTimestampMs: catalogSnapshot.platformMetadataResponseTimestampMs ?? null,
    responseTimestampSkewMs: catalogSnapshot.sourceResponseTimestampMs !== undefined && catalogSnapshot.platformMetadataResponseTimestampMs !== undefined
      ? catalogSnapshot.sourceResponseTimestampMs - catalogSnapshot.platformMetadataResponseTimestampMs
      : null,
    representations: listings.length,
    duplicateRepresentationRows: listings.length - catalogRepresentationIds.size,
    uniqueUnderlyingTickerValues: new Set(listings.map((item) => item.underlyingTicker)).size,
    issuersInResults: Object.keys(issuerCounts).length,
    representationCountByIssuer: issuerCounts,
    allChains: {
      representations: allChainListings.length,
      duplicateRepresentationRows: allChainListings.length - new Set(allChainListings.map(representationKey)).size,
      uniqueUnderlyingTickerValues: new Set(allChainListings.map((item) => item.underlyingTicker)).size,
      countsByChain: allChainCounts
    },
    explicitPlatformChainQueries: observedByChain,
    platformMetadata: metadataByPlatform,
    platformDeclaredChainCounts: declaredChainCounts
  },
  filtersAndPagination: {
    chainMismatchCount,
    unfilteredVsChainFilteredSetChecks: chainSetChecks,
    perIssuerFilterResults: platformFilterChecks,
    sectorTabFilterResults: sectorTabFilterChecks,
    sectorTabFiltersDifferFromUnfiltered: Object.values(sectorTabFilterChecks).filter((result) => !result.matchesUnfilteredSet).length,
    unionOfSectorTabs: {
      uniqueRepresentations: unionOfSectorTabIds.size,
      missingFromEveryTab: unfilteredAssetsMissingFromAllSectorTabs
    },
    firstPageItems: directory.items.length,
    secondPageItems: nextPage.items.length,
    pageOverlap,
    hasMoreAfterFirstPage: directory.pagination.hasMore,
    hasMoreAfterSecondPage: nextPage.pagination.hasMore,
    nvdaSearchResultCount: nvda.length,
    nvdaSearchChainFilterNote: "TokenizedStocksService.search applies chainId filtering locally after the upstream search response; this is not an independent provider chain-filter check."
  },
  observedFieldCoverage: fieldCoverage,
  observedQuoteTimestampAgeMs: {
    observedRows: quoteTimestampAge.validTimestampRows,
    ageSampleRows: quoteTimestampAge.ageSampleRows,
    missingRows: quoteTimestampAge.missingOrInvalidTimestampRows,
    minimum: quoteTimestampAge.minimumAgeMs,
    median: quoteTimestampAge.medianAgeMs,
    maximum: quoteTimestampAge.maximumAgeMs,
    futureTimestampRows: quoteTimestampAge.futureTimestampRows,
    sampledAtMs: observedAtMs,
    interpretation: "Observed age only; this probe does not define an acceptable freshness SLA."
  },
  dedicatedPriceEndpointProbe: dedicatedPriceProbe ? {
    ...dedicatedPriceProbe,
    serverResponseTimestampPresent: normalizeProviderTimestamp(dedicatedPriceSnapshot?.timestamp) !== undefined,
    endpoint: "/api/v1/dex/market/rwa/price"
  } : { queryRepresentations: 0, returnedRepresentations: 0 },
  provenance: directory.provenance,
  sideEffects: "none",
  limitations: [
    "Counts describe this timestamped response for the requested chain; they are not a permanent API maximum or a guarantee of all tokenized equities/RWA across chains.",
    "The API's upstream pagination/cap behavior is not independently documented by this client; local UI pagination slices the fetched response.",
    "Issuer/platform ticker counts can cover more chains than the chain-filtered token listing; compare declared chain distribution with this observed response.",
    "Documented tabId queries returned the same set in this observation; this does not establish whether the provider ignored the filter or every row matched every tab."
  ],
  integrityChecks: {
    noChainMismatches: chainMismatchCount === 0,
    noIssuerFilterMismatches: filterMismatchCount === 0,
    chainQueriesMatchUnfilteredSubsets: Object.values(chainSetChecks).every((result) => result.matchesUnfilteredSet),
    issuerQueriesMatchTheirCatalogSubsets: Object.values(platformFilterChecks).every((result) => result.matchesUnfilteredSet),
    localPagesDoNotOverlap: pageOverlap === 0,
    noDuplicateRowsInRequestedChain: listings.length === catalogRepresentationIds.size,
    noDuplicateRowsInUnfilteredResponse: allChainListings.length === new Set(allChainListings.map(representationKey)).size,
    sectorResponsesHaveNoDuplicateOrOutOfScopeIdentities: sectorResponseIdentityIntegrityPassed,
    dedicatedPriceIdentityAndValueCoverageComplete: Boolean(dedicatedPriceProbe?.identityMatches &&
      dedicatedPriceProbe.matchedRepresentationsWithValidPrice === dedicatedPriceProbe.uniqueRequestedRepresentations &&
      dedicatedPriceProbe.matchedRepresentationsWithValidUpdateTimestamp === dedicatedPriceProbe.uniqueRequestedRepresentations),
    note: "These checks validate observed response identity/integrity only; they do not establish that provider filters behave as intended or that the catalog is complete."
  },
  observedFilterBehavior: {
    tabIdsWithDifferentIdentitySetsFromUnfiltered: Object.values(sectorTabFilterChecks).filter((result) => !result.matchesUnfilteredSet).length,
    allTabIdentitySetsEqualUnfiltered: Object.values(sectorTabFilterChecks).every((result) => result.matchesUnfilteredSet),
    interpretation: "Set equality is an observation, not proof that the filter is ignored or that every asset belongs to every sector."
  },
  catalogCompleteness: {
    proven: false,
    reason: "The documented API contract exposes no pagination or total-count marker, and same-window platform token counts differ from the observed token-list row count. This audit cannot establish upstream completeness."
  }
}, null, 2));

if (chainMismatchCount || filterMismatchCount || pageOverlap ||
  Object.values(chainSetChecks).some((result) => !result.matchesUnfilteredSet) ||
  Object.values(platformFilterChecks).some((result) => !result.matchesUnfilteredSet) ||
  !sectorResponseIdentityIntegrityPassed ||
  (dedicatedPriceProbe && (!dedicatedPriceProbe.identityMatches ||
    dedicatedPriceProbe.matchedRepresentationsWithValidPrice !== dedicatedPriceProbe.uniqueRequestedRepresentations ||
    dedicatedPriceProbe.matchedRepresentationsWithValidUpdateTimestamp !== dedicatedPriceProbe.uniqueRequestedRepresentations))) process.exitCode = 1;
