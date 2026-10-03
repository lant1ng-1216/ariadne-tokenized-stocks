import assert from "node:assert/strict";
import { DemoTokenizedStocksService } from "../src/services/demo-tokenized-stocks.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { compareRepresentationIdentities, representationIdentityKey, summarizeQuoteTimestampAges, summarizeTokenPriceProbe } from "../src/services/asset-coverage-audit.js";
import { buildAssetDirectoryView } from "../src/web/asset-directory.js";

const service = new DemoTokenizedStocksService({} as never);
const [listings, platforms] = await Promise.all([service.list({ chainId: "56" }), service.platforms()]);
const sourceResponseTimestampMs = 1_790_603_000_000;
const platformMetadataResponseTimestampMs = 1_790_603_000_100;
const firstPage = buildAssetDirectoryView(listings, platforms, { chainId: "56", limit: 4, sourceResponseTimestampMs, platformMetadataResponseTimestampMs });
const secondPage = buildAssetDirectoryView(listings, platforms, { chainId: "56", offset: 4, limit: 4, sourceResponseTimestampMs, platformMetadataResponseTimestampMs });

assert.equal(firstPage.kind, "tokenized_stock_directory");
assert.ok(firstPage.summary.totalRepresentations >= 10);
assert.ok(firstPage.summary.distinctTickerValues >= 6);
assert.equal(firstPage.items.length, 4);
assert.equal(firstPage.pagination.hasMore, true);
assert.equal(secondPage.pagination.hasMore, true);
assert.equal(secondPage.items.some((item) => firstPage.items.some((first) => first.id === item.id)), false, "local slices of the fetched array must not overlap");
assert.equal(firstPage.provenance.tokenLogos, "api");
assert.equal(firstPage.provenance.issuerLogos, "api");
assert.equal(firstPage.provenance.inferredLogos, false);
assert.equal(firstPage.provenance.sourceResponseTimestampMs, sourceResponseTimestampMs);
assert.equal(firstPage.provenance.platformMetadataResponseTimestampMs, platformMetadataResponseTimestampMs);
const firstPageListing = listings.find((item) => item.assetId === firstPage.items[0]?.id);
assert.equal(firstPage.items[0]?.market.tokenPriceUpdatedAt, firstPageListing?.market.tokenPriceUpdatedAt, "catalog response time must not be copied into an individual quote timestamp");
assert.equal(firstPage.boundary.sideEffects, "none");

const filtered = buildAssetDirectoryView(listings, platforms, { chainId: "56", text: "microsoft" });
assert.ok(filtered.items.length >= 2);
assert.ok(filtered.items.every((item) => item.underlying.ticker === "MSFT"));

const issuerFiltered = buildAssetDirectoryView(listings, platforms, { chainId: "56", platformId: "bstock" });
assert.ok(issuerFiltered.items.length > 0);
assert.ok(issuerFiltered.items.every((item) => item.issuer.id === "bstock"));

const oversizedCatalog = Array.from({ length: 1_001 }, (_, index) => ({
  ...listings[0]!,
  assetId: `56:0x${(index + 1).toString(16).padStart(40, "0")}`,
  contractAddress: `0x${(index + 1).toString(16).padStart(40, "0")}`,
  underlyingTicker: `T${index}`
}));
const boundedPage = buildAssetDirectoryView(oversizedCatalog, platforms, { chainId: "56", offset: 0, limit: 1_000 });
assert.equal(boundedPage.items.length, 1_000, "website snapshot response remains bounded");
assert.equal(boundedPage.summary.totalRepresentations, 1_001, "summary describes the full locally observed array");
assert.equal(boundedPage.summary.returned, 1_000);
assert.equal(boundedPage.pagination.hasMore, true, "a capped local response must expose truncation");

const requestedRepresentations = [
  { chainId: "56", platformId: "ondo", contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  { chainId: "56", platformId: "bstock", contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
];
const exactPriceProbe = summarizeTokenPriceProbe(requestedRepresentations, [
  { binanceChainId: "56", platformId: "ONDO", tokenContractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", tokenPrice: "12.5", tokenPriceUpdatedAt: 1_790_603_000_000 },
  { binanceChainId: "56", platformId: "bstock", tokenContractAddress: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", tokenPrice: "3.2", tokenPriceUpdatedAt: 1_790_603_000_001 },
]);
assert.equal(exactPriceProbe.identityMatches, true, "price coverage must match every requested chain/platform/contract identity");
assert.equal(exactPriceProbe.matchedRepresentationsWithValidPrice, 2);
assert.equal(exactPriceProbe.matchedRepresentationsWithValidUpdateTimestamp, 2);
assert.equal(
  representationIdentityKey({ chainId: "56", platformId: "ondo", contractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
  representationIdentityKey({ chainId: "56", platformId: "ONDO", contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
  "valid EVM contract addresses compare case-insensitively",
);
assert.notEqual(
  representationIdentityKey({ chainId: "CT_501", platformId: "ondo", contractAddress: "AbC123" }),
  representationIdentityKey({ chainId: "CT_501", platformId: "ondo", contractAddress: "abc123" }),
  "non-EVM addresses such as Solana Base58 preserve case",
);

const incompletePriceProbe = summarizeTokenPriceProbe(requestedRepresentations, [
  { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", tokenPrice: "0", tokenPriceUpdatedAt: Number.NaN },
  { binanceChainId: "56", platformId: "unknown", tokenContractAddress: "Unexpected", tokenPrice: "5", tokenPriceUpdatedAt: 1_790_603_000_000 },
  { binanceChainId: "56", platformId: "unknown", tokenContractAddress: "Unexpected", tokenPrice: "5", tokenPriceUpdatedAt: 1_790_603_000_000 },
]);
assert.equal(incompletePriceProbe.identityMatches, false);
assert.equal(incompletePriceProbe.missingRepresentations, 1);
assert.equal(incompletePriceProbe.unexpectedRepresentations, 1);
assert.equal(incompletePriceProbe.duplicateReturnedRows, 1);
assert.equal(incompletePriceProbe.returnedRowsWithValidPrice, 2, "zero and non-numeric prices are not valid quotes");
assert.equal(incompletePriceProbe.returnedRowsWithValidUpdateTimestamp, 2, "non-finite timestamps are not counted");
assert.deepEqual(compareRepresentationIdentities(requestedRepresentations, requestedRepresentations).identityMatches, true);
const observedTabComparison = compareRepresentationIdentities(requestedRepresentations, [...requestedRepresentations]);
assert.equal(observedTabComparison.identityMatches, true, "equal observed identity sets are reported as equal without asserting filter semantics");
const differingTabComparison = compareRepresentationIdentities(requestedRepresentations, [requestedRepresentations[0]!]);
assert.equal(differingTabComparison.missingRepresentations, 1, "identity comparison must expose a filter-set difference");
const duplicateTargetProbe = summarizeTokenPriceProbe([requestedRepresentations[0]!], [
  { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", tokenPrice: "12.5", tokenPriceUpdatedAt: 1_790_603_000_000 },
  { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", tokenPrice: "0", tokenPriceUpdatedAt: Number.NaN },
]);
assert.equal(duplicateTargetProbe.identityMatches, false);
assert.equal(duplicateTargetProbe.matchedRepresentationsWithValidPrice, 0, "duplicate response rows must not inflate valid price coverage");
assert.equal(duplicateTargetProbe.matchedRepresentationsWithValidUpdateTimestamp, 0, "duplicate response rows must not inflate timestamp coverage");

assert.deepEqual(summarizeQuoteTimestampAges([950, 1_020, 900, "invalid"], 1_000), {
  validTimestampRows: 3,
  missingOrInvalidTimestampRows: 1,
  ageSampleRows: 2,
  minimumAgeMs: 50,
  medianAgeMs: 75,
  maximumAgeMs: 100,
  futureTimestampRows: 1
}, "future-dated quote timestamps remain visible but cannot skew observed nonnegative-age statistics");
assert.deepEqual(summarizeQuoteTimestampAges([1_010], 1_000), {
  validTimestampRows: 1,
  missingOrInvalidTimestampRows: 0,
  ageSampleRows: 0,
  minimumAgeMs: null,
  medianAgeMs: null,
  maximumAgeMs: null,
  futureTimestampRows: 1
}, "all-future samples report no age statistics rather than a negative quote age");

const quoteRequests: Array<{ path: string; params?: Record<string, string> }> = [];
const timestampedPriceService = new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    quoteRequests.push({ path, params });
    if (!path.endsWith("/rwa/price")) throw new Error(`Unexpected request: ${path}`);
    const addresses = (params?.tokenContractAddresses ?? "").split(",");
    return { data: [
      { binanceChainId: "56", platformId: "bstock", tokenContractAddress: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", tokenPrice: "3.2", referencePrice: "3.1", tokenPriceUpdatedAt: 1_790_603_000_001 },
      { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", tokenPrice: "12.5", referencePrice: "12", tokenPriceUpdatedAt: 1_790_603_000_000 },
      ...(addresses.includes("0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC") ? [{ binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", tokenPrice: "0", tokenPriceUpdatedAt: Number.NaN }] : [])
    ] };
  }
} as any);
const directoryQuotes = await timestampedPriceService.tokenPriceSnapshots(requestedRepresentations);
assert.deepEqual(directoryQuotes.map((item) => item.state), ["available", "available"]);
assert.deepEqual(directoryQuotes.map((item) => item.tokenPriceUpdatedAt), [1_790_603_000_000, 1_790_603_000_001]);
assert.equal(quoteRequests.length, 1, "visible representations share one bounded price request");
assert.equal(quoteRequests[0]?.params?.tokenContractAddresses, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const unknownQuote = await timestampedPriceService.tokenPriceSnapshots([{ ...requestedRepresentations[0]!, contractAddress: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" }]);
assert.equal(unknownQuote[0]?.state, "invalid", "non-positive price and invalid time stay explicitly unknown");

const priceBatchInputs = Array.from({ length: 101 }, (_, index) => ({
  chainId: "56",
  platformId: index % 2 ? "bstock" : "ondo",
  contractAddress: `0x${(index + 1).toString(16).padStart(40, "0")}`
}));
const priceBatchRequests: string[][] = [];
const priceBatchService = new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    assert.ok(path.endsWith("/rwa/price"));
    const addresses = (params?.tokenContractAddresses ?? "").split(",");
    priceBatchRequests.push(addresses);
    return { data: addresses.map((address) => ({
      binanceChainId: "56",
      platformId: priceBatchInputs.find((item) => item.contractAddress === address)?.platformId ?? "unknown",
      tokenContractAddress: address,
      tokenPrice: "1",
      referencePrice: "1",
      tokenPriceUpdatedAt: 1_790_603_000_000
    })) };
  }
} as any);
const batchedDirectoryQuotes = await priceBatchService.tokenPriceSnapshots(priceBatchInputs);
assert.equal(priceBatchRequests.length, 2, "a bounded provider batch splits requests over 100 unique addresses");
assert.deepEqual(priceBatchRequests.map((addresses) => addresses.length), [100, 1]);
assert.equal(batchedDirectoryQuotes.length, 101);
assert.ok(batchedDirectoryQuotes.every((item) => item.state === "available"));
const ambiguousPriceService = new TokenizedStocksService({
  async get() { return { data: [
    { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", tokenPrice: "1", tokenPriceUpdatedAt: 1_790_603_000_000 },
    { binanceChainId: "56", platformId: "ondo", tokenContractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", tokenPrice: "2", tokenPriceUpdatedAt: 1_790_603_000_001 }
  ] }; }
} as any);
const ambiguousQuote = await ambiguousPriceService.tokenPriceSnapshots([requestedRepresentations[0]!]);
assert.equal(ambiguousQuote[0]?.state, "ambiguous", "duplicate provider rows are not silently selected");
const unavailablePriceService = new TokenizedStocksService({ async get() { throw new Error("private upstream diagnostic"); } } as any);
const unavailableQuote = await unavailablePriceService.tokenPriceSnapshots([requestedRepresentations[0]!]);
assert.equal(unavailableQuote[0]?.state, "unavailable");

console.log(JSON.stringify({
  totalRepresentations: firstPage.summary.totalRepresentations,
  distinctTickerValues: firstPage.summary.distinctTickerValues,
  platforms: firstPage.summary.issuerCount,
  logoProvenance: firstPage.provenance,
  strictPriceIdentityRegression: exactPriceProbe.identityMatches && !incompletePriceProbe.identityMatches && !duplicateTargetProbe.identityMatches,
  localPageSlicesDisjoint: !secondPage.items.some((item) => firstPage.items.some((first) => first.id === item.id)),
  exactFilterSetComparison: observedTabComparison.identityMatches && differingTabComparison.missingRepresentations === 1,
  timestampedDirectoryQuotes: directoryQuotes.every((item) => item.state === "available" && item.tokenPriceUpdatedAt),
  quoteBatchLimit: priceBatchRequests.map((items) => items.length),
  duplicateQuoteRowsRejected: ambiguousQuote[0]?.state === "ambiguous",
  boundedSingleSnapshot: boundedPage.items.length === 1_000 && boundedPage.pagination.hasMore,
  passed: true
}, null, 2));
