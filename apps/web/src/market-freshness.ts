export type FreshnessState = "fresh" | "stale" | "invalid" | "unknown";

export const QUOTE_STALE_AFTER_MS = 5 * 60 * 1_000;
export const CANDLE_INTERVAL_MS: Record<string, number> = {
  "1m": 60 * 1_000,
  "5m": 5 * 60 * 1_000,
  "15m": 15 * 60 * 1_000,
  "1h": 60 * 60 * 1_000,
  "1d": 24 * 60 * 60 * 1_000
};
const MAX_FUTURE_CLOCK_SKEW_MS = 60 * 1_000;

export function assessTimestampFreshness(
  timestampMs: number | null | undefined,
  nowMs: number,
  staleAfterMs: number
): FreshnessState {
  if (!Number.isFinite(timestampMs) || !timestampMs || timestampMs <= 0 || !Number.isFinite(nowMs) || staleAfterMs <= 0) return "unknown";
  const ageMs = nowMs - timestampMs;
  if (ageMs < -MAX_FUTURE_CLOCK_SKEW_MS) return "invalid";
  return ageMs > staleAfterMs ? "stale" : "fresh";
}

export function candleFreshness(timestampMs: number | null | undefined, bar: string, nowMs: number): FreshnessState {
  const interval = CANDLE_INTERVAL_MS[bar];
  return interval ? assessTimestampFreshness(timestampMs, nowMs, interval * 2) : "unknown";
}

export type MarketStatusGroup = "open" | "closed" | "offhours" | "unknown";
export type RepresentationIdentity = { chainId: string; platformId: string; contractAddress: string };

export function sameRepresentation(left?: RepresentationIdentity | null, right?: RepresentationIdentity | null): boolean {
  return Boolean(left && right && left.chainId === right.chainId &&
    left.platformId.toLowerCase() === right.platformId.toLowerCase() &&
    left.contractAddress.toLowerCase() === right.contractAddress.toLowerCase());
}

export function refreshFailureState(snapshotIdentity: string | undefined, activeIdentity: string): "stale" | "unavailable" {
  return snapshotIdentity && snapshotIdentity === activeIdentity ? "stale" : "unavailable";
}

export function stateForIdentity<T>(stateIdentity: string | undefined, activeIdentity: string, state: T, fallback: T): T {
  return stateIdentity === activeIdentity ? state : fallback;
}

export function marketStatusGroup(status?: string | null): MarketStatusGroup {
  switch (status?.trim().toLowerCase()) {
    case "open":
    case "regular":
      return "open";
    case "closed":
    case "paused":
    case "halted":
      return "closed";
    case "offhours":
    case "preopen":
    case "afterhours":
      return "offhours";
    default:
      return "unknown";
  }
}

export function candleDisplayState(
  sourceState: string,
  timestampMs: number | null | undefined,
  bar: string,
  nowMs: number
): "ready" | "stale" | "invalid" | "empty" | "unavailable" {
  if (sourceState !== "ready") return sourceState === "empty" ? "empty" : "unavailable";
  const freshness = candleFreshness(timestampMs, bar, nowMs);
  if (freshness === "fresh") return "ready";
  if (freshness === "stale") return "stale";
  return "invalid";
}

export function formatUtcTimestamp(timestampMs: number, locale = "en-US"): string {
  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC"
  }).format(timestampMs)} UTC`;
}

export function candleTimestampLabels(
  lastBarTimestampMs: number | null | undefined,
  providerResponseTimestampMs: number | null | undefined,
  locale = "en-US"
): { lastBarUtc?: string; providerResponseUtc?: string } {
  return {
    lastBarUtc: Number.isFinite(lastBarTimestampMs) && lastBarTimestampMs! > 0
      ? formatUtcTimestamp(lastBarTimestampMs!, locale)
      : undefined,
    providerResponseUtc: Number.isFinite(providerResponseTimestampMs) && providerResponseTimestampMs! > 0
      ? formatUtcTimestamp(providerResponseTimestampMs!, locale)
      : undefined
  };
}
