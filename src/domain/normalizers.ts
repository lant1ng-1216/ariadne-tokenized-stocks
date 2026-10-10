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
  assetType?: number;
}): StockAsset {
  return {
    assetId: makeAssetId(input.binanceChainId, input.tokenContractAddress),
    chainId: input.binanceChainId,
    platformId: input.platformId ?? "unknown",
    contractAddress: input.tokenContractAddress,
    tokenSymbol: input.tokenSymbol ?? "",
    underlyingTicker: input.underlyingTicker ?? "",
    underlyingName: input.underlyingName ?? "",
    ...(typeof input.assetType === "number" && Number.isSafeInteger(input.assetType) ? { assetType: input.assetType } : {})
  };
}

export function normalizeMarketStatus(value: unknown): MarketStatus {
  if (value === "open" || value === "regular") return "open";
  if (value === "closed" || value === "paused" || value === "pause" || value === "halted") return "closed";
  if (value === "offhours" || value === "preopen" || value === "afterhours" || value === "premarket" || value === "postmarket" || value === "overnight") return "offhours";
  return "unknown";
}

export function normalizeProviderTimestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000_000
    ? value
    : undefined;
}

export function hasMarketStateConflict(status: MarketStatus, openState?: boolean): boolean {
  return (status === "open" && openState === false) ||
    (status === "closed" && openState === true);
}

export function positiveDecimal(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const candidate = String(value).trim();
  if (candidate.length > 256 || !/^\d+(?:\.\d+)?$/.test(candidate)) return undefined;
  const [whole, fraction = ""] = candidate.split(".");
  return BigInt(`${whole}${fraction}`) > 0n ? candidate : undefined;
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
  const openState = typeof input.statusInfo?.openState === "boolean" ? input.statusInfo.openState : undefined;
  const tokenPrice = positiveDecimal(input.tokenPrice);
  const referencePrice = positiveDecimal(input.referencePrice);
  const tokenPriceUpdatedAt = normalizeProviderTimestamp(input.tokenPriceUpdatedAt);
  const nextOpenTime = normalizeProviderTimestamp(input.statusInfo?.nextOpenTime);
  const nextCloseTime = normalizeProviderTimestamp(input.statusInfo?.nextCloseTime);
  const warnings: string[] = [];
  warnings.push("Provider timestamps alone do not guarantee data freshness; no market-data freshness SLA has been verified");
  if (input.tokenPriceUpdatedAt != null && tokenPriceUpdatedAt === undefined) warnings.push("Provider quote timestamp is invalid and was withheld");
  if (input.statusInfo?.nextOpenTime != null && nextOpenTime === undefined) warnings.push("Provider next-open timestamp is invalid and was withheld");
  if (input.statusInfo?.nextCloseTime != null && nextCloseTime === undefined) warnings.push("Provider next-close timestamp is invalid and was withheld");
  if (status === "unknown") warnings.push("The platform did not provide a recognized marketStatus");
  if (status === "unknown" && openState === true) warnings.push("Provider reports the underlying market is currently tradable");
  if (hasMarketStateConflict(status, openState)) warnings.push("Provider marketStatus and openState conflict; the market is treated as not open");
  if (input.liquidity == null) warnings.push("Liquidity was not provided and must not be interpreted as zero");
  if (!tokenPrice) warnings.push(input.tokenPrice == null ? "tokenPrice is missing" : "tokenPrice is invalid or non-positive");
  if (!referencePrice) warnings.push(input.referencePrice == null ? "referencePrice is missing" : "referencePrice is invalid or non-positive");

  return {
    asset,
    tokenPrice,
    referencePrice,
    priceGap: decimalGap(tokenPrice, referencePrice),
    priceGapPercent: decimalGapPercent(tokenPrice, referencePrice),
    tokenPriceUpdatedAt,
    marketStatus: status,
    ...(typeof input.statusInfo?.marketStatus === "string" ? { providerMarketStatus: input.statusInfo.marketStatus } : {}),
    openState,
    nextOpenTime,
    ...(typeof input.statusInfo?.reasonCode === "string" || typeof input.statusInfo?.reasonCode === "number"
      ? { reasonCode: input.statusInfo.reasonCode }
      : {}),
    ...(typeof input.statusInfo?.reasonMsg === "string" ? { reasonMsg: input.statusInfo.reasonMsg } : {}),
    nextCloseTime,
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
  const quoteTimestamp = normalizeProviderTimestamp(input.timestamp);
  const routes = (input.data ?? []).map((route: any) => ({
    quoteId: String(route.quoteId ?? ""),
    executionMode: route.executionMode,
    toTokenAmount: route.toTokenAmount,
    minToTokenAmount: route.minToTokenAmount,
    priceImpact: route.priceImpactPercent ?? route.priceImpact,
    priceImpactUnit: route.priceImpactPercent != null ? "percent" as const : "unknown" as const,
    dexName: route.vendorName ?? route.dexName,
    approvalTarget: route.approveTarget ?? null,
    providerRouteFeeUsd: route.tradeFee != null ? String(route.tradeFee) : undefined,
    estimatedGasFeeBaseUnits: route.estimateGasFee != null ? String(route.estimateGasFee) : route.estimatedGasFee != null ? String(route.estimatedGasFee) : undefined,
    estimatedGas: route.estimateGas != null ? String(route.estimateGas) : undefined,
    expiresAt: normalizeProviderTimestamp(route.expiresAt ?? route.expireTime) ?? (quoteTimestamp !== undefined ? quoteTimestamp + 30_000 : undefined)
  }));
  const explicitMode = routes.find((route: any) => route.executionMode)?.executionMode;
  const isRfq = explicitMode === "RFQ" || (!explicitMode && ["ondo", "bstock", "xstocks"].includes(asset.platformId));
  const isStandard = explicitMode === "SWAP" || (!explicitMode && !isRfq);
  const warnings: string[] = [];
  if (isRfq) warnings.push("This RWA quote uses RFQ and requires a userWalletAddress and external EIP-712 signature");
  if (routes.some((route: any) => !route.minToTokenAmount)) warnings.push("Quote did not return minToTokenAmount");
  if (routes.some((route: any) => route.priceImpactUnit === "unknown")) warnings.push("Price impact is missing or its unit is unverified; do not treat it as a percentage");
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
  const rawStatus = data.status ?? data.executionStatus;
  const status = typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : undefined;
  const successfulStatuses = new Set(["SUCCESS", "SUCCEEDED", "SIMULATED", "PASSED"]);
  const explicitlySucceeded = successfulStatuses.has(status ?? "");
  const failedByStatus = Boolean(status && !explicitlySucceeded) || Boolean(data.failReason);
  const success = input.success === true && input.code === 0 && explicitlySucceeded && !failedByStatus;
  const failureReason = typeof data.failReason === "string"
    ? data.failReason
    : !status ? "Simulation response did not include an explicit successful status" : `Simulation did not succeed (status: ${status})`;
  const walletFundsOnlyFailure = !success && isWalletFundsOnlyFailureReason(failureReason);
  const warnings: string[] = success ? [] : [
    failureReason
  ];
  return {
    success,
    ...(walletFundsOnlyFailure ? { walletFundsOnlyFailure: true } : {}),
    status,
    balanceChanges: data.balanceChanges ?? [],
    allowanceChanges: data.allowanceChanges ?? [],
    warnings,
    raw: data
  };
}

/** Only classify a provider's single, explicit balance/gas error as a wallet decision. */
function isWalletFundsOnlyFailureReason(reason: string): boolean {
  const normalized = reason.trim()
    .replace(/^execution reverted\s*:?[\s]*/i, "")
    .replace(/^revert(?:ed)?\s*:?[\s]*/i, "")
    .trim();
  return [
    /^(?:BEP20:\s*)?transfer amount exceeds balance[.!]?$/i,
    /^insufficient funds(?: for (?:gas(?: \* price(?: \+ value)?)?|intrinsic(?: transaction)?(?: cost)?|transaction))?[.!]?$/i,
    /^not enough funds for gas(?: \* price(?: \+ value)?)?[.!]?$/i,
    /^insufficient (?:token )?balance[.!]?$/i,
    /^balance is too low[.!]?$/i,
    /^exceeds available balance[.!]?$/i
  ].some((pattern) => pattern.test(normalized));
}
