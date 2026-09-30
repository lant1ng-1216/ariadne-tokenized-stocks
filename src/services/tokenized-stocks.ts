import { BinanceWeb3Client } from "../binance-web3-client.js";
import {
  makeAssetId,
  normalizeMarketContext,
  normalizeStockAsset,
  positiveDecimal
} from "../domain/normalizers.js";
import type { MarketContext, RwaPlatform, StockAsset, TokenizedStockListing } from "../domain/types.js";
import { normalizeQuote } from "../domain/normalizers.js";
import type { QuoteResult, TradeIntent, ActionPlan, UnsignedAction } from "../domain/types.js";
import { evaluateSafety } from "../domain/safety.js";
import { TransactionService } from "./transaction.js";
import { parseTokenAmount } from "../domain/amount.js";
import { markSdkPreparedPlan } from "../domain/prepared-plan-provenance.js";
import { randomUUID } from "node:crypto";
import { representationIdentityKey, type RepresentationIdentity } from "./asset-coverage-audit.js";

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
  tokenName?: string;
  tokenLogoUrl?: string;
  underlyingTicker: string;
  underlyingName: string;
  underlyingNameZh?: string;
  tokenToShareRatio?: string;
  tags?: string[];
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
  statusInfo?: {
    openState?: boolean;
    marketStatus?: string;
    nextOpenTime?: number;
  };
  volume24H?: string;
  marketCap?: string;
  peRatioTTM?: string;
};

type RwaPlatformResponse = {
  platformId: string;
  tickerCount?: number;
  chainDistribution?: Array<{ binanceChainId: string; tokenCount: number }>;
  website?: string;
  logoUrl?: string;
};

type RwaTokenPriceResponse = {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};

export type DirectoryTokenPriceSnapshot = RepresentationIdentity & {
  state: "available" | "missing" | "ambiguous" | "invalid" | "unavailable";
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};

export type AssetSearchOptions = {
  chainId?: string;
  platformId?: string;
};

export type TokenizedStockCatalogSnapshot = {
  listings: TokenizedStockListing[];
  /** Provider catalog-response time in Unix milliseconds; not a per-asset quote timestamp. */
  sourceResponseTimestampMs?: number;
  /** Platform metadata response time in Unix milliseconds; separate from the token-list snapshot. */
  platformMetadataResponseTimestampMs?: number;
};

export type RwaPlatformCatalogSnapshot = {
  platforms: RwaPlatform[];
  /** Provider platform-metadata response time in Unix milliseconds. */
  sourceResponseTimestampMs?: number;
};

export type CandleOptions = { bar?: string; after?: number; before?: number; limit?: number };

export class TokenizedStocksService {
  private platformCache?: { expiresAt: number; data: RwaPlatform[]; sourceResponseTimestampMs?: number };

  constructor(
    private readonly client: BinanceWeb3Client,
    private readonly readAllowance?: (chainId: string, tokenAddress: string, owner: string, spender: string) => Promise<bigint>,
    private readonly readBalance?: (chainId: string, tokenAddress: string, owner: string) => Promise<bigint>
  ) {}

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

  async platforms(platformId?: string): Promise<RwaPlatform[]> {
    return (await this.platformSnapshot(platformId)).platforms;
  }

  async platformSnapshot(platformId?: string): Promise<RwaPlatformCatalogSnapshot> {
    if (this.platformCache && this.platformCache.expiresAt > Date.now()) {
      return {
        platforms: platformId
          ? this.platformCache.data.filter((platform) => platform.platformId === platformId)
          : this.platformCache.data,
        ...(this.platformCache.sourceResponseTimestampMs !== undefined
          ? { sourceResponseTimestampMs: this.platformCache.sourceResponseTimestampMs }
          : {})
      };
    }
    const response = await this.client.get<RwaPlatformResponse[]>(
      "/api/v1/dex/market/rwa/platforms",
      {}
    );
    const data = (response.data ?? []).map((platform) => ({
      platformId: platform.platformId,
      name: platform.platformId === "ondo" ? "Ondo" : platform.platformId === "bstock" ? "bStocks" : platform.platformId,
      tickerCount: platform.tickerCount,
      chainDistribution: (platform.chainDistribution ?? []).map((item) => ({
        chainId: item.binanceChainId,
        tokenCount: item.tokenCount
      })),
      website: platform.website,
      logoUrl: platform.logoUrl
    }));
    const sourceResponseTimestampMs = typeof response.timestamp === "number" && Number.isFinite(response.timestamp) && response.timestamp > 0
      ? response.timestamp
      : undefined;
    this.platformCache = {
      expiresAt: Date.now() + 5 * 60_000,
      data,
      ...(sourceResponseTimestampMs !== undefined ? { sourceResponseTimestampMs } : {})
    };
    return {
      platforms: platformId ? data.filter((platform) => platform.platformId === platformId) : data,
      ...(sourceResponseTimestampMs !== undefined ? { sourceResponseTimestampMs } : {})
    };
  }

  async list(options: AssetSearchOptions = {}): Promise<TokenizedStockListing[]> {
    return (await this.listSnapshot(options)).listings;
  }

  async listSnapshot(options: AssetSearchOptions = {}): Promise<TokenizedStockCatalogSnapshot> {
    const [tokens, platformSnapshot] = await Promise.all([
      this.client.get<RwaTokenResponse[]>("/api/v1/dex/market/rwa/tokens", {
        ...(options.chainId ? { binanceChainId: options.chainId } : {}),
        ...(options.platformId ? { platformId: options.platformId } : {})
      }),
      this.platformSnapshot(options.platformId)
    ]);
    const platforms = platformSnapshot.platforms;
    const platformById = new Map(platforms.map((platform) => [platform.platformId, platform]));
    const listings = (tokens.data ?? []).map((token) => {
      const platform = platformById.get(token.platformId);
      const asset = normalizeStockAsset({
        binanceChainId: token.binanceChainId,
        tokenContractAddress: token.tokenContractAddress,
        platformId: token.platformId,
        tokenSymbol: token.tokenSymbol,
        underlyingTicker: token.underlyingTicker,
        underlyingName: token.underlyingName
      });
      const enrichedAsset: StockAsset = {
        ...asset,
        tokenName: token.tokenName,
        tokenLogoUrl: token.tokenLogoUrl,
        issuerLogoUrl: platform?.logoUrl,
        issuerWebsite: platform?.website
      };
      const market = normalizeMarketContext(enrichedAsset, token);
      return {
        ...enrichedAsset,
        underlyingNameZh: token.underlyingNameZh,
        tokenToShareRatio: token.tokenToShareRatio,
        tags: token.tags ?? [],
        market: {
          ...market,
          provenance: [{
            provider: "Binance Web3" as const,
            endpoint: "/api/v1/dex/market/rwa/tokens",
            fields: ["tokenPrice", "referencePrice", "marketStatus", "openState", "nextOpenTime", "volume24H"],
            ...(typeof tokens.timestamp === "number" && Number.isFinite(tokens.timestamp) && tokens.timestamp > 0
              ? { responseTimestampMs: tokens.timestamp }
              : {}),
            ...(typeof token.tokenPriceUpdatedAt === "number" && Number.isFinite(token.tokenPriceUpdatedAt) && token.tokenPriceUpdatedAt > 0
              ? { assetUpdatedAtMs: token.tokenPriceUpdatedAt }
              : {})
          }]
        },
        marketCap: token.marketCap,
        peRatioTTM: token.peRatioTTM
      };
    });
    return {
      listings,
      ...(typeof tokens.timestamp === "number" && Number.isFinite(tokens.timestamp) && tokens.timestamp > 0
        ? { sourceResponseTimestampMs: tokens.timestamp }
        : {}),
      ...(platformSnapshot.sourceResponseTimestampMs !== undefined
        ? { platformMetadataResponseTimestampMs: platformSnapshot.sourceResponseTimestampMs }
        : {})
    };
  }

  /** Fetch timestamped prices for an already observed, bounded set of exact representations. */
  async tokenPriceSnapshots(representations: RepresentationIdentity[]): Promise<DirectoryTokenPriceSnapshot[]> {
    const requestedCounts = new Map<string, number>();
    for (const item of representations) {
      const key = representationIdentityKey(item);
      requestedCounts.set(key, (requestedCounts.get(key) ?? 0) + 1);
    }

    const rawByKey = new Map<string, RwaTokenPriceResponse[]>();
    const unavailableKeys = new Set<string>();
    const byChain = new Map<string, RepresentationIdentity[]>();
    for (const item of representations) {
      byChain.set(item.chainId, [...(byChain.get(item.chainId) ?? []), item]);
    }

    for (const [chainId, chainItems] of byChain) {
      const uniqueByKey = new Map(chainItems.map((item) => [representationIdentityKey(item), item]));
      const uniqueItems = [...uniqueByKey.values()];
      const uniqueAddresses = [...new Set(uniqueItems.map((item) => item.contractAddress))];
      for (let offset = 0; offset < uniqueAddresses.length; offset += 100) {
        const addresses = uniqueAddresses.slice(offset, offset + 100);
        const chunkKeys = new Set(uniqueItems
          .filter((item) => addresses.includes(item.contractAddress))
          .map(representationIdentityKey));
        try {
          const response = await this.client.get<RwaTokenPriceResponse[]>(
            "/api/v1/dex/market/rwa/price",
            { binanceChainId: chainId, tokenContractAddresses: addresses.join(",") }
          );
          for (const row of response.data ?? []) {
            const key = representationIdentityKey({
              chainId: row.binanceChainId,
              platformId: row.platformId,
              contractAddress: row.tokenContractAddress
            });
            rawByKey.set(key, [...(rawByKey.get(key) ?? []), row]);
          }
        } catch {
          for (const key of chunkKeys) unavailableKeys.add(key);
        }
      }
    }

    return representations.map((item) => {
      const key = representationIdentityKey(item);
      const base = { ...item };
      if ((requestedCounts.get(key) ?? 0) > 1) return { ...base, state: "ambiguous" };
      if (unavailableKeys.has(key)) return { ...base, state: "unavailable" };
      const rows = rawByKey.get(key) ?? [];
      if (rows.length > 1) return { ...base, state: "ambiguous" };
      const row = rows[0];
      if (!row) return { ...base, state: "missing" };
      const price = positiveDecimal(row.tokenPrice);
      const timestamp = row.tokenPriceUpdatedAt;
      if (!price || typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
        return { ...base, state: "invalid" };
      }
      const referencePrice = positiveDecimal(row.referencePrice);
      return {
        ...base,
        state: "available",
        tokenPrice: price,
        ...(referencePrice ? { referencePrice } : {}),
        tokenPriceUpdatedAt: timestamp
      };
    });
  }

  async marketContext(asset: StockAsset): Promise<MarketContext> {
    const [context] = await this.marketContexts([asset]);
    if (!context) throw new Error(`Market context unavailable for ${makeAssetId(asset.chainId, asset.contractAddress)}`);
    return context;
  }

  async marketContexts(assets: StockAsset[]): Promise<MarketContext[]> {
    if (!assets.length) return [];
    const platforms = await this.platforms();
    const contexts = new Map<string, MarketContext>();
    const assetsByChain = new Map<string, StockAsset[]>();
    for (const asset of assets) assetsByChain.set(asset.chainId, [...(assetsByChain.get(asset.chainId) ?? []), asset]);

    for (const [chainId, chainAssets] of assetsByChain) {
      const response = await this.client.get<RwaTokenResponse[]>(
        "/api/v1/dex/market/rwa/tokens",
        { binanceChainId: chainId }
      );
      const tokensById = new Map((response.data ?? []).map((item) => [makeAssetId(item.binanceChainId, item.tokenContractAddress), item]));
      const uniqueAddresses = [...new Set(chainAssets.map((asset) => asset.contractAddress))];
      const pricesById = new Map<string, RwaTokenPriceResponse>();
      const priceResponseTimesById = new Map<string, number>();
      for (let offset = 0; offset < uniqueAddresses.length; offset += 100) {
        const addresses = uniqueAddresses.slice(offset, offset + 100);
        const priceResponse = await this.client.get<RwaTokenPriceResponse[]>(
          "/api/v1/dex/market/rwa/price",
          { binanceChainId: chainId, tokenContractAddresses: addresses.join(",") }
        );
        for (const snapshot of priceResponse.data ?? []) {
          const key = makeAssetId(snapshot.binanceChainId, snapshot.tokenContractAddress);
          pricesById.set(key, snapshot);
          if (typeof priceResponse.timestamp === "number" && Number.isFinite(priceResponse.timestamp) && priceResponse.timestamp > 0) {
            priceResponseTimesById.set(key, priceResponse.timestamp);
          }
        }
      }

      for (const asset of chainAssets) {
        const assetKey = makeAssetId(asset.chainId, asset.contractAddress);
        const match = tokensById.get(assetKey);
        if (!match || match.platformId !== asset.platformId) {
          throw new Error(`Asset not found in RWA token list: ${assetKey}`);
        }
        const priceSnapshot = pricesById.get(assetKey);
        if (!priceSnapshot || priceSnapshot.platformId !== asset.platformId ||
          typeof priceSnapshot.tokenPriceUpdatedAt !== "number" ||
          !Number.isFinite(priceSnapshot.tokenPriceUpdatedAt) || priceSnapshot.tokenPriceUpdatedAt <= 0) {
          throw new Error(`A timestamped RWA price snapshot was not returned for ${assetKey}`);
        }
        const platform = platforms.find((item) => item.platformId === match.platformId);
        const enrichedAsset: StockAsset = {
          ...asset,
          tokenName: match.tokenName,
          tokenLogoUrl: match.tokenLogoUrl,
          issuerLogoUrl: platform?.logoUrl,
          issuerWebsite: platform?.website
        };
        const market = normalizeMarketContext(enrichedAsset, { ...match, ...priceSnapshot });
        contexts.set(assetKey, {
          ...market,
          provenance: [
            {
              provider: "Binance Web3" as const,
              endpoint: "/api/v1/dex/market/rwa/price",
              fields: ["tokenPrice", "referencePrice", "tokenPriceUpdatedAt"],
              ...(priceResponseTimesById.has(assetKey) ? { responseTimestampMs: priceResponseTimesById.get(assetKey) } : {}),
              assetUpdatedAtMs: priceSnapshot.tokenPriceUpdatedAt
            },
            {
              provider: "Binance Web3" as const,
              endpoint: "/api/v1/dex/market/rwa/tokens",
              fields: ["marketStatus", "openState", "nextOpenTime", "volume24H"],
              ...(typeof response.timestamp === "number" && Number.isFinite(response.timestamp) && response.timestamp > 0
                ? { responseTimestampMs: response.timestamp }
                : {})
            }
          ]
        });
      }
    }

    return assets.map((asset) => {
      const context = contexts.get(makeAssetId(asset.chainId, asset.contractAddress));
      if (!context) throw new Error(`Market context unavailable for ${makeAssetId(asset.chainId, asset.contractAddress)}`);
      return context;
    });
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
    const amount = parseTokenAmount(intent.amount, intent.amountDecimals).toString();
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
    const amount = parseTokenAmount(intent.amount, intent.amountDecimals).toString();
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
    const amount = parseTokenAmount(intent.amount, intent.amountDecimals).toString();
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
      planId: `plan_${randomUUID()}`,
      status: quote.success ? "draft" : "failed",
      intent,
      assetContext: market,
      quoteId: quote.routes[0]?.quoteId,
      expectedOutput: quote.routes[0]?.toTokenAmount,
      safetyReport: undefined,
      requiresUserConfirmation: true
    };
    const route = quote.routes[0];
    const requiredAllowance = parseTokenAmount(intent.amount, intent.amountDecimals);
    let availableBalance: bigint | undefined;
    let balanceError: string | undefined;
    try {
      availableBalance = await (this.readBalance ?? ((...args) => new TransactionService(this.client).erc20Balance(...args)))(
        intent.toAsset.chainId, intent.fromTokenAddress, intent.walletAddress
      );
    } catch (error) {
      balanceError = error instanceof Error ? error.message : String(error);
    }
    let allowance: bigint | undefined;
    if (route?.approvalTarget) {
      try {
        allowance = await (this.readAllowance ?? ((...args) => new TransactionService(this.client).erc20Allowance(...args)))(
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
    plan.safetyReport = evaluateSafety({ plan, market, quote, allowance, requiredAllowance, availableBalance, requiredBalance: requiredAllowance, balanceError });
    if (route?.approvalTarget && allowance !== undefined && allowance < requiredAllowance) {
      plan.approvalRequired = {
        tokenAddress: intent.fromTokenAddress,
        spender: route.approvalTarget,
        requiredAmount: requiredAllowance.toString(),
        currentAllowance: allowance.toString()
      };
    }
    if (route?.approvalTarget && allowance !== undefined) {
      plan.authorizationCheck = {
        required: true,
        tokenAddress: intent.fromTokenAddress,
        spender: route.approvalTarget,
        requiredAmount: requiredAllowance.toString(),
        reviewedAllowance: allowance.toString()
      };
    }
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
    if (plan.status === "awaiting_confirmation" && plan.safetyReport?.passed && plan.unsignedActions?.length) {
      markSdkPreparedPlan(plan);
    }
    return plan;
  }
}
