export type TimestampedQuote = {
  state: "available" | "missing" | "ambiguous" | "invalid" | "unavailable";
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};

type MarketPriceFields = {
  tokenPrice?: string;
  referencePrice?: string;
  priceGapPercent?: string;
  tokenPriceUpdatedAt?: number;
};

function positiveNumber(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function hasTimestampedQuote(quote?: TimestampedQuote): quote is TimestampedQuote & {
  tokenPrice: string;
  tokenPriceUpdatedAt: number;
} {
  return quote?.state === "available" &&
    positiveNumber(quote.tokenPrice) !== undefined &&
    typeof quote.tokenPriceUpdatedAt === "number" &&
    Number.isFinite(quote.tokenPriceUpdatedAt) &&
    quote.tokenPriceUpdatedAt > 0;
}

export function marketForQuoteDisplay<T extends MarketPriceFields>(
  directoryMarket: T | undefined,
  quote: TimestampedQuote | undefined,
  liveReadOnly: boolean
): (T & { tokenPriceUpdatedAt?: number }) | undefined {
  if (!liveReadOnly) return directoryMarket;
  const base = directoryMarket ?? {} as T;
  if (!hasTimestampedQuote(quote)) {
    return directoryMarket ? {
      ...base,
      tokenPrice: undefined,
      referencePrice: undefined,
      priceGapPercent: undefined,
      tokenPriceUpdatedAt: undefined
    } : undefined;
  }

  const tokenPrice = positiveNumber(quote.tokenPrice)!;
  const referencePrice = positiveNumber(quote.referencePrice);
  return {
    ...base,
    tokenPrice: quote.tokenPrice,
    referencePrice: referencePrice === undefined ? undefined : quote.referencePrice,
    priceGapPercent: referencePrice === undefined
      ? undefined
      : `${(((tokenPrice - referencePrice) / referencePrice) * 100).toFixed(4)}%`,
    tokenPriceUpdatedAt: quote.tokenPriceUpdatedAt
  };
}

export function timestampedQuoteCount(quotes: Array<TimestampedQuote | undefined>): number {
  return quotes.filter(hasTimestampedQuote).length;
}
