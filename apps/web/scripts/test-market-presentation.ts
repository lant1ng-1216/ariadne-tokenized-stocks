import assert from "node:assert/strict";
import { hasTimestampedQuote, marketForQuoteDisplay, timestampedQuoteCount } from "../src/market-presentation.js";

async function main(): Promise<void> {
  const directoryMarket = {
    tokenPrice: "10",
    referencePrice: "9",
    priceGapPercent: "11.1111%",
    volume24H: "5000",
    marketCap: "100000"
  };
  const availableWithReference = {
    state: "available" as const,
    tokenPrice: "12",
    referencePrice: "10",
    tokenPriceUpdatedAt: 1_790_603_000_000
  };
  const refreshed = marketForQuoteDisplay(directoryMarket, availableWithReference, true);
  assert.equal(refreshed?.tokenPrice, "12");
  assert.equal(refreshed?.referencePrice, "10");
  assert.equal(refreshed?.priceGapPercent, "20.0000%");
  assert.equal(refreshed?.volume24H, "5000", "non-quote directory context remains available");
  assert.equal(refreshed?.tokenPriceUpdatedAt, availableWithReference.tokenPriceUpdatedAt);

  const quoteWithoutDirectoryContext = marketForQuoteDisplay(undefined, availableWithReference, true);
  assert.equal(quoteWithoutDirectoryContext?.tokenPrice, "12", "a valid quote remains displayable if directory context is absent");

  const availableWithoutReference = marketForQuoteDisplay(directoryMarket, {
    ...availableWithReference,
    referencePrice: undefined
  }, true);
  assert.equal(availableWithoutReference?.tokenPrice, "12");
  assert.equal(availableWithoutReference?.referencePrice, undefined, "fresh token prices never inherit a stale directory reference price");
  assert.equal(availableWithoutReference?.priceGapPercent, undefined, "a gap is not calculated across quote sources or snapshots");

  const missing = marketForQuoteDisplay(directoryMarket, { state: "missing" }, true);
  assert.equal(missing?.tokenPrice, undefined, "an unverified live price is not replaced by an untimestamped directory value");
  assert.equal(missing?.referencePrice, undefined);
  assert.equal(missing?.priceGapPercent, undefined);
  assert.equal(missing?.volume24H, "5000");
  assert.equal(missing?.tokenPriceUpdatedAt, undefined, "old per-token timestamps are not retained when quote identity is unverified");

  const demo = marketForQuoteDisplay(directoryMarket, undefined, false);
  assert.equal(demo?.tokenPrice, "10", "demo mode continues to use its labeled demo snapshot");

  const partialGroup = [availableWithReference, { state: "unavailable" as const }];
  assert.equal(timestampedQuoteCount(partialGroup), 1, "group coverage counts only representations with a valid price and timestamp");
  assert.equal(hasTimestampedQuote({ ...availableWithReference, tokenPriceUpdatedAt: Number.NaN }), false);
  assert.equal(hasTimestampedQuote({ ...availableWithReference, tokenPrice: "0" }), false);

  console.log(JSON.stringify({
    partialGroupCoverage: `${timestampedQuoteCount(partialGroup)}/${partialGroup.length}`,
    stalePriceFallbackBlocked: missing?.tokenPrice === undefined,
    crossSnapshotReferenceGapBlocked: availableWithoutReference?.priceGapPercent === undefined,
    nonQuoteContextPreserved: refreshed?.volume24H === "5000",
    passed: true
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
