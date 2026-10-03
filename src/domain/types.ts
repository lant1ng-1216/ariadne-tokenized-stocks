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
  /** Provider's documented code: 1=Stock, 2=Pre-IPO, 3=ETF; other integer values remain visible as unknown codes. */
  assetType?: number;
  tokenName?: string;
  tokenLogoUrl?: string;
  issuerLogoUrl?: string;
  issuerWebsite?: string;
  matchQuality?: AssetMatchQuality;
  /** Collection-level limits that apply to a returned search match, not to its identity fields. */
  collectionWarnings?: string[];
};

export type RwaPlatform = {
  platformId: PlatformId;
  name: string;
  tickerCount?: number;
  chainDistribution: Array<{ chainId: string; tokenCount: number }>;
  website?: string;
  logoUrl?: string;
};

export type TokenizedStockListing = StockAsset & {
  underlyingNameZh?: string;
  tokenToShareRatio?: string;
  tags: string[];
  market: MarketContext;
  marketCap?: string;
  peRatioTTM?: string;
};

export type MarketStatus = "open" | "closed" | "offhours" | "unknown";

export type MarketDataProvenance = {
  provider: "Binance Web3";
  endpoint: string;
  fields: string[];
  /** Provider response time for this snapshot, when supplied. */
  responseTimestampMs?: number;
  /** Per-asset market update time, distinct from the response time. */
  assetUpdatedAtMs?: number;
};

export type MarketContext = {
  asset: StockAsset;
  tokenPrice?: string;
  referencePrice?: string;
  priceGap?: string;
  priceGapPercent?: string;
  tokenPriceUpdatedAt?: number;
  marketStatus: MarketStatus;
  /** Exact provider enum, kept separate from the conservative normalized marketStatus used by safety logic. */
  providerMarketStatus?: string;
  openState?: boolean;
  nextOpenTime?: number;
  reasonCode?: string | number;
  reasonMsg?: string;
  nextCloseTime?: number;
  liquidity?: string;
  volume24H?: string;
  holders?: number;
  dataWarnings: string[];
  provenance?: MarketDataProvenance[];
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
  /** User-reviewed maximum gas spend in BNB; no implicit broadcast default. */
  maxGasCostBnb?: string;
};

export type QuoteRoute = {
  quoteId: string;
  executionMode?: "SWAP" | "RFQ" | string;
  toTokenAmount?: string;
  minToTokenAmount?: string;
  priceImpact?: string;
  /** Only priceImpactPercent has a verified percent unit; a raw priceImpact is not assumed to be percent. */
  priceImpactUnit?: "percent" | "unknown";
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
  /** Read-only evidence for a separate approval step; never an approval or swap authorization. */
  approvalRequired?: { tokenAddress: string; spender: string; requiredAmount: string; currentAllowance: string };
  /** Quote-declared ERC-20 spender and allowance reviewed during preparation; re-read before broadcast. */
  authorizationCheck?: { required: true; tokenAddress: string; spender: string; requiredAmount: string; reviewedAllowance: string };
  expiresAt?: number;
  requiresUserConfirmation: boolean;
};
