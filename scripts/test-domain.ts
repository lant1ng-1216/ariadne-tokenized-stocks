import assert from "node:assert/strict";
import { normalizeMarketContext, normalizeQuote, normalizeSimulation } from "../src/domain/normalizers.js";
import { evaluateSafety } from "../src/domain/safety.js";
import { attachSimulation, assertExecutable, confirmPlan, isPlanExpired } from "../src/domain/action-plan.js";
import { ExecutionService } from "../src/services/executor.js";
import { CATALOG_SCOPE_WARNING, TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { parseTokenAmount } from "../src/domain/amount.js";
import { summarizeTokenPriceProbe } from "../src/services/asset-coverage-audit.js";

assert.equal(parseTokenAmount("1.25", 6), 1_250_000n);
assert.equal(parseTokenAmount("0.000001", 6), 1n);
assert.equal(parseTokenAmount("2", 0), 2n);
assert.throws(() => parseTokenAmount("0.0000001", 6), /precision/);
assert.throws(() => parseTokenAmount("0", 18), /greater than zero/);
assert.throws(() => parseTokenAmount("1e3", 18), /plain decimal/);
assert.throws(() => parseTokenAmount("1.5", 0), /precision/);

const requests: Array<{ path: string; params?: Record<string, string> }> = [];
const approvalSpender = "0x5555555555555555555555555555555555555555";
const approvalAmount = BigInt(1_250_000).toString(16).padStart(64, "0");
const approvalCalldata = `0x095ea7b3${approvalSpender.slice(2).toLowerCase().padStart(64, "0")}${approvalAmount}`;
const mockClient = {
  async get(path: string, params?: Record<string, string>) {
    requests.push({ path, params });
    if (path.endsWith("/aggregator/quote")) return { code: 0, success: true, data: [{ quoteId: "decimal-quote", executionMode: "SWAP", priceImpactPercent: "0.4", toTokenAmount: "100", minToTokenAmount: "99", approveTarget: "0x3333333333333333333333333333333333333333" }] };
    if (path.endsWith("/aggregator/swap")) return { code: 0, success: true, data: { executionMode: "SWAP", tx: { from: "0x1", to: "0x2", value: "0", data: "0x" } } };
    if (path.endsWith("/aggregator/approve-transaction")) return { code: 0, success: true, data: [{ data: approvalCalldata, dexContractAddress: approvalSpender, gasLimit: "70000", gasPrice: "100000000" }] };
    if (path.endsWith("/rwa/platforms")) return { timestamp: 1_790_603_000_100, data: [{ platformId: "bstock" }] };
    if (path.endsWith("/rwa/search")) return { data: [{ ticker: "NVDA", companyName: "Nvidia Corp", assets: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB" }] }] };
    if (path.endsWith("/rwa/tokens")) return { timestamp: 1_790_603_000_000, data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100", tokenPriceUpdatedAt: 1, statusInfo: { marketStatus: "open", openState: true } }] };
    if (path.endsWith("/rwa/price")) return { timestamp: 1_790_603_000_200, data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenPrice: "101", referencePrice: "100.5", tokenPriceUpdatedAt: 1234 }] };
    throw new Error(`Unexpected test request: ${path}`);
  }
};

const asset = {
  assetId: "56:0xabc",
  chainId: "56",
  platformId: "bstock",
  contractAddress: "0xabc",
  tokenSymbol: "NVDAB",
  underlyingTicker: "NVDA",
  underlyingName: "Nvidia Corp"
};
const priceService = new TokenizedStocksService(mockClient as any);
const searchResults = await priceService.search("NVDA", { chainId: "56" });
assert.deepEqual(searchResults[0]?.collectionWarnings, [CATALOG_SCOPE_WARNING], "SDK search results must disclose that returned matches are not a verified complete catalog");
const priceContext = await priceService.marketContext(asset);
assert.equal(priceContext.tokenPrice, "101", "market context should prefer the dedicated RWA price endpoint");
assert.equal(priceContext.referencePrice, "100.5");
assert.equal(priceContext.tokenPriceUpdatedAt, 1234, "market context should retain the provider's per-token update timestamp");
const freshnessCaveat = "Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified";
assert.deepEqual(priceContext.dataWarnings.filter((warning) => warning === freshnessCaveat), [freshnessCaveat], "SDK market context must expose exactly one explicit freshness caveat");
const priceProvenance = priceContext.provenance ?? [];
assert.equal(priceProvenance[0]?.responseTimestampMs, 1_790_603_000_200, "the provider response timestamp remains separately attributable");
assert.notEqual(priceContext.tokenPriceUpdatedAt, priceProvenance[0]?.responseTimestampMs, "an asset quote timestamp must not be conflated with its response timestamp");
const contextWithoutAssetTimestamp = normalizeMarketContext(asset, { tokenPrice: "101", referencePrice: "100.5" });
assert.equal(contextWithoutAssetTimestamp.tokenPriceUpdatedAt, undefined, "missing per-asset update time remains absent");
assert.ok(contextWithoutAssetTimestamp.dataWarnings.includes(freshnessCaveat), "the freshness caveat remains present when the provider omits an asset timestamp");
const contextWithAssetTimestamp = normalizeMarketContext(asset, { tokenPrice: "101", referencePrice: "100.5", tokenPriceUpdatedAt: 1234 });
assert.equal(contextWithAssetTimestamp.tokenPriceUpdatedAt, 1234, "a provider quote timestamp is retained as observed data");
assert.ok(contextWithAssetTimestamp.dataWarnings.includes(freshnessCaveat), "the same caveat remains present even when the provider supplies a timestamp");
assert.deepEqual(priceContext.provenance, [
  {
    provider: "Binance Web3",
    endpoint: "/api/v1/dex/market/rwa/price",
    fields: ["tokenPrice", "referencePrice", "tokenPriceUpdatedAt"],
    responseTimestampMs: 1_790_603_000_200,
    assetUpdatedAtMs: 1234
  },
  {
    provider: "Binance Web3",
    endpoint: "/api/v1/dex/market/rwa/tokens",
    fields: ["assetType", "marketStatus", "openState", "reasonCode", "reasonMsg", "nextOpenTime", "nextCloseTime", "volume24H"],
    responseTimestampMs: 1_790_603_000_000
  }
], "field sources and endpoint response times must remain distinct from the per-asset quote update time");
assert.deepEqual(requests.find((request) => request.path.endsWith("/rwa/price"))?.params, {
  binanceChainId: "56",
  tokenContractAddresses: "0xabc"
});
const catalogSnapshot = await priceService.listSnapshot({ chainId: "56" });
assert.deepEqual(catalogSnapshot.warnings, [CATALOG_SCOPE_WARNING], "SDK directory snapshots must return the explicit incomplete-catalog warning");
assert.equal(catalogSnapshot.sourceResponseTimestampMs, 1_790_603_000_000, "catalog response timestamp should be retained in milliseconds");
assert.equal(catalogSnapshot.platformMetadataResponseTimestampMs, 1_790_603_000_100, "platform metadata response timestamp should remain distinct from the token-list response");
assert.equal(catalogSnapshot.listings[0]?.market.tokenPriceUpdatedAt, 1, "catalog response time must not replace the row's separate quote-update timestamp");
assert.equal(catalogSnapshot.listings[0]?.market.provenance?.[0]?.endpoint, "/api/v1/dex/market/rwa/tokens");
assert.equal(catalogSnapshot.listings[0]?.market.provenance?.[0]?.responseTimestampMs, 1_790_603_000_000);
const missingPriceService = new TokenizedStocksService({
  async get(path: string) {
    if (path.endsWith("/rwa/tokens")) return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100", statusInfo: { marketStatus: "open", openState: true } }] };
    if (path.endsWith("/rwa/price")) return { data: [] };
    if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "bstock" }] };
    throw new Error(`Unexpected missing-price test request: ${path}`);
  }
} as any);
await assert.rejects(missingPriceService.marketContext(asset), /timestamped RWA price snapshot was not returned/);
for (const invalidPrice of ["0", "-1", "abc", "1e3", "NaN"]) {
  const invalidPriceService = new TokenizedStocksService({
    async get(path: string) {
      if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "bstock" }] };
      if (path.endsWith("/rwa/tokens")) return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", statusInfo: { marketStatus: "open" } }] };
      if (path.endsWith("/rwa/price")) return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenPrice: invalidPrice, referencePrice: "100", tokenPriceUpdatedAt: 1234 }] };
      throw new Error(`Unexpected invalid-price test request: ${path}`);
    }
  } as any);
  const invalidContext = await invalidPriceService.marketContext(asset);
  assert.equal(invalidContext.tokenPrice, undefined, `${invalidPrice} must not be exposed as a valid market price`);
  assert.ok(invalidContext.dataWarnings.some((warning) => /invalid or non-positive/.test(warning)));
}
const secondAsset = { ...asset, assetId: "56:0xdef", contractAddress: "0xdef", platformId: "ondo", tokenSymbol: "NVDAon" };
const batchedPaths: Array<{ path: string; params?: Record<string, string> }> = [];
const batchedService = new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    batchedPaths.push({ path, params });
    if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "bstock" }, { platformId: "ondo" }] };
    if (path.endsWith("/rwa/tokens")) return { data: [
      { binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100", statusInfo: { marketStatus: "open", openState: true } },
      { binanceChainId: "56", tokenContractAddress: "0xdef", platformId: "ondo", tokenSymbol: "NVDAon", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100", statusInfo: { marketStatus: "open", openState: true } }
    ] };
    if (path.endsWith("/rwa/price")) return { data: [
      { binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenPrice: "101", referencePrice: "100.5", tokenPriceUpdatedAt: 1234 },
      { binanceChainId: "56", tokenContractAddress: "0xdef", platformId: "ondo", tokenPrice: "102", referencePrice: "101.5", tokenPriceUpdatedAt: 5678 }
    ] };
    throw new Error(`Unexpected batched market-context request: ${path}`);
  }
} as any);
const batchedContexts = await batchedService.marketContexts([asset, secondAsset]);
assert.deepEqual(batchedContexts.map((context) => context.tokenPriceUpdatedAt), [1234, 5678]);
assert.equal(batchedPaths.filter((request) => request.path.endsWith("/rwa/tokens")).length, 1, "same-chain issuer representations share one token-list request");
assert.equal(batchedPaths.filter((request) => request.path.endsWith("/rwa/price")).length, 1, "same-chain issuer representations share one batch price request");
assert.equal(batchedPaths.find((request) => request.path.endsWith("/rwa/price"))?.params?.tokenContractAddresses, "0xabc,0xdef");

const coverageAssets: typeof asset[] = Array.from({ length: 101 }, (_, index) => {
  const contractAddress = "0x" + (index + 1).toString(16).padStart(40, "0");
  return { ...asset, assetId: "56:" + contractAddress, contractAddress, platformId: index % 2 ? "bstock" : "ondo", tokenSymbol: "T" + index };
});
coverageAssets.push({ ...coverageAssets[0], assetId: "1:" + coverageAssets[0].contractAddress, chainId: "1" });
const coverageRequests: Array<{ path: string; params?: Record<string, string> }> = [];
const timestampByAsset = new Map(coverageAssets.map((item, index) => [item.chainId + ":" + item.contractAddress.toLowerCase(), index + 1000]));
const coverageService = new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    coverageRequests.push({ path, params });
    if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "ondo" }, { platformId: "bstock" }] };
    if (path.endsWith("/rwa/tokens")) return { data: coverageAssets.filter((item) => item.chainId === params?.binanceChainId).map((item) => ({
      binanceChainId: item.chainId,
      tokenContractAddress: item.contractAddress,
      platformId: item.platformId,
      tokenSymbol: item.tokenSymbol,
      underlyingTicker: item.underlyingTicker,
      underlyingName: item.underlyingName,
      tokenPrice: "10",
      statusInfo: { marketStatus: "open", openState: true }
    })) };
    if (path.endsWith("/rwa/price")) {
      const chainId = params?.binanceChainId ?? "";
      const addresses = (params?.tokenContractAddresses ?? "").split(",");
      return { data: coverageAssets.filter((item) => item.chainId === chainId && addresses.includes(item.contractAddress)).reverse().map((item) => ({
        binanceChainId: item.chainId,
        tokenContractAddress: item.contractAddress,
        platformId: item.platformId,
        tokenPrice: "10",
        referencePrice: "9.9",
        tokenPriceUpdatedAt: timestampByAsset.get(item.chainId + ":" + item.contractAddress.toLowerCase())
      })) };
    }
    throw new Error("Unexpected coverage request: " + path);
  }
} as any);
const coverageContexts = await coverageService.marketContexts(coverageAssets);
const listRequests = coverageRequests.filter((request) => request.path.endsWith("/rwa/tokens"));
const priceRequests = coverageRequests.filter((request) => request.path.endsWith("/rwa/price"));
assert.equal(coverageContexts.length, 102);
assert.deepEqual(coverageContexts.map((context) => context.asset.assetId), coverageAssets.map((item) => item.assetId), "batch output preserves requested order across chains");
assert.deepEqual(coverageContexts.map((context) => context.tokenPriceUpdatedAt), coverageAssets.map((item) => timestampByAsset.get(item.chainId + ":" + item.contractAddress.toLowerCase())), "out-of-order provider rows join to the exact chain and contract");
assert.equal(listRequests.length, 2, "different chains get separate token-list queries");
assert.equal(priceRequests.length, 4, "101 same-chain addresses split into 50 + 50 + 1, plus one other-chain batch");
assert.deepEqual(priceRequests.filter((request) => request.params?.binanceChainId === "56").map((request) => request.params?.tokenContractAddresses.split(",").length).sort((a, b) => (a ?? 0) - (b ?? 0)), [1, 50, 50]);
assert.ok(priceRequests.every((request) => (request.params?.tokenContractAddresses.split(",").length ?? 51) <= 50));

for (const invalidTimestamp of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5, 8_640_000_000_000_001]) {
  const invalidTimestampService = new TokenizedStocksService({
    async get(path: string) {
      if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "bstock" }] };
      if (path.endsWith("/rwa/tokens")) return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100" }] };
      if (path.endsWith("/rwa/price")) return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenPrice: "101", tokenPriceUpdatedAt: invalidTimestamp }] };
      throw new Error("Unexpected invalid-timestamp request: " + path);
    }
  } as any);
  await assert.rejects(invalidTimestampService.marketContext(asset), /timestamped RWA price snapshot was not returned/);
}
const invalidCatalogTimesService = new TokenizedStocksService({
  async get(path: string) {
    if (path.endsWith("/rwa/platforms")) return { timestamp: 1.5, data: [{ platformId: "bstock" }] };
    if (path.endsWith("/rwa/tokens")) return { timestamp: 8_640_000_000_000_001, data: [{
      binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenSymbol: "NVDAB",
      underlyingTicker: "NVDA", underlyingName: "Nvidia Corp", tokenPrice: "100", tokenPriceUpdatedAt: -1,
      statusInfo: { marketStatus: "open", openState: true }
    }] };
    throw new Error(`Unexpected invalid-catalog-timestamp request: ${path}`);
  }
} as any);
const invalidCatalogTimes = await invalidCatalogTimesService.listSnapshot({ chainId: "56" });
assert.equal(invalidCatalogTimes.sourceResponseTimestampMs, undefined, "invalid catalog response time is omitted");
assert.equal(invalidCatalogTimes.platformMetadataResponseTimestampMs, undefined, "invalid platform response time is omitted");
assert.equal(invalidCatalogTimes.listings[0]?.market.tokenPriceUpdatedAt, undefined, "invalid catalog quote time is omitted");
assert.equal(invalidCatalogTimes.listings[0]?.market.provenance?.[0]?.responseTimestampMs, undefined);
assert.equal(invalidCatalogTimes.listings[0]?.market.provenance?.[0]?.assetUpdatedAtMs, undefined);
const invalidPriceSnapshotService = new TokenizedStocksService({
  async get() { return { data: [{ binanceChainId: "56", tokenContractAddress: "0xabc", platformId: "bstock", tokenPrice: "100", tokenPriceUpdatedAt: 1.5 }] }; }
} as any);
const invalidStandalonePrice = await invalidPriceSnapshotService.tokenPriceSnapshots([{ chainId: "56", platformId: "bstock", contractAddress: "0xabc" }]);
assert.equal(invalidStandalonePrice[0]?.state, "invalid", "a standalone read-only price snapshot cannot mark a malformed timestamp available");
assert.equal(invalidStandalonePrice[0]?.tokenPrice, undefined);
const coverageIdentity = [{ chainId: "56", platformId: "bstock", contractAddress: "0xabc" }];
for (const invalidTimestamp of [0, -1, 1.5, 8_640_000_000_000_001, Number.POSITIVE_INFINITY]) {
  const coverage = summarizeTokenPriceProbe(coverageIdentity, [{
    binanceChainId: "56", platformId: "bstock", tokenContractAddress: "0xabc", tokenPrice: "100", tokenPriceUpdatedAt: invalidTimestamp
  }]);
  assert.equal(coverage.matchedRepresentationsWithValidUpdateTimestamp, 0, "the provider coverage audit does not count malformed timestamps as valid");
}
const decimalPlan = await new TokenizedStocksService(mockClient as any, async () => 2_000_000n, async () => 2_000_000n).createActionPlan({ type: "buy", walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1.25", amountDecimals: 6, maxSlippageBps: 50 });
assert.equal(decimalPlan.status, "awaiting_confirmation");
assert.equal(decimalPlan.safetyReport?.checks.find((check) => check.name === "input_balance")?.passed, true);
assert.equal(decimalPlan.authorizationCheck?.required, true);
const requestsBeforeUnknownStatus = requests.length;
const unknownStatusPlan = await new TokenizedStocksService({
  async get(path: string, params?: Record<string, string>) {
    const response = await mockClient.get(path, params);
    const data = (response as any).data;
    if (path.endsWith("/rwa/tokens")) return { ...response, data: Array.isArray(data) ? data.map((item: any) => ({ ...item, statusInfo: { marketStatus: "future-status", openState: true } })) : data };
    return response;
  }
} as any, async () => 2_000_000n, async () => 2_000_000n).createActionPlan({ type: "buy", walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1.25", amountDecimals: 6, maxSlippageBps: 50 });
assert.equal(unknownStatusPlan.status, "awaiting_confirmation", "an explicit provider openState=true satisfies tradability even when its category is unrecognized");
assert.ok((unknownStatusPlan.unsignedActions?.length ?? 0) > 0, "a tradable unknown-category plan may prepare unsigned actions for review");
const unknownMarketCheck = unknownStatusPlan.safetyReport?.checks.find((check) => check.name === "market_status");
assert.equal(unknownMarketCheck?.passed, true);
assert.equal(unknownMarketCheck?.severity, "warning", "the unknown category remains visible as a warning");
assert.match(unknownMarketCheck?.message ?? "", /category is unknown.*reports the underlying market is currently tradable/i);
assert.equal(unknownStatusPlan.safetyReport?.blockingReasons.some((reason) => /market status category is unknown/i.test(reason)), false);
assert.ok(requests.slice(requestsBeforeUnknownStatus).some((request) => request.path.endsWith("/aggregator/swap")), "a provider-confirmed tradable market may build an unsigned swap action");
const insufficientBalancePlan = await new TokenizedStocksService(mockClient as any, async () => 2_000_000n, async () => 1_249_999n).createActionPlan({ type: "buy", walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1.25", amountDecimals: 6, maxSlippageBps: 50 });
assert.equal(insufficientBalancePlan.status, "awaiting_confirmation", "wallet funds do not block a quote-backed plan");
assert.ok(insufficientBalancePlan.unsignedActions?.length, "a purchase plan is still prepared for the user's wallet to decide");
assert.equal(insufficientBalancePlan.safetyReport?.checks.find((check) => check.name === "input_balance")?.message, "Ariadne does not pre-check wallet funds; the wallet decides whether it can submit the transaction");
let walletBalanceReads = 0;
const unknownBalancePlan = await new TokenizedStocksService(mockClient as any, async () => 2_000_000n, async () => { walletBalanceReads += 1; throw new Error("RPC unavailable"); }).createActionPlan({ type: "buy", walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1.25", amountDecimals: 6, maxSlippageBps: 50 });
assert.equal(unknownBalancePlan.status, "awaiting_confirmation", "an unreadable wallet balance does not block plan preparation");
assert.ok(unknownBalancePlan.unsignedActions?.length);
assert.equal(walletBalanceReads, 0, "plan creation does not query wallet funds");
assert.equal(requests.find((request) => request.path.endsWith("/aggregator/quote"))?.params?.amount, "1250000");
assert.equal(requests.find((request) => request.path.endsWith("/aggregator/swap"))?.params?.amount, "1250000");
const approvalIntent = { type: "buy" as const, walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1.25", amountDecimals: 6, maxSlippageBps: 50 };
const approvalQuote = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "decimal-quote", priceImpactPercent: "0.4", approveTarget: approvalSpender }] });
const approvalAction = await new TokenizedStocksService(mockClient as any).buildApprovalAction(approvalIntent, approvalQuote);
assert.equal((approvalAction?.payload as any).tx.to, approvalIntent.fromTokenAddress, "approval target is the ERC-20 token contract");
assert.equal((approvalAction?.payload as any).tx.from, approvalIntent.walletAddress, "approval handoff binds the wallet");
assert.equal((approvalAction?.payload as any).tx.value, "0", "ERC-20 approval sends no native value");
assert.equal((approvalAction?.payload as any).tx.data, approvalCalldata, "approval calldata is preserved byte-for-byte");
assert.equal((approvalAction?.payload as any).tx.gas, "70000");
assert.equal(requests.find((request) => request.path.endsWith("/aggregator/approve-transaction"))?.params?.approveAmount, "1250000");
const approvalMockClient = {
  async get(path: string, params?: Record<string, string>) {
    if (path.endsWith("/aggregator/quote")) return { code: 0, success: true, data: [{ quoteId: "approval-quote", executionMode: "SWAP", toTokenAmount: "1000000000", minToTokenAmount: "995000000", priceImpactPercent: "0.4", approveTarget: approvalSpender }] };
    return mockClient.get(path, params);
  }
};
const blockedApprovalPlan = await new TokenizedStocksService(approvalMockClient as any, async () => 0n, async () => 2_000_000n).createActionPlan(approvalIntent);
assert.equal(blockedApprovalPlan.status, "awaiting_confirmation", `an insufficient allowance is a separate approval step, not a reason to hide the purchase plan: ${JSON.stringify(blockedApprovalPlan)}`);
assert.deepEqual(blockedApprovalPlan.approvalRequired, { tokenAddress: "0x2", spender: approvalSpender, requiredAmount: "1250000", currentAllowance: "0" });
assert.ok(blockedApprovalPlan.unsignedActions?.length);

const market = normalizeMarketContext(asset, {
  tokenPrice: "0.3000000000000000001",
  referencePrice: "0.3",
  tokenPriceUpdatedAt: 1,
  statusInfo: { marketStatus: "offhours", openState: true },
  liquidity: null
});
assert.equal(market.priceGap, "0.0000000000000000001");
assert.equal(market.priceGapPercent, "0.000000000000000033%");
assert.equal(market.marketStatus, "offhours");
assert.match(market.dataWarnings.join(" "), /Liquidity/);
for (const invalidPrice of ["0", "-1", "abc", "1e3", "NaN"]) {
  const invalidMarket = normalizeMarketContext(asset, { tokenPrice: invalidPrice, referencePrice: "100" });
  assert.equal(invalidMarket.tokenPrice, undefined);
  assert.ok(invalidMarket.dataWarnings.some((warning) => /invalid or non-positive/.test(warning)));
}
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "regular" } }).marketStatus, "open");
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "halted" } }).marketStatus, "closed");
for (const status of ["premarket", "postmarket", "overnight"]) {
  assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: status } }).marketStatus, "offhours", `${status} should remain distinguishable from regular open trading`);
}
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "pause" } }).marketStatus, "closed", "a provider-reported pause must remain non-tradable");
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "future-provider-value" } }).marketStatus, "unknown", "undocumented provider states must not be guessed");

const quote = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q1", executionMode: "SWAP", toTokenAmount: "10", priceImpactPercent: "0.4", vendorName: "LiquidMesh", approveTarget: approvalSpender }] });
assert.equal(quote.success, true);
assert.equal(quote.routes[0]?.quoteId, "q1");
assert.equal(quote.routes[0]?.priceImpact, "0.4");
assert.equal(quote.routes[0]?.priceImpactUnit, "percent");
assert.equal(quote.routes[0]?.approvalTarget, approvalSpender);
assert.match(quote.warnings.join(" "), /minToTokenAmount/);
const rfqQuote = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q-rfq", executionMode: "RFQ", toTokenAmount: "10" }] });
assert.equal(rfqQuote.platformMode, "rfq");
const standardQuote = normalizeQuote({ ...asset, platformId: "regular" }, { code: 0, success: true, data: [{ quoteId: "q-swap", executionMode: "SWAP", toTokenAmount: "10" }] });
assert.equal(standardQuote.platformMode, "standard");
const rfqService = new TokenizedStocksService({} as any);
const rfqSigning = rfqService.prepareRfqSigningRequest({ kind: "rfq_order", chainId: "56", quoteId: "q-rfq", payload: { rfq: { orderId: "order-1", vendor: "PcsXRfq", signingScheme: "EIP712", typedDataToSign: "0x1901" } } });
assert.deepEqual(rfqSigning, { quoteId: "q-rfq", orderId: "order-1", vendor: "PcsXRfq", signingScheme: "EIP712", typedDataToSign: "0x1901" });

const missingSimulationStatus = normalizeSimulation({ code: 0, success: true, data: { balanceChanges: [], allowanceChanges: [] } });
assert.equal(missingSimulationStatus.success, false, "a successful HTTP/API envelope without a simulation status is not proof of simulation success");
assert.match(missingSimulationStatus.warnings.join(" "), /explicit successful status/);
const simulation = normalizeSimulation({ code: 0, success: true, data: { status: "SUCCESS", balanceChanges: [], allowanceChanges: [] } });
assert.equal(simulation.success, true);
const walletFundsSimulation = normalizeSimulation({ code: 0, success: true, data: { status: "FAILED", failReason: "BEP20: transfer amount exceeds balance", balanceChanges: [], allowanceChanges: [] } });
assert.equal(walletFundsSimulation.success, false, "a provider funds failure is not mislabeled as a successful simulation");
assert.equal(walletFundsSimulation.walletFundsOnlyFailure, true, "the wallet alone decides whether the request has enough token funds");
assert.equal(normalizeSimulation({ code: 0, success: true, data: { status: "FAILED", failReason: "insufficient funds for gas; invalid opcode" } }).walletFundsOnlyFailure, undefined, "a composite or ambiguous simulation error remains blocking");
assert.equal(normalizeSimulation({ code: 0, success: true, data: { status: "FAILED", failReason: "execution reverted: insufficient funds for gas * price + value" } }).walletFundsOnlyFailure, true, "a standard explicit gas-funds error may proceed as a wallet warning");
assert.equal(normalizeSimulation({ code: 0, success: true, data: { status: "FAILED", failReason: "BEP20: transfer amount exceeds allowance" } }).walletFundsOnlyFailure, undefined, "authorization failures remain separate from wallet funds warnings");
assert.equal(normalizeSimulation({ code: 0, success: true, data: { status: "UNKNOWN", balanceChanges: [], allowanceChanges: [] } }).success, false);
assert.equal(normalizeSimulation({ code: 0, success: true, data: { status: "FAILED", balanceChanges: [], allowanceChanges: [] } }).success, false);

const plan = { planId: "p1", status: "awaiting_confirmation" as const, intent: {
  type: "buy" as const, walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1", amountDecimals: 18
}, requiresUserConfirmation: true };
const safety = evaluateSafety({ plan, market, quote, simulation, allowance: 10n ** 18n, requiredAllowance: 1n * (10n ** 18n) });
assert.equal(safety.passed, true);
assert.equal(safety.checks.find((check) => check.name === "input_balance")?.severity, "info");
assert.equal(safety.checks.find((check) => check.name === "input_balance")?.passed, true);
const quoteWithoutSpender = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q-no-spender", toTokenAmount: "10", priceImpactPercent: "0.1" }] });
const missingSpenderSafety = evaluateSafety({ plan, quote: quoteWithoutSpender, allowance: 10n ** 18n, requiredAllowance: 10n ** 18n });
assert.equal(missingSpenderSafety.checks.find((check) => check.name === "authorization_visibility")?.passed, false, "missing spender metadata must fail closed for ERC-20 input");
assert.match(missingSpenderSafety.blockingReasons.join(" "), /spender.*cannot be verified/i);
assert.equal(evaluateSafety({ plan, market, quote, simulation, allowance: 10n ** 18n, requiredAllowance: 10n ** 18n }).checks.find((check) => check.name === "input_balance")?.passed, true);
const unverifiedImpact = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q2", priceImpact: "0.04" }] });
assert.equal(unverifiedImpact.routes[0]?.priceImpactUnit, "unknown");
assert.equal(evaluateSafety({ plan, market, quote: unverifiedImpact }).passed, false);
const missingImpact = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q3" }] });
assert.equal(evaluateSafety({ plan, market, quote: missingImpact }).passed, false);
const excessiveImpact = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q4", priceImpactPercent: "5.1" }] });
assert.equal(evaluateSafety({ plan, market, quote: excessiveImpact }).passed, false);
const insufficientAllowance = evaluateSafety({ plan, market, quote, allowance: 0n, requiredAllowance: 10n ** 18n });
assert.equal(insufficientAllowance.passed, true, "a visible spender with insufficient allowance routes to a separate approval step");
const closedMarket = normalizeMarketContext(asset, {
  tokenPrice: "0.3",
  tokenPriceUpdatedAt: 1,
  statusInfo: { marketStatus: "halted", openState: false }
});
const closedSafety = evaluateSafety({ plan, market: closedMarket, quote, simulation });
assert.equal(closedSafety.passed, false);
assert.match(closedSafety.blockingReasons.join(" "), /closed|halted/);
const invalidTimestampSafety = evaluateSafety({ plan, market: { ...market, tokenPriceUpdatedAt: 1.5 }, quote, simulation });
assert.equal(invalidTimestampSafety.checks.find((check) => check.name === "market_data_freshness")?.passed, false);
const invalidSlippage = evaluateSafety({ plan: { ...plan, intent: { ...plan.intent, maxSlippageBps: 10_001 } }, market, quote, simulation });
assert.equal(invalidSlippage.passed, false);
assert.equal(attachSimulation(plan, simulation).status, "failed", "simulation cannot erase missing preflight checks");
assert.equal(attachSimulation({ ...plan, safetyReport: insufficientAllowance }, simulation).status, "simulated", "a separate approval requirement does not hide the quote-backed swap plan");
const preparedPlan = { ...plan, safetyReport: safety, assetContext: market };
const simulatedPlan = attachSimulation(preparedPlan, simulation);
assert.equal(simulatedPlan.status, "simulated");
assert.equal(simulatedPlan.safetyReport?.checks.find((check) => check.name === "authorization_visibility")?.passed, true);
assert.equal(simulatedPlan.safetyReport?.checks.find((check) => check.name === "price_impact")?.passed, true);
const walletReviewPlan = attachSimulation(preparedPlan, walletFundsSimulation);
assert.equal(walletReviewPlan.status, "wallet_review", "a provider-only funds failure stays explicit but does not prevent the wallet from reviewing the request");
assert.equal((walletReviewPlan.simulation as any).success, false, "the funds warning never marks the provider simulation as passed");
const walletReviewConfirmation = confirmPlan(walletReviewPlan);
assert.equal(walletReviewConfirmation.status, "confirmed");
assert.doesNotThrow(() => assertExecutable(walletReviewConfirmation));
assert.throws(() => assertExecutable(simulatedPlan), /confirmation/);
const confirmedPlan = confirmPlan(simulatedPlan);
assert.equal(confirmedPlan.status, "confirmed");
assert.doesNotThrow(() => assertExecutable(confirmedPlan));
assert.throws(() => assertExecutable({ ...confirmedPlan, safetyReport: { passed: true, checks: [], blockingReasons: [] } }), /incomplete safety report/);
assert.throws(() => confirmPlan(confirmedPlan), /transaction checks or carry an explicit wallet-only funds warning/);
const failedSimulationPlan = attachSimulation(preparedPlan, { ...simulation, success: false, warnings: ["failed"] });
assert.equal(failedSimulationPlan.status, "failed");
assert.throws(() => confirmPlan(failedSimulationPlan), /transaction checks or carry an explicit wallet-only funds warning/);
assert.equal(attachSimulation(confirmedPlan, simulation).status, "failed");
assert.equal(isPlanExpired({ ...confirmedPlan, expiresAt: 1 }, 2), true);
assert.throws(() => confirmPlan({ ...simulatedPlan, expiresAt: 1 }, 2), /expired/);
const executable = { ...confirmedPlan, unsignedActions: [{ kind: "evm_transaction" }] };
const executor = new ExecutionService(async (action) => ({ action, signature: "test-signature" }));
const signed = await executor.signConfirmed(executable);
assert.equal(signed.length, 1);
await assert.rejects(() => executor.broadcastConfirmed(executable), /Broadcasting is disabled/);
await assert.rejects(() => new ExecutionService(async (action) => ({ action, signature: "sig" })).broadcastConfirmed(executable), /Broadcasting is disabled/);
let broadcastCalls = 0;
const failingExecutor = new ExecutionService(
  async (action) => ({ action, signature: "stable-signature" }),
  async () => { broadcastCalls += 1; throw new Error("broadcast timeout; status must be queried"); }
);
const signedOnce = await failingExecutor.signConfirmed(executable);
await assert.rejects(() => failingExecutor.broadcastSignedActions(signedOnce, executable), /status must be queried/);
assert.equal(broadcastCalls, 1);
console.log(JSON.stringify({ unknownCategoryWithTrueOpenStateRetainsWarningAndPreparesConfirmationPlan: true, invalidCatalogAndPriceSnapshotTimestampsWithheld: true, malformedAuditTimesNotCountedAsValid: true, invalidSafetyTimestampNotReportedFresh: true, passed: true }, null, 2));
