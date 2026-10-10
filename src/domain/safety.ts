import type { ActionPlan, MarketContext, QuoteResult, SafetyReport, SimulationResult } from "./types.js";
import { hasMarketStateConflict, normalizeProviderTimestamp } from "./normalizers.js";

export function evaluateSafety(input: {
  plan: ActionPlan;
  market?: MarketContext;
  quote?: QuoteResult;
  simulation?: SimulationResult;
  allowance?: bigint;
  requiredAllowance?: bigint;
}): SafetyReport {
  const checks = [] as SafetyReport["checks"];
  const asset = input.plan.intent.toAsset;
  checks.push({
    name: "asset_identity",
    passed: Boolean(asset.chainId && asset.contractAddress && asset.platformId),
    severity: "blocking",
    message: "Asset must include chainId, contractAddress and platformId"
  });
  const slippage = input.plan.intent.maxSlippageBps;
  if (slippage !== undefined) {
    checks.push({
      name: "slippage_limit",
      passed: Number.isInteger(slippage) && slippage >= 0 && slippage <= 10_000,
      severity: "blocking",
      message: `Maximum slippage: ${slippage} bps`
    });
  }
  if (input.market) {
    checks.push({
      name: "market_data_freshness",
      passed: normalizeProviderTimestamp(input.market.tokenPriceUpdatedAt) !== undefined,
      severity: "warning",
      message: normalizeProviderTimestamp(input.market.tokenPriceUpdatedAt) !== undefined ? "Price includes a valid update timestamp" : "Price is missing a valid update timestamp"
    });
    const marketStateConflict = hasMarketStateConflict(input.market.marketStatus, input.market.openState);
    const marketClosed = input.market.marketStatus === "closed" || input.market.openState === false;
    const marketUnknown = input.market.marketStatus === "unknown";
    const unknownWithoutTradabilitySignal = marketUnknown && input.market.openState !== true;
    const marketStatusBlocked = marketClosed || marketStateConflict || unknownWithoutTradabilitySignal;
    checks.push({
      name: "market_status",
      passed: !marketStatusBlocked,
      severity: marketStatusBlocked ? "blocking" : "warning",
      message: marketStateConflict
        ? "Provider marketStatus and openState conflict; executable plans are blocked"
        : marketClosed
        ? "Market is closed or halted; executable plans are blocked"
        : unknownWithoutTradabilitySignal
          ? "Market status category is unknown and the provider did not confirm current tradability; executable plans are blocked"
          : marketUnknown
            ? "Market status category is unknown; provider reports the underlying market is currently tradable"
            : `Market status: ${input.market.marketStatus}`
    });
  }
  if (input.quote) {
    checks.push({
      name: "input_balance",
      passed: true,
      severity: "info",
      message: "Ariadne does not pre-check wallet funds; the wallet decides whether it can submit the transaction"
    });
    checks.push({
      name: "quote_available",
      passed: input.quote.success && input.quote.routes.length > 0,
      severity: "blocking",
      message: input.quote.success ? "A valid quote is available" : input.quote.error?.message ?? "No valid quote is available"
    });
    const route = input.quote.routes[0];
    if (route) {
      const impact = route.priceImpact;
      const verifiedPercent = route.priceImpactUnit === "percent";
      const parsedImpact = verifiedPercent && typeof impact === "string" && /^-?\d+(?:\.\d+)?$/.test(impact) ? Number(impact) : undefined;
      const validImpact = parsedImpact !== undefined && Number.isFinite(parsedImpact);
      checks.push({
        name: "price_impact",
        passed: validImpact && Math.abs(parsedImpact) <= 5,
        severity: "blocking",
        message: !validImpact ? "Quote price impact is missing, malformed or has an unverified unit" : `Quote price impact: ${impact}%`
      });
      const hasSpender = typeof route.approvalTarget === "string" && /^0x[0-9a-fA-F]{40}$/.test(route.approvalTarget);
      const hasAllowanceRead = input.allowance !== undefined;
      checks.push({
        name: "authorization_visibility",
        passed: hasSpender,
        severity: hasSpender ? "info" : "blocking",
        message: !hasSpender
          ? "Quote omitted an ERC-20 spender; authorization cannot be verified"
          : !hasAllowanceRead
            ? `Verified spender=${route.approvalTarget}; current allowance was not used to block plan preparation`
            : input.allowance! >= (input.requiredAllowance ?? 0n)
              ? `Verified spender=${route.approvalTarget}; current allowance is sufficient`
              : `Verified spender=${route.approvalTarget}; a separate exact allowance step is required before the swap`
      });
    }
  }
  if (input.simulation) {
    checks.push({
      name: "simulation",
      passed: input.simulation.success,
      severity: input.simulation.success || input.simulation.walletFundsOnlyFailure ? "warning" : "blocking",
      message: input.simulation.success
        ? "Transaction simulation succeeded"
        : input.simulation.walletFundsOnlyFailure
          ? "Provider simulation could not confirm wallet funds or fee sufficiency; the wallet will decide whether it can submit"
          : "Transaction simulation failed for a reason other than wallet funds"
    });
  }
  return {
    passed: checks.every((check) => check.passed || check.severity !== "blocking"),
    checks,
    blockingReasons: checks.filter((check) => !check.passed && check.severity === "blocking").map((check) => check.message)
  };
}
