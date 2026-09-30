import assert from "node:assert/strict";
import { assessTimestampFreshness, candleDisplayState, candleFreshness, candleTimestampLabels, CANDLE_INTERVAL_MS, formatUtcTimestamp, marketStatusGroup, QUOTE_STALE_AFTER_MS, refreshFailureState, sameRepresentation, stateForIdentity } from "../src/market-freshness.js";

const now = 1_790_603_000_000;
assert.equal(assessTimestampFreshness(now, now, QUOTE_STALE_AFTER_MS), "fresh");
assert.equal(assessTimestampFreshness(now - QUOTE_STALE_AFTER_MS, now, QUOTE_STALE_AFTER_MS), "fresh");
assert.equal(assessTimestampFreshness(now - QUOTE_STALE_AFTER_MS - 1, now, QUOTE_STALE_AFTER_MS), "stale");
assert.equal(assessTimestampFreshness(now + 60_000, now, QUOTE_STALE_AFTER_MS), "fresh", "small source/local clock skew is tolerated");
assert.equal(assessTimestampFreshness(now + 60_001, now, QUOTE_STALE_AFTER_MS), "invalid", "far-future provider timestamps are rejected");
assert.equal(assessTimestampFreshness(undefined, now, QUOTE_STALE_AFTER_MS), "unknown");
assert.equal(candleFreshness(now - CANDLE_INTERVAL_MS["5m"]! * 2, "5m", now), "fresh");
assert.equal(candleFreshness(now - CANDLE_INTERVAL_MS["5m"]! * 2 - 1, "5m", now), "stale");
assert.equal(candleFreshness(now, "unsupported", now), "unknown");
assert.equal(candleDisplayState("ready", now, "5m", now), "ready");
assert.equal(candleDisplayState("ready", now - CANDLE_INTERVAL_MS["5m"]! * 2 - 1, "5m", now), "stale");
assert.equal(candleDisplayState("ready", null, "5m", now), "invalid");
assert.equal(candleDisplayState("empty", null, "5m", now), "empty");
assert.equal(candleDisplayState("unavailable", null, "5m", now), "unavailable");
for (const status of ["open", "regular"]) assert.equal(marketStatusGroup(status), "open");
for (const status of ["closed", "paused", "halted"]) assert.equal(marketStatusGroup(status), "closed");
for (const status of ["offhours", "preopen", "afterhours"]) assert.equal(marketStatusGroup(status), "offhours");
assert.equal(marketStatusGroup(undefined), "unknown");
const selected = { chainId: "56", platformId: "bStock", contractAddress: "0xAbC" };
assert.equal(sameRepresentation(selected, { chainId: "56", platformId: "bstock", contractAddress: "0xabc" }), true);
assert.equal(sameRepresentation(selected, { chainId: "56", platformId: "ondo", contractAddress: "0xabc" }), false);
assert.equal(sameRepresentation(selected, { chainId: "1", platformId: "bstock", contractAddress: "0xabc" }), false);
assert.equal(refreshFailureState("56:bstock:0xabc", "56:bstock:0xabc"), "stale", "a failed refresh retains only the same representation snapshot as stale");
assert.equal(refreshFailureState("56:ondo:0xabc", "56:bstock:0xabc"), "unavailable", "a representation switch never reuses the previous issuer snapshot");
assert.equal(refreshFailureState(undefined, "56:bstock:0xabc"), "unavailable");
assert.equal(stateForIdentity("56:ondo:0xabc", "56:bstock:0xabc", "fresh", "loading"), "loading", "prior issuer status is hidden while the selected issuer loads");
assert.equal(stateForIdentity("56:bstock:0xabc/5m", "56:bstock:0xabc/1h", "ready", "loading"), "loading", "prior interval chart is hidden while the new interval loads");
assert.match(formatUtcTimestamp(now), /UTC$/);
const candleTimes = candleTimestampLabels(now, null, "en-US");
assert.equal(candleTimes.lastBarUtc, formatUtcTimestamp(now, "en-US"));
assert.equal(candleTimes.providerResponseUtc, undefined, "an absent provider response time stays absent rather than using the local clock");
const separateCandleTimes = candleTimestampLabels(now - 60_000, now, "en-US");
assert.notEqual(separateCandleTimes.lastBarUtc, separateCandleTimes.providerResponseUtc, "bar time and provider response time remain separate values");

console.log(JSON.stringify({
  quoteStaleAfterMs: QUOTE_STALE_AFTER_MS,
  candleAgingRule: "stale after two selected bar intervals",
  marketStatesCovered: ["regular/open", "closed/paused/halted", "offhours/preopen/afterhours", "unknown"],
  refreshRetainsOnlySameIdentity: true,
  priorRepresentationAndIntervalHiddenDuringRefresh: true,
  futureTimestampRejected: true,
  utcFormatting: true,
  passed: true
}, null, 2));
