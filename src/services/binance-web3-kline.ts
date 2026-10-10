import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { ExternalWalletCandle, ExternalWalletCandleInterval } from "./wallet-handoff-relay.js";

export type BscStockIdentity = { chainId: "56"; platformId: string; contractAddress: string };

export async function fetchBinanceWeb3Klines(
  identity: BscStockIdentity,
  interval: ExternalWalletCandleInterval,
  limit: number,
  options: { proxyUrl?: string; fetcher?: typeof undiciFetch; timeoutMs?: number } = {}
): Promise<ExternalWalletCandle[]> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(identity.contractAddress)) throw new Error("The Binance Web3 K-line request needs an exact BSC token contract");
  if (!Number.isInteger(limit) || limit < 20 || limit > 300) throw new Error("The Binance Web3 K-line request limit must be between 20 and 300");
  const query = new URLSearchParams({
    chainId: identity.chainId,
    contractAddress: identity.contractAddress,
    interval,
    limit: String(limit)
  });
  const fetcher = options.fetcher ?? undiciFetch;
  const response = await fetcher(`https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/kline/ai?${query}`, {
    headers: { "Accept-Encoding": "identity", "User-Agent": "binance-web3/1.1 (Skill)" },
    signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
    ...(options.proxyUrl ? { dispatcher: new ProxyAgent(options.proxyUrl) } : {})
  });
  if (!response.ok) throw new Error(`Binance Web3 K-line request failed with HTTP ${response.status}`);
  const payload = await response.json() as { success?: unknown; code?: unknown; data?: { klineInfos?: unknown } };
  if (payload.success !== true || payload.code !== "000000" || !Array.isArray(payload.data?.klineInfos)) {
    throw new Error("Binance Web3 returned no supported K-line data for this BSC token");
  }
  const candles: ExternalWalletCandle[] = [];
  for (const row of payload.data.klineInfos) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const openTime = Number(row[0]);
    const [open, high, low, close, volume] = row.slice(1, 6).map(Number);
    if (!Number.isSafeInteger(openTime) || openTime <= 0 || ![open, high, low, close, volume].every(Number.isFinite)) continue;
    if ([open, high, low, close].some((price) => price! <= 0) || volume! < 0 || high! < Math.max(open!, close!, low!) || low! > Math.min(open!, close!, high!)) continue;
    candles.push({ time: Math.floor(openTime / 1_000), open: open!, high: high!, low: low!, close: close!, volume: volume! });
  }
  return candles.sort((left, right) => left.time - right.time)
    .filter((candle, index, rows) => index === 0 || candle.time > rows[index - 1]!.time)
    .slice(-limit);
}
