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
    message: "资产必须包含 chainId、contractAddress 和 platformId"
  });
  const slippage = input.plan.intent.maxSlippageBps;
  if (slippage !== undefined) {
    checks.push({
      name: "slippage_limit",
      passed: Number.isInteger(slippage) && slippage >= 0 && slippage <= 10_000,
      severity: "blocking",
      message: `最大滑点：${slippage} bps`
    });
  }
  if (input.market) {
    checks.push({
      name: "market_data_freshness",
      passed: Boolean(input.market.tokenPriceUpdatedAt),
      severity: "warning",
      message: input.market.tokenPriceUpdatedAt ? "价格包含更新时间" : "价格缺少更新时间"
    });
    const marketClosed = input.market.marketStatus === "closed" || input.market.openState === false;
    checks.push({
      name: "market_status",
      passed: !marketClosed && input.market.marketStatus !== "unknown",
      severity: marketClosed ? "blocking" : "warning",
      message: marketClosed
        ? "市场当前关闭或暂停，禁止创建可执行交易计划"
        : input.market.marketStatus === "unknown" ? "平台没有提供可识别的市场状态" : `市场状态：${input.market.marketStatus}`
    });
  }
  if (input.quote) {
    checks.push({
      name: "quote_available",
      passed: input.quote.success && input.quote.routes.length > 0,
      severity: "blocking",
      message: input.quote.success ? "存在可用报价" : input.quote.error?.message ?? "没有可用报价"
    });
    const route = input.quote.routes[0];
    if (route) {
      const impact = route.priceImpact;
      const parsedImpact = impact == null ? undefined : Number(impact);
      checks.push({
        name: "price_impact",
        passed: parsedImpact === undefined || Number.isFinite(parsedImpact) && Math.abs(parsedImpact) <= 5,
        severity: parsedImpact === undefined ? "warning" : "blocking",
        message: parsedImpact === undefined ? "报价未提供 price impact，需在确认前人工复核" : `报价 price impact: ${impact}%`
      });
      checks.push({
        name: "authorization_visibility",
        passed: !route.approvalTarget || (input.allowance !== undefined && input.requiredAllowance !== undefined && input.allowance >= input.requiredAllowance),
        severity: route.approvalTarget ? "blocking" : "info",
        message: !route.approvalTarget
          ? "报价未声明额外 approval target"
          : input.allowance === undefined
            ? `无法读取 ERC-20 allowance，spender=${route.approvalTarget}`
            : input.allowance >= (input.requiredAllowance ?? 0n)
              ? `ERC-20 allowance 足够，spender=${route.approvalTarget}`
              : `ERC-20 allowance 不足，spender=${route.approvalTarget}`
      });
    }
  }
  if (input.simulation) {
    checks.push({
      name: "simulation",
      passed: input.simulation.success,
      severity: "blocking",
      message: input.simulation.success ? "交易模拟通过" : "交易模拟未通过"
    });
  }
  return {
    passed: checks.every((check) => check.passed || check.severity !== "blocking"),
    checks,
    blockingReasons: checks.filter((check) => !check.passed && check.severity === "blocking").map((check) => check.message)
  };
}
