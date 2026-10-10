import { BinanceWeb3Error } from "../errors.js";

export type PurchasePlanStage =
  | "asset_discovery"
  | "input_token_verification"
  | "stock_token_verification"
  | "market_context"
  | "price_quote"
  | "allowance_check"
  | "swap_build"
  | "transaction_validation"
  | "gas_estimate";

export class PurchasePlanStageError extends Error {
  readonly retryable: boolean;
  readonly attempts: number;
  readonly causeMessage: string;

  constructor(readonly stage: PurchasePlanStage, cause: unknown, options: { retryable?: boolean; attempts?: number } = {}) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(causeMessage);
    this.name = "PurchasePlanStageError";
    this.causeMessage = causeMessage;
    this.retryable = options.retryable ?? (cause instanceof BinanceWeb3Error && cause.retryable);
    this.attempts = options.attempts ?? (typeof cause === "object" && cause !== null && "attempts" in cause && Number.isInteger((cause as { attempts?: unknown }).attempts)
      ? Number((cause as { attempts: number }).attempts)
      : 1);
  }
}

export function purchasePlanStageLabel(stage: PurchasePlanStage, language: "en" | "zh-CN"): string {
  const labels: Record<PurchasePlanStage, [string, string]> = {
    asset_discovery: ["发行方与代币查询", "issuer and token lookup"],
    input_token_verification: ["USDT 合约身份核验", "USDT contract verification"],
    stock_token_verification: ["股票代币身份核验", "stock-token verification"],
    market_context: ["行情上下文获取", "market context retrieval"],
    price_quote: ["买入报价获取", "purchase quote retrieval"],
    allowance_check: ["USDT 授权额度读取", "USDT allowance read"],
    swap_build: ["买入交易构建", "purchase transaction build"],
    transaction_validation: ["交易内容校验", "transaction validation"],
    gas_estimate: ["网络费估算", "network-fee estimate"]
  };
  const [chinese, english] = labels[stage];
  return language === "zh-CN" ? chinese : english;
}
