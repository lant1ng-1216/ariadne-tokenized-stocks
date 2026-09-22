import type { QuoteResult, StockAsset } from "../domain/types.js";

export type ReadOnlyQuoteView = {
  kind: "read_only_quote";
  request: {
    walletAddress: string;
    chainId: string;
    query: string;
    platformId: string;
    amount: string;
    inputToken: "USDT";
  };
  asset: {
    issuer: string;
    tokenSymbol: string;
    ticker: string;
    name: string;
    contractAddress: string;
  };
  quote: {
    success: boolean;
    platformMode: string;
    quoteId?: string;
    expectedOutput?: string;
    minimumOutputAvailable: boolean;
    priceImpact?: string;
    venue?: string;
    approvalTargetPresent: boolean;
    expiresAt?: number;
  };
  warnings: string[];
  boundary: {
    sideEffects: "none";
    actionPlanCreated: false;
    approvalTransactionCreated: false;
    signatureRequested: false;
    broadcastAttempted: false;
  };
};

export function buildReadOnlyQuoteView(
  walletAddress: string,
  amount: string,
  asset: StockAsset,
  quote: QuoteResult,
): ReadOnlyQuoteView {
  const route = quote.routes[0];
  return {
    kind: "read_only_quote",
    request: {
      walletAddress,
      chainId: asset.chainId,
      query: asset.underlyingTicker,
      platformId: asset.platformId,
      amount,
      inputToken: "USDT",
    },
    asset: {
      issuer: asset.platformId,
      tokenSymbol: asset.tokenSymbol,
      ticker: asset.underlyingTicker,
      name: asset.underlyingName,
      contractAddress: asset.contractAddress,
    },
    quote: {
      success: quote.success,
      platformMode: quote.platformMode,
      quoteId: route?.quoteId,
      expectedOutput: route?.toTokenAmount,
      minimumOutputAvailable: Boolean(route?.minToTokenAmount),
      priceImpact: route?.priceImpact,
      venue: route?.dexName,
      approvalTargetPresent: Boolean(route?.approvalTarget),
      expiresAt: route?.expiresAt,
    },
    warnings: quote.warnings,
    boundary: {
      sideEffects: "none",
      actionPlanCreated: false,
      approvalTransactionCreated: false,
      signatureRequested: false,
      broadcastAttempted: false,
    },
  };
}
