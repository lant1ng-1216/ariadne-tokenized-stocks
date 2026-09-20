import { BinanceWeb3Client } from "../binance-web3-client.js";
import {
  makeAssetId,
  normalizeMarketContext,
  normalizeStockAsset
} from "../domain/normalizers.js";
import type { MarketContext, StockAsset } from "../domain/types.js";
import { normalizeQuote } from "../domain/normalizers.js";
import type { QuoteResult, TradeIntent, ActionPlan, UnsignedAction } from "../domain/types.js";
import { evaluateSafety } from "../domain/safety.js";
import { TransactionService } from "./transaction.js";

export type RfqSigningRequest = {
  quoteId: string;
  orderId: string;
  vendor: string;
  signingScheme?: string;
  typedDataToSign: string;
};

type RwaSearchResponse = {
  ticker: string;
  companyName: string;
  assets: Array<{
    platformId: string;
    binanceChainId: string;
    tokenContractAddress: string;
    tokenSymbol: string;
    assetType?: number;
  }>;
};

type RwaTokenResponse = {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  tokenSymbol: string;
  underlyingTicker: string;
  underlyingName: string;
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
  statusInfo?: {
    openState?: boolean;
    marketStatus?: string;
    nextOpenTime?: number;
  };
};

export type AssetSearchOptions = {
  chainId?: string;
  platformId?: string;
};

export type CandleOptions = { bar?: string; after?: number; before?: number; limit?: number };

export class TokenizedStocksService {
  constructor(private readonly client: BinanceWeb3Client) {}

  async search(query: string, options: AssetSearchOptions = {}): Promise<StockAsset[]> {
    const response = await this.client.get<RwaSearchResponse[]>(
      "/api/v1/dex/market/rwa/search",
      {
        keyword: query,
        ...(options.platformId ? { platformId: options.platformId } : {})
      }
    );

    const results: StockAsset[] = [];
    for (const match of response.data ?? []) {
      for (const asset of match.assets ?? []) {
        if (options.chainId && asset.binanceChainId !== options.chainId) continue;
        results.push(normalizeStockAsset({
          binanceChainId: asset.binanceChainId,
          tokenContractAddress: asset.tokenContractAddress,
          platformId: asset.platformId,
          tokenSymbol: asset.tokenSymbol,
          underlyingTicker: match.ticker,
          underlyingName: match.companyName
        }));
      }
    }
    return results;
  }

  async marketContext(asset: StockAsset): Promise<MarketContext> {
    const response = await this.client.get<RwaTokenResponse[]>(
      "/api/v1/dex/market/rwa/tokens",
      { binanceChainId: asset.chainId }
    );
    const match = response.data?.find((item) =>
      item.binanceChainId === asset.chainId &&
      item.tokenContractAddress.toLowerCase() === asset.contractAddress.toLowerCase()
    );
    if (!match) {
      throw new Error(`Asset not found in RWA token list: ${makeAssetId(asset.chainId, asset.contractAddress)}`);
    }
    return normalizeMarketContext(asset, match);
  }

  async candles(asset: StockAsset, options: CandleOptions = {}): Promise<unknown[]> {
    const response = await this.client.get<any>("/api/v1/dex/market/candles", {
      binanceChainId: asset.chainId,
      tokenContractAddress: asset.contractAddress,
      bar: options.bar ?? "1m",
      ...(options.after !== undefined ? { after: String(options.after) } : {}),
      ...(options.before !== undefined ? { before: String(options.before) } : {}),
      limit: String(options.limit ?? 10)
    });
    return response.data ?? [];
  }

  async quote(intent: TradeIntent): Promise<QuoteResult> {
    const amount = (BigInt(intent.amount) * (10n ** BigInt(intent.amountDecimals))).toString();
    const params: Record<string, string> = {
      binanceChainId: intent.toAsset.chainId,
      amount,
      fromTokenAddress: intent.fromTokenAddress,
      toTokenAddress: intent.toAsset.contractAddress
    };
    if (["ondo", "bstock", "xstocks"].includes(intent.toAsset.platformId)) params.userWalletAddress = intent.walletAddress;
    const response = await this.client.get<any>("/api/v1/dex/aggregator/quote", params);
    return normalizeQuote(intent.toAsset, response);
  }

  async buildUnsignedAction(intent: TradeIntent, quote: QuoteResult): Promise<UnsignedAction> {
    const route = quote.routes[0];
    if (!route?.quoteId) throw new Error("Cannot build action without a valid quoteId");
    const amount = (BigInt(intent.amount) * (10n ** BigInt(intent.amountDecimals))).toString();
    const query: Record<string, string> = {
      binanceChainId: intent.toAsset.chainId,
      amount,
      fromTokenAddress: intent.fromTokenAddress,
      toTokenAddress: intent.toAsset.contractAddress,
      userWalletAddress: intent.walletAddress,
      quoteId: route.quoteId,
      slippagePercent: (((intent.maxSlippageBps ?? 50) / 100)).toString(),
      priceImpactProtectionPercent: "90"
    };
    const response = await this.client.get<any>("/api/v1/dex/aggregator/swap", query);
    if (response.code !== 0 || response.success !== true || !response.data) {
      throw new Error(`Swap build failed: ${response.msg ?? "unknown error"}`);
    }
    const executionMode = response.data.executionMode ?? (response.data.rfq ? "RFQ" : response.data.tx ? "SWAP" : undefined);
    if (quote.platformMode === "rfq" && executionMode !== "RFQ") {
      throw new Error(`RFQ route returned incompatible execution mode: ${executionMode ?? "unknown"}`);
    }
    if (quote.platformMode === "rfq") {
      const rfq = response.data.rfq;
      if (!rfq?.typedDataToSign || !rfq.vendor || !rfq.orderId) {
        throw new Error("RFQ swap response is incomplete: typedDataToSign, vendor, and orderId are required before signing");
      }
    }
    return {
      kind: executionMode === "RFQ" ? "rfq_order" : "evm_transaction",
      chainId: intent.toAsset.chainId,
      quoteId: route.quoteId,
      expiresAt: Date.now() + 30_000,
      payload: response.data
    };
  }

  async buildApprovalAction(intent: TradeIntent, quote: QuoteResult): Promise<UnsignedAction | undefined> {
    const route = quote.routes[0];
    if (!route?.approvalTarget) return undefined;
    const amount = (BigInt(intent.amount) * (10n ** BigInt(intent.amountDecimals))).toString();
    const response = await this.client.get<any>("/api/v1/dex/aggregator/approve-transaction", {
      binanceChainId: intent.toAsset.chainId,
      tokenContractAddress: intent.fromTokenAddress,
      approveAmount: amount,
      ...(route.dexName ? { vendor: route.dexName } : {})
    });
    if (response.code !== 0 || response.success !== true || !response.data?.length) throw new Error(`Approval build failed: ${response.msg ?? "unknown error"}`);
    return { kind: "evm_transaction", chainId: intent.toAsset.chainId, quoteId: route.quoteId, expiresAt: Date.now() + 30_000, payload: response.data[0] };
  }

  /** Submit an already EIP-712-signed RFQ payload. Signing remains outside the SDK.
   * Reuse requestId for retries of the same order; generate a new one for a new order.
   */
  async submitRfqOrder(input: {
    requestId: string;
    userSignature: string;
    vendor: string;
    quoteId: string;
    signingScheme?: string;
  }): Promise<unknown> {
    const response = await this.client.post<any>("/api/v1/dex/aggregator/order/submit", input);
    return response.data;
  }

  /** Extract the exact external-wallet signing request from an RFQ swap action. */
  prepareRfqSigningRequest(action: UnsignedAction): RfqSigningRequest {
    if (action.kind !== "rfq_order") throw new Error("Expected an RFQ action");
    const payload = action.payload as any;
    const rfq = payload?.rfq;
    if (!rfq?.typedDataToSign || !rfq.vendor || !rfq.orderId) {
      throw new Error("RFQ action is missing typedDataToSign, vendor, or orderId");
    }
    return {
      quoteId: action.quoteId,
      orderId: String(rfq.orderId),
      vendor: String(rfq.vendor),
      signingScheme: rfq.signingScheme,
      typedDataToSign: String(rfq.typedDataToSign)
    };
  }

  async rfqOrderStatus(orderId: string): Promise<unknown> {
    const response = await this.client.get<any>(`/api/v1/dex/aggregator/order/${encodeURIComponent(orderId)}`);
    return response.data;
  }

  async createActionPlan(intent: TradeIntent): Promise<ActionPlan> {
    const [market, quote] = await Promise.all([
      this.marketContext(intent.toAsset),
      this.quote(intent)
    ]);
    const plan: ActionPlan = {
      planId: `plan_${Date.now()}`,
      status: quote.success ? "draft" : "failed",
      intent,
      assetContext: market,
      quoteId: quote.routes[0]?.quoteId,
      expectedOutput: quote.routes[0]?.toTokenAmount,
      safetyReport: undefined,
      requiresUserConfirmation: true
    };
    const route = quote.routes[0];
    const requiredAllowance = BigInt(intent.amount) * (10n ** BigInt(intent.amountDecimals));
    let allowance: bigint | undefined;
    if (route?.approvalTarget) {
      try {
        allowance = await new TransactionService(this.client).erc20Allowance(
          intent.toAsset.chainId,
          intent.fromTokenAddress,
          intent.walletAddress,
          route.approvalTarget
        );
      } catch (error) {
        plan.safetyReport = {
          passed: false,
          checks: [],
          blockingReasons: [`Unable to read ERC-20 allowance: ${error instanceof Error ? error.message : String(error)}`]
        };
        plan.status = "failed";
        return plan;
      }
    }
    plan.safetyReport = evaluateSafety({ plan, market, quote, allowance, requiredAllowance });
    if (!plan.safetyReport.passed) plan.status = "failed";
    if (plan.status !== "failed") {
      try {
        plan.unsignedActions = [await this.buildUnsignedAction(intent, quote)];
        plan.status = "awaiting_confirmation";
        plan.expiresAt = (plan.unsignedActions[0] as UnsignedAction).expiresAt;
      } catch (error) {
        plan.status = "failed";
        plan.safetyReport = {
          ...plan.safetyReport,
          passed: false,
          blockingReasons: [`Unable to build unsigned action: ${error instanceof Error ? error.message : String(error)}`]
        };
      }
    }
    return plan;
  }
}
