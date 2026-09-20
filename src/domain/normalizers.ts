import type { MarketContext, MarketStatus, QuoteResult, StockAsset, WalletHolding, SimulationResult } from "./types.js";

export function makeAssetId(chainId: string, contractAddress: string): string {
  return `${chainId}:${contractAddress.toLowerCase()}`;
}

export function normalizeStockAsset(input: {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId?: string;
  tokenSymbol?: string;
  underlyingTicker?: string;
  underlyingName?: string;
}): StockAsset {
  return {
    assetId: makeAssetId(input.binanceChainId, input.tokenContractAddress),
    chainId: input.binanceChainId,
    platformId: input.platformId ?? "unknown",
    contractAddress: input.tokenContractAddress,
    tokenSymbol: input.tokenSymbol ?? "",
    underlyingTicker: input.underlyingTicker ?? "",
    underlyingName: input.underlyingName ?? ""
  };
}

export function normalizeMarketStatus(value: unknown): MarketStatus {
  if (value === "open" || value === "regular") return "open";
  if (value === "closed" || value === "paused" || value === "halted") return "closed";
  if (value === "offhours" || value === "preopen" || value === "afterhours") return "offhours";
  return "unknown";
}

function parseDecimal(value: string): { units: bigint; scale: number } {
  const normalized = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`Invalid decimal: ${value}`);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const scale = fraction.length;
  const units = BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n);
  return { units, scale };
}

function formatDecimal(units: bigint, scale: number): string {
  const negative = units < 0n;
  const raw = (negative ? -units : units).toString().padStart(scale + 1, "0");
  const whole = scale ? raw.slice(0, -scale) : raw;
  const fraction = scale ? raw.slice(-scale).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function decimalGap(tokenPrice?: string, referencePrice?: string): string | undefined {
  if (!tokenPrice || !referencePrice) return undefined;
  const token = parseDecimal(tokenPrice);
  const reference = parseDecimal(referencePrice);
  const scale = Math.max(token.scale, reference.scale);
  return formatDecimal(token.units * 10n ** BigInt(scale - token.scale) - reference.units * 10n ** BigInt(scale - reference.scale), scale);
}

function decimalGapPercent(tokenPrice?: string, referencePrice?: string): string | undefined {
  if (!tokenPrice || !referencePrice) return undefined;
  const token = parseDecimal(tokenPrice);
  const reference = parseDecimal(referencePrice);
  if (reference.units === 0n) return undefined;
  const scale = Math.max(token.scale, reference.scale);
  const difference = token.units * 10n ** BigInt(scale - token.scale) - reference.units * 10n ** BigInt(scale - reference.scale);
  const numerator = difference * 100n * 1000000000000000000n;
  const denominator = reference.units * 10n ** BigInt(scale - reference.scale);
  const scaled = numerator / denominator;
  return `${formatDecimal(scaled, 18)}%`;
}

export function normalizeMarketContext(asset: StockAsset, input: any): MarketContext {
  const status = normalizeMarketStatus(input.statusInfo?.marketStatus);
  const warnings: string[] = [];
  if (status === "unknown") warnings.push("The platform did not provide a recognized marketStatus");
  if (input.liquidity == null) warnings.push("Liquidity was not provided and must not be interpreted as zero");
  if (input.tokenPrice == null) warnings.push("tokenPrice is missing");
  if (input.referencePrice == null) warnings.push("referencePrice is missing");

  return {
    asset,
    tokenPrice: input.tokenPrice,
    referencePrice: input.referencePrice,
    priceGap: decimalGap(input.tokenPrice, input.referencePrice),
    priceGapPercent: decimalGapPercent(input.tokenPrice, input.referencePrice),
    tokenPriceUpdatedAt: input.tokenPriceUpdatedAt,
    marketStatus: status,
    openState: input.statusInfo?.openState,
    nextOpenTime: input.statusInfo?.nextOpenTime,
    liquidity: input.liquidity,
    volume24H: input.volume24H,
    holders: input.holders,
    dataWarnings: warnings
  };
}

export function normalizeWalletHolding(input: any, asset?: StockAsset): WalletHolding {
  const balance = String(input.balance ?? "0");
  const isDust = Number(balance) > 0 && Number(balance) < 0.000001;
  const warnings: string[] = [];
  if (input.tokenPrice === "" || input.tokenPrice == null) warnings.push("tokenPrice is unavailable");
  if (input.isRiskToken) warnings.push("Wallet API marked this asset as a risk token");
  if (isDust) warnings.push("Balance may be dust and should not be treated as meaningful exposure");

  return {
    asset,
    chainId: input.binanceChainId,
    contractAddress: input.tokenContractAddress,
    symbol: input.symbol ?? "",
    balance,
    rawBalance: input.rawBalance,
    tokenPrice: input.tokenPrice || undefined,
    isRiskToken: input.isRiskToken,
    isDust,
    warnings
  };
}

export function normalizeQuote(asset: StockAsset, input: any): QuoteResult {
  const routes = (input.data ?? []).map((route: any) => ({
    quoteId: String(route.quoteId ?? ""),
    executionMode: route.executionMode,
    toTokenAmount: route.toTokenAmount,
    minToTokenAmount: route.minToTokenAmount,
    priceImpact: route.priceImpactPercent ?? route.priceImpact,
    dexName: route.vendorName ?? route.dexName,
    approvalTarget: route.approveTarget ?? null
  }));
  const explicitMode = routes.find((route: any) => route.executionMode)?.executionMode;
  const isRfq = explicitMode === "RFQ" || (!explicitMode && ["ondo", "bstock", "xstocks"].includes(asset.platformId));
  const isStandard = explicitMode === "SWAP" || (!explicitMode && !isRfq);
  const warnings: string[] = [];
  if (isRfq) warnings.push("This RWA quote uses RFQ and requires a userWalletAddress and external EIP-712 signature");
  if (routes.some((route: any) => !route.minToTokenAmount)) warnings.push("Quote did not return minToTokenAmount");
  return {
    asset,
    platformMode: isRfq ? "rfq" : isStandard ? "standard" : "unknown",
    success: input.success === true && input.code === 0,
    routes,
    warnings,
    ...((input.success === true && input.code === 0) ? {} : {
      error: { code: input.code ?? "UNKNOWN", message: input.msg ?? "Quote failed" }
    })
  };
}

export function normalizeSimulation(input: any): SimulationResult {
  const data = input.data ?? {};
  const warnings: string[] = [];
  const status = data.status ?? data.executionStatus;
  const failedByStatus = status === "FAILED" || status === "FAIL" || Boolean(data.failReason);
  if (!input.success || input.code !== 0 || failedByStatus) warnings.push(data.failReason ?? input.msg ?? "Simulation failed");
  return {
    success: input.success === true && input.code === 0 && !failedByStatus,
    status,
    balanceChanges: data.balanceChanges ?? [],
    allowanceChanges: data.allowanceChanges ?? [],
    warnings,
    raw: data
  };
}
