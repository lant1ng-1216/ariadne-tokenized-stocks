export type PlatformId = "ondo" | "bstock" | "xstocks" | string;

export type AssetMatchQuality = "exact" | "platform_scoped" | "ticker_match" | "ambiguous";

export type StockAsset = {
  assetId: string;
  chainId: string;
  platformId: PlatformId;
  contractAddress: string;
  tokenSymbol: string;
  underlyingTicker: string;
  underlyingName: string;
  matchQuality?: AssetMatchQuality;
};

export type MarketStatus = "open" | "closed" | "offhours" | "unknown";

export type MarketContext = {
  asset: StockAsset;
  tokenPrice?: string;
  referencePrice?: string;
  priceGap?: string;
  priceGapPercent?: string;
  tokenPriceUpdatedAt?: number;
  marketStatus: MarketStatus;
  openState?: boolean;
  nextOpenTime?: number;
  liquidity?: string;
  volume24H?: string;
  holders?: number;
  dataWarnings: string[];
};

export type WalletHolding = {
  asset?: StockAsset;
  chainId: string;
  contractAddress: string;
  symbol: string;
  balance: string;
  rawBalance?: string;
  tokenPrice?: string;
  isRiskToken?: boolean;
  isDust?: boolean;
  warnings: string[];
};

export type TradeIntent = {
  type: "buy" | "sell" | "swap";
  walletAddress: string;
  fromTokenAddress: string;
  toAsset: StockAsset;
  amount: string;
  amountDecimals: number;
  maxSlippageBps?: number;
};

export type QuoteRoute = {
  quoteId: string;
  executionMode?: "SWAP" | "RFQ" | string;
  toTokenAmount?: string;
  minToTokenAmount?: string;
  priceImpact?: string;
  dexName?: string;
  approvalTarget?: string | null;
  expiresAt?: number;
};

export type QuoteResult = {
  asset: StockAsset;
  platformMode: "standard" | "rfq" | "unknown";
  success: boolean;
  routes: QuoteRoute[];
  warnings: string[];
  error?: { code: string | number; message: string };
};

export type UnsignedAction = {
  kind: "evm_transaction" | "rfq_order";
  chainId: string;
  quoteId: string;
  expiresAt?: number;
  payload: unknown;
};

export type ExecutionBoundary = {
  mode: "standard" | "rfq" | "unknown";
  requiresExternalSignature: boolean;
  requiresExternalBroadcast: boolean;
  retryPolicy: "safe-to-retry-before-signing" | "query-status-before-retry";
};

export type BalanceChange = {
  chainId?: string;
  tokenAddress?: string;
  symbol?: string;
  before?: string;
  after?: string;
  delta?: string;
};

export type SimulationResult = {
  success: boolean;
  status?: string;
  balanceChanges: BalanceChange[];
  allowanceChanges: unknown[];
  warnings: string[];
  raw?: unknown;
};

export type ActionPlanStatus =
  | "draft"
  | "simulated"
  | "awaiting_confirmation"
  | "confirmed"
  | "executed"
  | "failed";

export type SafetyCheck = {
  name: string;
  passed: boolean;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type SafetyReport = {
  passed: boolean;
  checks: SafetyCheck[];
  blockingReasons: string[];
};

export type ActionPlan = {
  planId: string;
  status: ActionPlanStatus;
  intent: TradeIntent;
  assetContext?: MarketContext;
  quoteId?: string;
  expectedOutput?: string;
  unsignedActions?: unknown[];
  simulation?: unknown;
  safetyReport?: SafetyReport;
  expiresAt?: number;
  requiresUserConfirmation: boolean;
};
