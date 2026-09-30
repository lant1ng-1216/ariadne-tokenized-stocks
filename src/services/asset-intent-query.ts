import type { StockAsset, TokenizedStockListing } from "../domain/types.js";
import { BinanceWeb3Error } from "../errors.js";
import type { AssetSearchOptions, TokenizedStocksService } from "./tokenized-stocks.js";
import { performance } from "node:perf_hooks";

type SearchSource = Pick<TokenizedStocksService, "search" | "list">;

export type AssetIntentDiagnostics = {
  durationsMs: { directSearch: number; catalogRead: number; catalogMatch: number; resolvedSearch: number };
  calls: { directSearch: number; catalogRead: number; resolvedSearch: number };
};

const elapsedMs = (startedAt: number) => Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100);

export function explicitlyRequestsNoTrade(query: string): boolean {
  return /不要交易|不进行交易|不下单|暂不交易|\b(?:do not|don't) trade\b|\bwithout trading\b|\bresearch only\b/i.test(query);
}

export class AmbiguousAssetQueryError extends Error {
  constructor(readonly tickers: string[]) {
    super(`Multiple underlying assets match this request (${tickers.join(", ")}). Specify one ticker or company.`);
    this.name = "AmbiguousAssetQueryError";
  }
}

export async function searchAssetIntent(
  source: SearchSource,
  query: string,
  options: AssetSearchOptions = {},
): Promise<{ assets: StockAsset[]; resolvedQuery: string; diagnostics: AssetIntentDiagnostics }> {
  const trimmed = query.trim();
  const diagnostics: AssetIntentDiagnostics = {
    durationsMs: { directSearch: 0, catalogRead: 0, catalogMatch: 0, resolvedSearch: 0 },
    calls: { directSearch: 0, catalogRead: 0, resolvedSearch: 0 }
  };
  let direct: StockAsset[];
  diagnostics.calls.directSearch += 1;
  const directSearchStartedAt = performance.now();
  try {
    direct = await source.search(trimmed, options);
  } catch (error) {
    // The live API reports a no-match search as a business error rather than [].
    // Preserve every other upstream failure instead of disguising it as an empty result.
    if (!(error instanceof BinanceWeb3Error && error.status === 200 && /No matching RWA assets found for keyword:/i.test(error.message))) throw error;
    direct = [];
  } finally {
    diagnostics.durationsMs.directSearch = elapsedMs(directSearchStartedAt);
  }
  const directTickers = [...new Set(direct.map((asset) => asset.underlyingTicker).filter(Boolean))];
  if (directTickers.length > 1) throw new AmbiguousAssetQueryError(directTickers);

  // Entity-level search can return a partial hit for a compound prompt. Only make
  // the extra catalog read when the wording suggests multiple entities, preserving
  // the fast path for an ordinary ticker/company lookup.
  const verifyPossibleCompoundRequest = /\b(?:compare|between|both|versus|vs\.?|against|and|or)\b|比较|对比|和|与|及|以及|分别/i.test(trimmed);
  if (direct.length > 0 && !verifyPossibleCompoundRequest) return { assets: direct, resolvedQuery: trimmed, diagnostics };

  // A calling Agent may pass the user's entire sentence instead of an entity.
  // Resolve only an unambiguous catalog identity; never guess between issuers or tickers.
  diagnostics.calls.catalogRead += 1;
  const catalogStartedAt = performance.now();
  const catalog = await source.list(options);
  diagnostics.durationsMs.catalogRead = elapsedMs(catalogStartedAt);
  const catalogMatchStartedAt = performance.now();
  const matchedTickers = [...new Set(catalog.filter((item) => matchesIdentity(trimmed, item)).map((item) => item.underlyingTicker))];
  diagnostics.durationsMs.catalogMatch = elapsedMs(catalogMatchStartedAt);
  if (matchedTickers.length > 1) throw new AmbiguousAssetQueryError(matchedTickers);
  if (direct.length > 0) return { assets: direct, resolvedQuery: trimmed, diagnostics };
  if (matchedTickers.length === 0) return { assets: [], resolvedQuery: trimmed, diagnostics };
  const resolvedQuery = matchedTickers[0];
  diagnostics.calls.resolvedSearch += 1;
  const resolvedSearchStartedAt = performance.now();
  const assets = await source.search(resolvedQuery, options);
  diagnostics.durationsMs.resolvedSearch = elapsedMs(resolvedSearchStartedAt);
  return { assets, resolvedQuery, diagnostics };
}

function matchesIdentity(request: string, item: TokenizedStockListing): boolean {
  const text = request.toLocaleLowerCase();
  const ticker = item.underlyingTicker.trim();
  if (ticker.length >= 3 && new RegExp(`(^|[^a-z0-9])${escapeRegExp(ticker)}(?=$|[^a-z0-9])`, "i").test(request)) return true;

  const names = [item.underlyingNameZh, item.underlyingName, item.underlyingName.split(/[\s,.]+/)[0]];
  return names.some((name) => {
    const label = name?.trim().toLocaleLowerCase();
    if (!label || label.length < (/[\p{Script=Han}]/u.test(label) ? 2 : 5)) return false;
    if (/[\p{Script=Han}]/u.test(label)) return text.includes(label);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(label)}(?=$|[^a-z0-9])`, "i").test(request);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
