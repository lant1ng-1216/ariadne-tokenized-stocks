import assert from "node:assert/strict";
import { AmbiguousAssetQueryError, explicitlyRequestsNoTrade, searchAssetIntent } from "../src/services/asset-intent-query.js";
import { BinanceWeb3Error } from "../src/errors.js";
import type { StockAsset, TokenizedStockListing } from "../src/domain/types.js";

const asset = (ticker: string, name: string): StockAsset => ({
  assetId: `56:${ticker}`,
  chainId: "56",
  platformId: "ondo",
  contractAddress: "0x0000000000000000000000000000000000000001",
  tokenSymbol: `${ticker}on`,
  underlyingTicker: ticker,
  underlyingName: name,
});
const catalog = [
  { ...asset("NVDA", "Nvidia Corp"), underlyingNameZh: "英伟达" },
  { ...asset("TSLA", "Tesla Inc"), underlyingNameZh: "特斯拉" },
] as TokenizedStockListing[];
assert.equal(explicitlyRequestsNoTrade("不要交易"), true);
assert.equal(explicitlyRequestsNoTrade("Do not trade; research only"), true);
assert.equal(explicitlyRequestsNoTrade("Compare Nvidia representations"), false);
let listCalls = 0;
const source = {
  async search(query: string) {
    return query === "NVDA" ? [catalog[0]] : query === "TSLA" ? [catalog[1]] : [];
  },
  async list() {
    listCalls += 1;
    return catalog;
  },
};

const direct = await searchAssetIntent(source, "NVDA", { chainId: "56" });
assert.equal(direct.resolvedQuery, "NVDA");
assert.equal(listCalls, 0, "a ticker query does not need catalog fallback");
assert.deepEqual(direct.diagnostics.calls, { directSearch: 1, catalogRead: 0, resolvedSearch: 0 });
assert.ok(Number.isFinite(direct.diagnostics.durationsMs.directSearch) && direct.diagnostics.durationsMs.directSearch >= 0);
const chinese = await searchAssetIntent(source, "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，比较价格和数据缺口；不要交易。", { chainId: "56" });
assert.equal(chinese.resolvedQuery, "NVDA");
assert.equal(chinese.assets.length, 1);
assert.deepEqual(chinese.diagnostics.calls, { directSearch: 1, catalogRead: 1, resolvedSearch: 1 });
assert.ok(Object.values(chinese.diagnostics.durationsMs).every((duration) => Number.isFinite(duration) && duration >= 0));
const liveNoMatch = await searchAssetIntent({
  ...source,
  async search(query: string) {
    if (query !== "NVDA") throw new BinanceWeb3Error(`Binance Web3 API 200: No matching RWA assets found for keyword: ${query}`, 200, 200, false);
    return [catalog[0]];
  },
}, "我想了解 BNB Chain 上英伟达股票代币有哪些发行方版本，不要交易。", { chainId: "56" });
assert.equal(liveNoMatch.resolvedQuery, "NVDA");
await assert.rejects(searchAssetIntent({
  ...source,
  async search() { throw new BinanceWeb3Error("upstream unavailable", 503, 503, true); },
}, "英伟达", { chainId: "56" }), /upstream unavailable/);
const english = await searchAssetIntent(source, "Compare Nvidia stock wrappers without trading", { chainId: "56" });
assert.equal(english.resolvedQuery, "NVDA");
await assert.rejects(searchAssetIntent(source, "比较 NVDA 和 TSLA", { chainId: "56" }), AmbiguousAssetQueryError);
const partialCompoundSource = {
  async search(query: string) {
    if (query === "Compare NVDA and TSLA" || query === "NVDA and TSLA" || query === "英伟达和特斯拉") return [catalog[0]];
    return source.search(query);
  },
  async list() { return catalog; }
};
const oneTickerCompound = await searchAssetIntent({
  async search(query: string) { return query.startsWith("Compare NVDA") ? [catalog[0]] : source.search(query); },
  async list() { return catalog; }
}, "Compare NVDA representations", { chainId: "56" });
assert.deepEqual(oneTickerCompound.diagnostics.calls, { directSearch: 1, catalogRead: 1, resolvedSearch: 0 }, "compound-query verification is counted separately from a resolved follow-up search");
await assert.rejects(
  searchAssetIntent(partialCompoundSource, "Compare NVDA and TSLA", { chainId: "56" }),
  (error: unknown) => error instanceof AmbiguousAssetQueryError && error.tickers.includes("NVDA") && error.tickers.includes("TSLA"),
  "a partial direct hit must not hide a second underlying ticker in a compound prompt"
);
await assert.rejects(
  searchAssetIntent(partialCompoundSource, "英伟达和特斯拉", { chainId: "56" }),
  (error: unknown) => error instanceof AmbiguousAssetQueryError && error.tickers.includes("NVDA") && error.tickers.includes("TSLA"),
  "Chinese entity joiners must also trigger disambiguation after a partial API hit"
);
await assert.rejects(
  searchAssetIntent(partialCompoundSource, "NVDA and TSLA", { chainId: "56" }),
  (error: unknown) => error instanceof AmbiguousAssetQueryError && error.tickers.includes("NVDA") && error.tickers.includes("TSLA"),
  "the bare English 'and' joiner must trigger disambiguation after a partial API hit"
);
const missing = await searchAssetIntent(source, "比较一种不在目录中的股票", { chainId: "56" });
assert.equal(missing.assets.length, 0);
console.log(JSON.stringify({ direct: true, chineseSentence: true, noTradeIntent: true, liveNoMatch: true, upstreamFailurePreserved: true, englishSentence: true, ambiguousRejected: true, partialCompoundHitRejected: true, englishAndJoinerRejected: true, unknownEmpty: true, passed: true }, null, 2));
