import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { BinanceWeb3Client } from "../src/binance-web3-client.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { normalizeStockAsset } from "../src/domain/normalizers.js";
import { compareAgentAssets, toAgentAsset } from "../src/domain/agent-normalizers.js";
import { renderAssetCard, renderResearchBrief, researchNextSteps } from "../src/presentation/asset-view.js";
import { renderResearchView } from "../src/mcp/ui/research-view.js";

const contract = JSON.parse(await readFile("records/phase27-binance-rwa-contract.json", "utf8")) as {
  phase: string;
  source: {
    url: string;
    official: boolean;
    downloadableSchema: string;
    renderedDocumentationSections: Array<{
      section: string;
      pageLines: string;
      fieldsVerified: string[];
      renderedListDoesNotDescribe?: string[];
    }>;
  };
  endpoints: {
    platforms: { tickerCount: string; chainDistributionTokenCount: string };
    tokens: {
      filters: Record<string, string>;
      paginationContract: string;
      assetType: string;
      marketStatus: string[];
      marketStatusReasonFields: string[];
      notDocumentedOnTokenListItem: string[];
    };
    search: { optionalFilter: string; chainFilter: string };
    price: { perAssetTimestamp: string };
  };
  comparisonWithPhase26Observation: {
    declaredBscTokenCount: number;
    declaredBscTokenCountBasis: string;
    returnedUniqueBscRepresentations: number;
    returnedUniqueBscRepresentationsBasis: string;
    difference: number;
    sourceRecord: string;
    interpretation: string;
    noRepeatProviderRequest: boolean;
  };
  implementationGapsConfirmedBySourceReview: string[];
};
const sourceDoc = await readFile("docs/BINANCE_RWA_API_CONTRACT_AUDIT.md", "utf8");
const phasePlan = await readFile("docs/CORE_PRODUCT_PHASE_PLAN.md", "utf8");
const service = await readFile("src/services/tokenized-stocks.ts", "utf8");
const domainTypes = await readFile("src/domain/types.ts", "utf8");
const normalizers = await readFile("src/domain/normalizers.ts", "utf8");
const technicalReport = await readFile("docs/TECHNICAL_RESEARCH_REPORT.md", "utf8");
const developerLog = await readFile("docs/DEVELOPER_EXPERIENCE_LOG.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
const phase26Observation = JSON.parse(await readFile("records/phase26-provider-observation.json", "utf8")) as {
  methodology: { declaredBscCount: string; uniqueDirectoryRepresentations: string; sourceValuesRetained: string };
  observations: { platformMetadataDeclaredBscRecords: number; directoryUniqueRepresentationsReturned: number; declaredMinusReturnedDifference: number };
  rawProviderPayloadIncluded: boolean;
  credentialsIncluded: boolean;
};
const jevShadowRecords = (await readFile("records/jev-shadow.jsonl", "utf8")).trim().split("\n")
  .map((line) => JSON.parse(line) as { evidence?: { phase?: string } });
const phase26Test = await readFile("scripts/test-phase26-provider-limitations.ts", "utf8");
const phase27Test = await readFile("scripts/test-phase27-api-contract.ts", "utf8");
const phasePlanTest = await readFile("scripts/test-core-product-phase-plan.ts", "utf8");
const jevShadowTest = await readFile("scripts/test-jev-shadow.ts", "utf8");

function typeBody(source: string, name: string): string {
  const match = source.match(new RegExp(`(?:type|interface) ${name}(?:\\s*=\\s*[^\\{\\n]+)?\\s*\\{([\\s\\S]*?)\\n\\};`));
  assert.ok(match, `Expected local source type ${name} to remain inspectable`);
  return match[1]!;
}

assert.equal(contract.phase, "official-provider-contract-audit");
assert.equal(contract.source.official, true);
assert.match(contract.source.url, /^https:\/\/web3\.binance\.com\//);
assert.match(contract.source.downloadableSchema, /timed out/);
assert.deepEqual(contract.source.renderedDocumentationSections.map(({ section, pageLines }) => [section, pageLines]), [
  ["Get RWA Token Issuance Platforms", "80-252"],
  ["Get RWA Token Price", "259-428"],
  ["Search RWA Token", "435-632"],
  ["Get RWA Token List", "855-1232"]
]);
assert.ok(contract.source.renderedDocumentationSections[0]!.fieldsVerified.includes("chainDistribution.tokenCount"));
assert.ok(contract.source.renderedDocumentationSections[1]!.fieldsVerified.includes("tokenPriceUpdatedAt"));
assert.ok(contract.source.renderedDocumentationSections[2]!.fieldsVerified.includes("assets[].assetType"));
assert.ok(contract.source.renderedDocumentationSections[3]!.fieldsVerified.includes("reasonCode"));
assert.ok(contract.source.renderedDocumentationSections[3]!.fieldsVerified.includes("reasonMsg"));
assert.ok(contract.source.renderedDocumentationSections[3]!.fieldsVerified.includes("nextCloseTime"));
assert.ok(contract.source.renderedDocumentationSections[3]!.renderedListDoesNotDescribe?.includes("total count"));
assert.ok(contract.source.renderedDocumentationSections[3]!.renderedListDoesNotDescribe?.includes("per-item tokenPriceUpdatedAt"));
assert.match(contract.endpoints.platforms.tickerCount, /underlying assets/);
assert.match(contract.endpoints.platforms.chainDistributionTokenCount, /same underlying asset.*different chains/i);
assert.match(contract.endpoints.tokens.filters.binanceChainId, /all chains/);
assert.match(contract.endpoints.tokens.filters.platformId, /all platforms/);
assert.match(contract.endpoints.tokens.filters.tabId, /all sectors/);
assert.match(contract.endpoints.tokens.paginationContract, /not proof.*undocumented runtime behavior/i);
assert.deepEqual(contract.endpoints.tokens.marketStatus, ["premarket", "regular", "postmarket", "overnight", "closed", "pause"]);
assert.deepEqual(contract.endpoints.tokens.marketStatusReasonFields, ["openState", "reasonCode", "reasonMsg", "nextOpenTime", "nextCloseTime"]);
assert.ok(contract.endpoints.tokens.assetType.includes("2=Pre-IPO") && contract.endpoints.tokens.assetType.includes("3=ETF"));
assert.match(contract.endpoints.search.chainFilter, /No chainId query parameter/);
assert.match(contract.endpoints.price.perAssetTimestamp, /distinct from the envelope-level server timestamp/);
assert.equal(contract.comparisonWithPhase26Observation.declaredBscTokenCount - contract.comparisonWithPhase26Observation.returnedUniqueBscRepresentations, contract.comparisonWithPhase26Observation.difference);
assert.equal(contract.comparisonWithPhase26Observation.difference, 57);
assert.match(contract.comparisonWithPhase26Observation.declaredBscTokenCountBasis, /chainDistribution\.tokenCount.*binanceChainId is 56.*not platform tickerCount/);
assert.match(contract.comparisonWithPhase26Observation.returnedUniqueBscRepresentationsBasis, /distinct normalized BSC identities.*lowercase token contract address/);
assert.match(contract.comparisonWithPhase26Observation.sourceRecord, /records\/phase26-provider-observation\.json.*raw rows and addresses are omitted/);
assert.match(phase26Observation.methodology.declaredBscCount, /Sum platform chainDistribution\.tokenCount.*binanceChainId 56/);
assert.match(phase26Observation.methodology.uniqueDirectoryRepresentations, /distinct normalized BSC asset identities/);
assert.equal(phase26Observation.observations.platformMetadataDeclaredBscRecords, contract.comparisonWithPhase26Observation.declaredBscTokenCount);
assert.equal(phase26Observation.observations.directoryUniqueRepresentationsReturned, contract.comparisonWithPhase26Observation.returnedUniqueBscRepresentations);
assert.equal(phase26Observation.observations.declaredMinusReturnedDifference, contract.comparisonWithPhase26Observation.difference);
assert.equal(phase26Observation.rawProviderPayloadIncluded, false);
assert.equal(phase26Observation.credentialsIncluded, false);
assert.match(phase26Observation.methodology.sourceValuesRetained, /cannot independently recompute/);
assert.equal(contract.comparisonWithPhase26Observation.noRepeatProviderRequest, true);
assert.match(contract.comparisonWithPhase26Observation.interpretation, /pagination cannot be asserted as the cause/);
assert.equal(contract.implementationGapsConfirmedBySourceReview.length, 3);

// Verify each key source-to-code loss point directly, not merely that the audit names it.
const searchResponseType = typeBody(service, "RwaSearchResponse");
const tokenResponseType = typeBody(service, "RwaTokenResponse");
const searchImplementation = service.match(/async search\(query[\s\S]*?(?=\n  async platforms)/)?.[0];
const listImplementation = service.match(/async listSnapshot\([\s\S]*?(?=\n  async tokenPriceSnapshots)/)?.[0];
assert.ok(searchImplementation, "search() implementation is present for the crosswalk");
assert.ok(listImplementation, "listSnapshot() implementation is present for the crosswalk");
assert.match(searchResponseType, /assetType\?: number/);
assert.match(searchImplementation, /assetType: asset\.assetType/);
assert.match(tokenResponseType, /assetType\?: number/);
assert.match(listImplementation, /assetType: token\.assetType/);
assert.match(tokenResponseType, /statusInfo\?: \{[\s\S]*?openState\?: boolean;[\s\S]*?marketStatus\?: string;[\s\S]*?nextOpenTime\?: number;[\s\S]*?reasonCode\?: string \| number;[\s\S]*?reasonMsg\?: string;[\s\S]*?nextCloseTime\?: number;/);
assert.match(listImplementation, /reasonCode|reasonMsg|nextCloseTime/);

const stockAssetType = typeBody(domainTypes, "StockAsset");
const listingType = typeBody(domainTypes, "TokenizedStockListing");
const marketContextType = typeBody(domainTypes, "MarketContext");
assert.match(stockAssetType, /assetType\?: number/);
assert.match(domainTypes, /export type TokenizedStockListing = StockAsset/);
assert.match(marketContextType, /marketStatus: MarketStatus/);
assert.match(marketContextType, /providerMarketStatus\?: string/);
assert.match(marketContextType, /reasonCode\?: string \| number/);
assert.match(marketContextType, /reasonMsg\?: string/);
assert.match(marketContextType, /nextCloseTime\?: number/);
const marketStatusNormalizer = normalizers.match(/export function normalizeMarketStatus\([\s\S]*?(?=\n\})/)?.[0];
assert.ok(marketStatusNormalizer, "normalizeMarketStatus() implementation is present");
for (const status of contract.endpoints.tokens.marketStatus) assert.ok(marketStatusNormalizer.includes(`\"${status}\"`), `status ${status} is explicitly normalized`);
assert.match(marketStatusNormalizer, /return \"unknown\"/);

// A fully in-memory provider fixture proves source-supported fields reach SDK and Agent-facing output.
const syntheticToken = {
  binanceChainId: "56",
  tokenContractAddress: "0x1111111111111111111111111111111111111111",
  platformId: "ondo",
  tokenSymbol: "TESTon",
  underlyingTicker: "TEST",
  underlyingName: "Synthetic Test Asset",
  assetType: 2,
  tokenPrice: "12.50",
  referencePrice: "12.50",
  statusInfo: {
    openState: false,
    marketStatus: "pause",
    reasonCode: "ASSET_PAUSED",
    reasonMsg: "synthetic fixture only",
    nextOpenTime: 1_800_000_000_000,
    nextCloseTime: 1_800_003_600_000
  }
};
const syntheticClient = {
  async get(path: string) {
    if (path === "/api/v1/dex/market/rwa/search") {
      return { data: [{ ticker: "TEST", companyName: "Synthetic Test Asset", assets: [{
        platformId: "ondo", binanceChainId: "56", tokenContractAddress: syntheticToken.tokenContractAddress,
        tokenSymbol: "TESTon", assetType: 2
      }] }], timestamp: 10 };
    }
    if (path === "/api/v1/dex/market/rwa/tokens") return { data: [syntheticToken], timestamp: 11 };
    if (path === "/api/v1/dex/market/rwa/platforms") {
      return { data: [{ platformId: "ondo", tickerCount: 1, chainDistribution: [{ binanceChainId: "56", tokenCount: 1 }] }], timestamp: 12 };
    }
    throw new Error(`Unexpected synthetic-only request path: ${path}`);
  }
} as unknown as BinanceWeb3Client;
const syntheticService = new TokenizedStocksService(syntheticClient);
const syntheticSearch = await syntheticService.search("TEST");
const syntheticListing = (await syntheticService.listSnapshot({ chainId: "56" })).listings[0];
assert.equal(syntheticSearch.length, 1);
assert.equal(syntheticSearch[0]?.assetType, 2, "search preserves the documented Pre-IPO assetType code");
assert.ok(syntheticListing);
assert.equal(syntheticListing.assetType, 2, "directory listing preserves the documented Pre-IPO assetType code");
assert.equal(syntheticListing.market.marketStatus, "closed", "pause remains conservatively non-tradable");
assert.equal(syntheticListing.market.providerMarketStatus, "pause", "the raw provider enum remains separately available");
assert.equal(syntheticListing.market.openState, false);
assert.equal(syntheticListing.market.nextOpenTime, syntheticToken.statusInfo.nextOpenTime);
assert.equal(syntheticListing.market.reasonCode, syntheticToken.statusInfo.reasonCode);
assert.equal(syntheticListing.market.reasonMsg, syntheticToken.statusInfo.reasonMsg);
assert.equal(syntheticListing.market.nextCloseTime, syntheticToken.statusInfo.nextCloseTime);
assert.equal(normalizeStockAsset({ binanceChainId: "56", tokenContractAddress: "0xunknown", assetType: 77 }).assetType, 77, "unknown numeric provider asset types are retained rather than rewritten as stock");
const agentAsset = toAgentAsset(syntheticSearch[0]!, syntheticListing.market);
const structuredAgentAsset = JSON.parse(JSON.stringify(agentAsset)) as typeof agentAsset;
assert.equal(structuredAgentAsset.assetType, 2, "the MCP structured asset keeps the provider asset type");
assert.equal(structuredAgentAsset.market?.providerMarketStatus, "pause");
assert.equal(structuredAgentAsset.market?.reasonCode, "ASSET_PAUSED");
const comparison = compareAgentAssets([agentAsset]);
const brief = renderResearchBrief([agentAsset], comparison, undefined, researchNextSteps([agentAsset], comparison, { allowQuoteFollowUp: false, allowWalletExposureFollowUp: false }), { allowQuoteFollowUp: false });
assert.match(renderAssetCard(agentAsset), /Asset type: \*\*Pre-IPO \(2\)\*\*/);
assert.match(brief, /Provider status: pause.*Reason code: ASSET\\_PAUSED.*Provider note: synthetic fixture only.*Next open:.*Next close:/);
const nativeCard = renderResearchView({ query: "Research TEST", resolvedQuery: "TEST", assets: [structuredAgentAsset], comparison, outcome: { status: "warning", warnings: [], sideEffects: "none" } });
assert.match(nativeCard, /Pre-IPO \(2\)/);
assert.match(nativeCard, /Provider market details/);
assert.match(nativeCard, /Provider status: pause/);
assert.match(nativeCard, /Reason code: ASSET_PAUSED/);
assert.match(nativeCard, /Provider note: synthetic fixture only/);
assert.ok(nativeCard.includes(new Date(syntheticToken.statusInfo.nextCloseTime).toISOString()));

const crosswalk = (contract as typeof contract & {
  sourceCodeCrosswalk: Array<{ documentedField: string; observedHandling: string; phase28Repair: string }>;
}).sourceCodeCrosswalk;
assert.equal(crosswalk.length, 3);
assert.match(crosswalk[0]!.documentedField, /assetType.*Stock.*Pre-IPO.*ETF/);
assert.match(crosswalk[0]!.observedHandling, /search\(\).*does not pass it.*RwaTokenResponse/);
assert.match(crosswalk[1]!.documentedField, /reasonCode.*reasonMsg.*nextCloseTime/);
assert.match(crosswalk[1]!.observedHandling, /four broad internal values/);
assert.match(crosswalk[2]!.observedHandling, /does not promise tokenPriceUpdatedAt/);
for (const item of crosswalk) assert.ok(item.phase28Repair.length > 40, "each mapped gap has a scoped follow-up repair");

const boundary = (contract as typeof contract & {
  phase27ExecutionBoundary: {
    providerEndpointRequests: number;
    rawProviderPayloadsReadOrStored: boolean;
    providerCredentialsUsed: boolean;
    providerCredentialsIncludedInJevEvidence: boolean;
    jevReviewerAuthenticationUsed: boolean;
    jevReviewerAuthenticationIncludedInEvidence: boolean;
    externalWrites: number;
    selectedChecks: string[];
    basis: string;
  };
}).phase27ExecutionBoundary;
assert.equal(boundary.providerEndpointRequests, 0);
assert.equal(boundary.rawProviderPayloadsReadOrStored, false);
assert.equal(boundary.providerCredentialsUsed, false);
assert.equal(boundary.providerCredentialsIncludedInJevEvidence, false);
assert.equal(boundary.jevReviewerAuthenticationUsed, true);
assert.equal(boundary.jevReviewerAuthenticationIncludedInEvidence, false);
assert.equal(boundary.externalWrites, 0);
assert.match(boundary.basis, /rendered official documentation.*local repository files.*local checks/);
for (const record of jevShadowRecords) {
  if (record.evidence?.phase === "official-provider-contract-audit") {
    assert.doesNotMatch(JSON.stringify(record.evidence), /Bearer\s+[A-Za-z0-9._-]+|X-OC-APIKEY|JEV_AGENT_KEY|AI_GATEWAY_API_KEY/);
  }
}
assert.deepEqual(boundary.selectedChecks, [
  "typecheck (tsc --noEmit)",
  "test:phase27-contract (local JSON/Markdown/TypeScript source assertions plus an in-memory synthetic provider fixture)",
  "test:phase26-limitations (local sanitized-record and documentation assertions)",
  "test:core-product-phase-plan (local roadmap and evidence assertions)",
  "test:jev-shadow (local Jev gate and approved-successor transition assertions)"
]);
assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
assert.equal(packageJson.scripts["test:phase27-contract"], "node --import tsx scripts/test-phase27-api-contract.ts");
assert.equal(packageJson.scripts["test:phase26-limitations"], "node --import tsx scripts/test-phase26-provider-limitations.ts");
assert.equal(packageJson.scripts["test:core-product-phase-plan"], "node --import tsx scripts/test-core-product-phase-plan.ts");
for (const localCheck of [phase26Test, phase27Test, phasePlanTest, jevShadowTest]) {
  assert.match(localCheck, /node:fs\/promises/);
  assert.doesNotMatch(localCheck, /\bfetch\s*\(|https?\.request\s*\(|new BinanceWeb3Client\s*\(/);
}
assert.match(phase27Test, /fully in-memory provider fixture/);
assert.match(phase27Test, /const syntheticClient = \{/);
assert.match(phase27Test, /Unexpected synthetic-only request path/);

assert.match(sourceDoc, /`tickerCount`.*底层资产数量.*number of underlying assets/);
assert.match(sourceDoc, /Get RWA Token Issuance Platforms.*80–252/);
assert.match(sourceDoc, /Get RWA Token Price.*259–428/);
assert.match(sourceDoc, /Search RWA Token.*435–632/);
assert.match(sourceDoc, /Get RWA Token List.*855–1232/);
assert.match(sourceDoc, /`chainDistribution\.tokenCount`.*RWA token 数量.*number of RWA tokens on this chain/);
assert.match(sourceDoc, /57 条差额.*原因不明/);
assert.match(sourceDoc, /文档中未列出分页，不证明运行时不存在未公开行为/);
assert.match(sourceDoc, /没有发起任何 Binance API 请求/);
assert.match(sourceDoc, /文档字段到 Ariadne 数据路径的逐项核对/);
assert.match(sourceDoc, /`assetType`.*`RwaSearchResponse`.*`StockAsset`/);
assert.match(sourceDoc, /`reasonCode`.*`reasonMsg`.*`nextCloseTime`/);
assert.match(sourceDoc, /没有调用 Binance endpoint.*写入外部系统或 push 仓库/);
assert.match(phasePlan, /Phase 27 — official-provider-contract-audit/);
assert.match(phasePlan, /Phase 28 — source-confirmed-data-fidelity/);
assert.match(phasePlan, /Phase 29 — sdk-mcp-final-acceptance/);
assert.match(technicalReport, /Phase 27 official Binance RWA contract audit[\s\S]*Phase 26.s 545 is the sum of BSC chain-distribution token counts[\s\S]*488 is the number of unique returned BSC chain\/address identities[\s\S]*57-row arithmetic[\s\S]*gap remains unexplained/);
assert.match(developerLog, /Phase 27 official provider contract audit[\s\S]*No Binance API request, repeated market probe, provider-credential use, external write, or publication occurred/);
assert.match(developerLog, /Jev gate uses separately configured reviewer authentication/);

// This is a historical contract audit; post-Phase-27 consumer parity is verified by test:phase28-fidelity and the actual MCP loopback fixture.
assert.match(service, /type RwaTokenResponse/);
assert.match(domainTypes, /export type TokenizedStockListing/);
console.log(JSON.stringify({
  officialContractRecord: true,
  officialSectionLocationsRecordedAndAsserted: true,
  countUnitsSeparated: true,
  paginationNotOverclaimed: true,
  endpointFiltersEnumsAndTimestampSemanticsRecorded: true,
  assetTypePreservedAcrossSearchListAndDomain: true,
  detailedMarketStateAndReasonPreservedAcrossResponseAndDomain: true,
  syntheticFixtureConfirmsSdkAgentTextStructuredAndNativeUiParity: true,
  providerPauseRemainsFailClosedAndRawStatusVisible: true,
  priceAndEnvelopeTimestampDistinctionVerified: true,
  scopedPhase28RepairMap: true,
  localOnlyAuditChecksAndNoProviderRequest: true,
  passed: true
}, null, 2));
