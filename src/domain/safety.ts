import type { ActionPlan, MarketContext, QuoteResult, SafetyReport, SimulationResult } from "./types.js";

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
      passed: Boolean(input.market.tokenPriceUpdatedAt),
      severity: "warning",
      message: input.market.tokenPriceUpdatedAt ? "Price includes an update timestamp" : "Price is missing an update timestamp"
    });
    const marketClosed = input.market.marketStatus === "closed" || input.market.openState === false;
    checks.push({
      name: "market_status",
      passed: !marketClosed && input.market.marketStatus !== "unknown",
      severity: marketClosed ? "blocking" : "warning",
      message: marketClosed
        ? "Market is closed or halted; executable plans are blocked"
        : input.market.marketStatus === "unknown" ? "Platform did not provide a recognized market status" : `Market status: ${input.market.marketStatus}`
    });
  }
  if (input.quote) {
    checks.push({
      name: "quote_available",
      passed: input.quote.success && input.quote.routes.length > 0,
      severity: "blocking",
      message: input.quote.success ? "A valid quote is available" : input.quote.error?.message ?? "No valid quote is available"
    });
    const route = input.quote.routes[0];
    if (route) {
      const impact = route.priceImpact;
      const parsedImpact = impact == null ? undefined : Number(impact);
      checks.push({
        name: "price_impact",
        passed: parsedImpact === undefined || Number.isFinite(parsedImpact) && Math.abs(parsedImpact) <= 5,
        severity: parsedImpact === undefined ? "warning" : "blocking",
        message: parsedImpact === undefined ? "Quote did not provide price impact; manual review is required before confirmation" : `Quote price impact: ${impact}%`
      });
      checks.push({
        name: "authorization_visibility",
        passed: !route.approvalTarget || (input.allowance !== undefined && input.requiredAllowance !== undefined && input.allowance >= input.requiredAllowance),
        severity: route.approvalTarget ? "blocking" : "info",
        message: !route.approvalTarget
          ? "Quote did not declare an additional approval target"
          : input.allowance === undefined
            ? `Unable to read ERC-20 allowance, spender=${route.approvalTarget}`
            : input.allowance >= (input.requiredAllowance ?? 0n)
              ? `ERC-20 allowance is sufficient, spender=${route.approvalTarget}`
              : `ERC-20 allowance is insufficient, spender=${route.approvalTarget}`
      });
    }
  }
  if (input.simulation) {
    checks.push({
      name: "simulation",
      passed: input.simulation.success,
      severity: "blocking",
      message: input.simulation.success ? "Transaction simulation succeeded" : "Transaction simulation failed"
    });
  }
  return {
    passed: checks.every((check) => check.passed || check.severity !== "blocking"),
    checks,
    blockingReasons: checks.filter((check) => !check.passed && check.severity === "blocking").map((check) => check.message)
  };
}
