import type { StockAsset, WalletHolding } from "../domain/types.js";

export type WalletExposureHolding = {
  id: string;
  status: "matched" | "unmatched";
  chainId: string;
  contractAddress: string;
  symbol: string;
  balance: string;
  tokenPrice?: string;
  estimatedValue?: string;
  asset?: {
    issuer: string;
    tokenSymbol: string;
    ticker: string;
    name: string;
    contractAddress: string;
  };
  warnings: string[];
};

export type WalletExposureView = {
  kind: "wallet_exposure";
  state: "empty" | "partial" | "unmatched" | "ready";
  walletAddress: string;
  query: string;
  chainId: string;
  summary: {
    holdingsFound: number;
    matchedTokenizedStocks: number;
    unmatchedHoldings: number;
    pricedHoldings: number;
  };
  holdings: WalletExposureHolding[];
  warnings: string[];
  boundary: {
    sideEffects: "none";
    privateKeyRequested: false;
    signatureRequested: false;
    broadcastAttempted: false;
  };
};

function unique(values: string[]): string[] {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function estimatedValue(balance: string, tokenPrice?: string): string | undefined {
  if (!tokenPrice) return undefined;
  const numericBalance = Number(balance);
  const numericPrice = Number(tokenPrice);
  if (!Number.isFinite(numericBalance) || !Number.isFinite(numericPrice)) return undefined;
  return (numericBalance * numericPrice).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function buildWalletExposureView(
  walletAddress: string,
  chainId: string,
  query: string,
  holdings: WalletHolding[],
  assets: StockAsset[],
): WalletExposureView {
  const rows = holdings.map((holding): WalletExposureHolding => {
    const asset = assets.find((candidate) => candidate.chainId === holding.chainId && candidate.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase());
    const warnings = unique([
      ...holding.warnings,
      ...(asset ? [] : ["This holding was not matched to the current tokenized-stock directory."]),
    ]);
    return {
      id: `${holding.chainId}:${holding.contractAddress.toLowerCase()}`,
      status: asset ? "matched" : "unmatched",
      chainId: holding.chainId,
      contractAddress: holding.contractAddress,
      symbol: holding.symbol,
      balance: holding.balance,
      tokenPrice: holding.tokenPrice,
      estimatedValue: estimatedValue(holding.balance, holding.tokenPrice),
      ...(asset ? {
        asset: {
          issuer: asset.platformId,
          tokenSymbol: asset.tokenSymbol,
          ticker: asset.underlyingTicker,
          name: asset.underlyingName,
          contractAddress: asset.contractAddress,
        }
      } : {}),
      warnings,
    };
  });
  const matched = rows.filter((row) => row.status === "matched");
  const unmatched = rows.length - matched.length;
  const warnings = unique(rows.flatMap((row) => row.warnings));
  return {
    kind: "wallet_exposure",
    state: rows.length === 0 ? "empty" : matched.length === 0 ? "unmatched" : unmatched > 0 || warnings.length > 0 ? "partial" : "ready",
    walletAddress,
    query,
    chainId,
    summary: {
      holdingsFound: rows.length,
      matchedTokenizedStocks: matched.length,
      unmatchedHoldings: unmatched,
      pricedHoldings: rows.filter((row) => row.estimatedValue !== undefined).length,
    },
    holdings: rows,
    warnings,
    boundary: {
      sideEffects: "none",
      privateKeyRequested: false,
      signatureRequested: false,
      broadcastAttempted: false,
    },
  };
}
