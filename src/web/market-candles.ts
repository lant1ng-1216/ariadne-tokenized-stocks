export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades?: number;
};

// Binance Web3 Market API rows: [open, high, low, close, volume, timestampMs, trades].
// Ignore malformed rows rather than drawing a misleading chart.
export function normalizeMarketCandles(rows: unknown[]): MarketCandle[] {
  const byTime = new Map<number, MarketCandle>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const [open, high, low, close, volume, time, trades] = row.map(Number);
    if (![open, high, low, close, volume, time].every(Number.isFinite)) continue;
    if (open <= 0 || close <= 0 || low <= 0 || volume < 0 || time < 1_000_000_000_000) continue;
    if (high < Math.max(open, close) || low > Math.min(open, close)) continue;
    byTime.set(time, { time, open, high, low, close, volume, ...(Number.isFinite(trades) ? { trades } : {}) });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
