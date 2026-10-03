import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contract = JSON.parse(await readFile("research/data/binance-rwa-contract.json", "utf8")) as {
  recordType: string;
  source: { url: string; official: boolean };
  endpoints: {
    platforms: { tickerCount: string; chainDistributionTokenCount: string };
    tokens: {
      filters: Record<string, string>;
      renderedDocumentationDoesNotList: string[];
      assetType: Record<string, string>;
      marketStatus: string[];
      marketStatusReasonFields: string[];
      notDocumentedOnTokenListItem: string[];
    };
    search: { requiredQuery: string; chainFilter: string };
    price: { perAssetTimestamp: string };
  };
  boundedCatalogObservation: {
    declaredBscTokenCount: number;
    returnedUniqueBscRepresentations: number;
    difference: number;
    interpretation: string;
    noRepeatProviderRequestDuringContractReview: boolean;
  };
};
const report = await readFile("docs/BINANCE_RWA_API_CONTRACT_AUDIT.md", "utf8");
const service = await readFile("src/services/tokenized-stocks.ts", "utf8");
const domainTypes = await readFile("src/domain/types.ts", "utf8");

assert.equal(contract.recordType, "provider-contract-review");
assert.equal(contract.source.official, true);
assert.match(contract.source.url, /^https:\/\/web3\.binance\.com\//);
assert.match(contract.endpoints.platforms.tickerCount, /underlying assets/);
assert.match(contract.endpoints.platforms.chainDistributionTokenCount, /same underlying asset.*different chains/i);
assert.match(contract.endpoints.tokens.filters.binanceChainId!, /all chains/);
assert.match(contract.endpoints.tokens.filters.platformId!, /all platforms/);
assert.match(contract.endpoints.tokens.filters.tabId!, /all sectors/);
assert.ok(contract.endpoints.tokens.renderedDocumentationDoesNotList.includes("total count"));
assert.deepEqual(contract.endpoints.tokens.assetType, { "1": "Stock", "2": "Pre-IPO", "3": "ETF" });
assert.deepEqual(contract.endpoints.tokens.marketStatus, ["premarket", "regular", "postmarket", "overnight", "closed", "pause"]);
assert.deepEqual(contract.endpoints.tokens.marketStatusReasonFields, ["openState", "reasonCode", "reasonMsg", "nextOpenTime", "nextCloseTime"]);
assert.ok(contract.endpoints.tokens.notDocumentedOnTokenListItem.includes("liquidity"));
assert.match(contract.endpoints.search.requiredQuery, /keyword/);
assert.match(contract.endpoints.search.chainFilter, /does not list a chainId/);
assert.match(contract.endpoints.price.perAssetTimestamp, /distinct from the envelope-level/);

assert.equal(contract.boundedCatalogObservation.declaredBscTokenCount, 545);
assert.equal(contract.boundedCatalogObservation.returnedUniqueBscRepresentations, 488);
assert.equal(contract.boundedCatalogObservation.difference, 57);
assert.equal(545 - 488, contract.boundedCatalogObservation.difference);
assert.match(contract.boundedCatalogObservation.interpretation, /remains unexplained/);
assert.match(contract.boundedCatalogObservation.interpretation, /completeness remains unverified/);
assert.equal(contract.boundedCatalogObservation.noRepeatProviderRequestDuringContractReview, true);

assert.match(service, /assetType\?: number/);
assert.match(service, /reasonCode\?: string \| number/);
assert.match(service, /reasonMsg\?: string/);
assert.match(service, /nextCloseTime\?: number/);
assert.match(domainTypes, /assetType\?: number/);
assert.match(domainTypes, /providerMarketStatus\?: string/);
assert.match(domainTypes, /nextCloseTime\?: number/);
assert.match(report, /API 契约审查/);
assert.match(report, /分页参数、总数或续页标记/);
assert.match(report, /时间戳存在也不会被表述成新鲜度保证/);
assert.doesNotMatch(report, /Jev|Phase \d+/i);

console.log(JSON.stringify({
  officialContractFacts: true,
  countUnitsAndUnknowns: true,
  currentSourceRetainsDocumentedFields: true,
  contractReviewDoesNotOverclaimRuntimeBehavior: true,
  passed: true
}, null, 2));
