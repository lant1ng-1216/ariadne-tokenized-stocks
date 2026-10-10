import { BinanceWeb3Client } from "../binance-web3-client.js";
import {
  makeAssetId,
  normalizeMarketContext,
  normalizeProviderTimestamp,
  normalizeStockAsset,
  positiveDecimal
} from "../domain/normalizers.js";
import type { ActionPlan, AllowanceApprovalPlan, MarketContext, RwaPlatform, StockAsset, TokenizedStockListing, VerifiedTokenIdentity } from "../domain/types.js";
import { normalizeQuote } from "../domain/normalizers.js";
import type { QuoteResult, TradeIntent, UnsignedAction } from "../domain/types.js";
import { evaluateSafety } from "../domain/safety.js";
import { TransactionService } from "./transaction.js";
import { formatTokenAmount, minimumOutputAfterSlippage, parseTokenAmount } from "../domain/amount.js";
import { markSdkPreparedPlan } from "../domain/prepared-plan-provenance.js";
import { randomUUID } from "node:crypto";
import { jsonDataFingerprint } from "../domain/json-snapshot.js";
import { representationIdentityKey, type RepresentationIdentity } from "./asset-coverage-audit.js";
import { resolveBscInputToken, verifyBscStockToken } from "./bsc-token-registry.js";
import { PurchasePlanStageError, type PurchasePlanStage } from "./purchase-plan-error.js";

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
  assetType?: number;
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
    reasonCode?: string | number;
    reasonMsg?: string;
    nextCloseTime?: number;
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

export type CurrentDirectoryAssetSearch = {
  /** Search matches whose exact chain, issuer and contract identity is still present in the current provider directory. */
  assets: StockAsset[];
  /** Search matches that the provider search endpoint still returns after the exact representation left the directory. */
  staleSearchMatches: StockAsset[];
  directoryWarnings: string[];
};

export const CATALOG_SCOPE_WARNING = "Provider search and directory results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified";

export type TokenizedStockCatalogSnapshot = {
  listings: TokenizedStockListing[];
  /** The provider has not established that returned rows represent the complete catalog. */
  warnings: string[];
  /** Provider catalog-response time in Unix milliseconds; not a per-asset quote timestamp. */
  sourceResponseTimestampMs?: number;
  /** Platform metadata response time in Unix milliseconds; separate from the token-list snapshot. */
  platformMetadataResponseTimestampMs?: number;
};

const preparedApprovalSnapshots = new WeakMap<AllowanceApprovalPlan, string>();

export type RwaPlatformCatalogSnapshot = {
  platforms: RwaPlatform[];
  /** Provider platform-metadata response time in Unix milliseconds. */
  sourceResponseTimestampMs?: number;
};

export type CandleOptions = { bar?: string; after?: number; before?: number; limit?: number };

function decimalBpsDifference(left: string, right: string): bigint | undefined {
  if (!/^\d+(?:\.\d+)?$/.test(left) || !/^\d+(?:\.\d+)?$/.test(right)) return undefined;
  const decimals = Math.max(left.split(".")[1]?.length ?? 0, right.split(".")[1]?.length ?? 0);
  const scale = 10n ** BigInt(decimals);
  const toUnits = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole!) * scale + BigInt(fraction.padEnd(decimals, "0") || "0");
  };
  const baseline = toUnits(right);
  if (baseline <= 0n) return undefined;
  const current = toUnits(left);
  const difference = current >= baseline ? current - baseline : baseline - current;
  return difference * 10_000n / baseline;
}

export class TokenizedStocksService {
  private platformCache?: { expiresAt: number; data: RwaPlatform[]; sourceResponseTimestampMs?: number };

  constructor(
    private readonly client: BinanceWeb3Client,
    private readonly readAllowance?: (chainId: string, tokenAddress: string, owner: string, spender: string) => Promise<bigint>,
    private readonly readBalance?: (chainId: string, tokenAddress: string, owner: string) => Promise<bigint>,
    private readonly readTokenMetadata?: (chainId: string, tokenAddress: string) => Promise<VerifiedTokenIdentity>,
    private readonly readReceipt?: (chainId: string, txHash: string) => Promise<unknown | null>,
    private readonly readTransaction?: (chainId: string, txHash: string) => Promise<unknown | null>,
    private readonly readLatestFinalizedBlockNumber?: (chainId: string) => Promise<bigint>,
    _readNativeBalance?: (chainId: string, owner: string) => Promise<bigint>
  ) {}

  async search(query: string, options: AssetSearchOptions = {}): Promise<StockAsset[]> {
    const keyword = typeof query === "string" ? query.trim() : "";
    if (!keyword) throw new TypeError("TokenizedStocksService.search query must not be empty");
    const response = await this.client.get<RwaSearchResponse[]>(
      "/api/v1/dex/market/rwa/search",
      {
        keyword,
        ...(options.platformId ? { platformId: options.platformId } : {})
      }
    );

    const results: StockAsset[] = [];
    for (const match of response.data ?? []) {
      for (const asset of match.assets ?? []) {
        if (options.chainId && asset.binanceChainId !== options.chainId) continue;
        const normalized = normalizeStockAsset({
          binanceChainId: asset.binanceChainId,
          tokenContractAddress: asset.tokenContractAddress,
          platformId: asset.platformId,
          tokenSymbol: asset.tokenSymbol,
          assetType: asset.assetType,
          underlyingTicker: match.ticker,
          underlyingName: match.companyName?.trim() || match.ticker
        });
        results.push({ ...normalized, collectionWarnings: [CATALOG_SCOPE_WARNING] });
      }
    }
    return results;
  }

  /**
   * Resolve a human search against the provider's current representation
   * directory. Provider search and directory endpoints can drift independently;
   * an old search hit must never become a quote or purchase-plan identity after
   * its exact chain/platform/contract tuple disappears from the directory.
   */
  async searchCurrentDirectory(
    query: string,
    options: AssetSearchOptions = {},
  ): Promise<CurrentDirectoryAssetSearch> {
    const [searchMatches, directory] = await Promise.all([
      this.search(query, options),
      this.listSnapshot(options),
    ]);
    const directoryByIdentity = new Map(directory.listings.map((listing) => [
      representationIdentityKey(listing),
      listing,
    ]));
    const assetsByIdentity = new Map<string, StockAsset>();
    const staleByIdentity = new Map<string, StockAsset>();

    for (const match of searchMatches) {
      const key = representationIdentityKey(match);
      const current = directoryByIdentity.get(key);
      if (current) assetsByIdentity.set(key, current);
      else staleByIdentity.set(key, match);
    }

    return {
      assets: [...assetsByIdentity.values()],
      staleSearchMatches: [...staleByIdentity.values()],
      directoryWarnings: directory.warnings,
    };
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
    const sourceResponseTimestampMs = normalizeProviderTimestamp(response.timestamp);
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
    const sourceResponseTimestampMs = normalizeProviderTimestamp(tokens.timestamp);
    const listings = (tokens.data ?? []).map((token) => {
      const platform = platformById.get(token.platformId);
      const providerUnderlyingNameMissing = !token.underlyingName?.trim();
      const asset = normalizeStockAsset({
        binanceChainId: token.binanceChainId,
        tokenContractAddress: token.tokenContractAddress,
        platformId: token.platformId,
        tokenSymbol: token.tokenSymbol,
        underlyingTicker: token.underlyingTicker,
        underlyingName: token.underlyingName?.trim() || token.underlyingTicker,
        assetType: token.assetType
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
          dataWarnings: providerUnderlyingNameMissing
            ? [...market.dataWarnings, "Provider did not return an underlying name; Ariadne displays the provider ticker as a fallback"]
            : market.dataWarnings,
          provenance: [{
            provider: "Binance Web3" as const,
            endpoint: "/api/v1/dex/market/rwa/tokens",
            fields: ["tokenPrice", "referencePrice", "assetType", "marketStatus", "openState", "reasonCode", "reasonMsg", "nextOpenTime", "nextCloseTime", "volume24H"],
            ...(sourceResponseTimestampMs !== undefined
              ? { responseTimestampMs: sourceResponseTimestampMs }
              : {}),
            ...(market.tokenPriceUpdatedAt !== undefined
              ? { assetUpdatedAtMs: market.tokenPriceUpdatedAt }
              : {})
          }]
        },
        marketCap: token.marketCap,
        peRatioTTM: token.peRatioTTM
      };
    });
    return {
      listings,
      warnings: [CATALOG_SCOPE_WARNING],
      ...(sourceResponseTimestampMs !== undefined
        ? { sourceResponseTimestampMs }
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
      // Binance's live RWA price endpoint currently returns invalid JSON for a
      // 100-address query while 50-address queries remain valid. Keep this
      // adapter boundary below the observed provider limit.
      for (let offset = 0; offset < uniqueAddresses.length; offset += 50) {
        const addresses = uniqueAddresses.slice(offset, offset + 50);
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
      const timestamp = normalizeProviderTimestamp(row.tokenPriceUpdatedAt);
      if (!price || timestamp === undefined) {
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
      for (let offset = 0; offset < uniqueAddresses.length; offset += 50) {
        const addresses = uniqueAddresses.slice(offset, offset + 50);
        const priceResponse = await this.client.get<RwaTokenPriceResponse[]>(
          "/api/v1/dex/market/rwa/price",
          { binanceChainId: chainId, tokenContractAddresses: addresses.join(",") }
        );
        for (const snapshot of priceResponse.data ?? []) {
          const key = makeAssetId(snapshot.binanceChainId, snapshot.tokenContractAddress);
          pricesById.set(key, snapshot);
          const priceResponseTimestamp = normalizeProviderTimestamp(priceResponse.timestamp);
          if (priceResponseTimestamp !== undefined) priceResponseTimesById.set(key, priceResponseTimestamp);
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
          normalizeProviderTimestamp(priceSnapshot.tokenPriceUpdatedAt) === undefined) {
          throw new Error(`A timestamped RWA price snapshot was not returned for ${assetKey}`);
        }
        const platform = platforms.find((item) => item.platformId === match.platformId);
        const enrichedAsset: StockAsset = {
          ...asset,
          ...(asset.assetType === undefined && match.assetType !== undefined ? { assetType: match.assetType } : {}),
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
              ...(market.tokenPriceUpdatedAt !== undefined ? { assetUpdatedAtMs: market.tokenPriceUpdatedAt } : {})
            },
            {
              provider: "Binance Web3" as const,
              endpoint: "/api/v1/dex/market/rwa/tokens",
              fields: ["assetType", "marketStatus", "openState", "reasonCode", "reasonMsg", "nextOpenTime", "nextCloseTime", "volume24H"],
              ...(normalizeProviderTimestamp(response.timestamp) !== undefined
                ? { responseTimestampMs: normalizeProviderTimestamp(response.timestamp) }
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
    const maxSlippageBps = intent.maxSlippageBps;
    if (typeof maxSlippageBps !== "number" || !Number.isInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 10_000) {
      throw new Error("An explicit user-reviewed maximum slippage in basis points is required before building a transaction");
    }
    if (quote.routes.length !== 1) throw new Error("Cannot build an action when the quote does not contain exactly one unambiguous route");
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
      slippagePercent: (maxSlippageBps / 100).toString(),
      priceImpactProtectionPercent: "90"
    };
    const response = await this.client.get<any>("/api/v1/dex/aggregator/swap", query);
    if (response.code !== 0 || response.success !== true || !response.data) {
      throw new Error(`Swap build failed: ${response.msg ?? "unknown error"}`);
    }
    const executionMode = response.data.executionMode ?? (response.data.rfq ? "RFQ" : response.data.tx ? "SWAP" : undefined);
    const expectedMode = route.executionMode ?? (quote.platformMode === "rfq" ? "RFQ" : quote.platformMode === "standard" ? "SWAP" : undefined);
    if ((expectedMode !== "SWAP" && expectedMode !== "RFQ") || executionMode !== expectedMode) {
      throw new Error(`Quote/build execution mode mismatch: quote=${expectedMode ?? "unknown"}, build=${executionMode ?? "unknown"}`);
    }
    if (quote.platformMode === "rfq") {
      const rfq = response.data.rfq;
      if (!rfq?.typedDataToSign || !rfq.vendor || !rfq.orderId) {
        throw new Error("RFQ swap response is incomplete: typedDataToSign, vendor, and orderId are required before signing");
      }
    }
    const expiresAt = Math.min(route.expiresAt ?? Date.now() + 30_000, Date.now() + 30_000);
    if (expiresAt <= Date.now()) throw new Error("Quote expired before its unsigned action was built; request a fresh quote");
    return {
      kind: executionMode === "RFQ" ? "rfq_order" : "evm_transaction",
      chainId: intent.toAsset.chainId,
      quoteId: route.quoteId,
      expiresAt,
      payload: response.data
    };
  }

  async buildApprovalAction(intent: TradeIntent, quote: QuoteResult): Promise<UnsignedAction | undefined> {
    if (quote.routes.length !== 1) throw new Error("Cannot build approval when the quote does not contain exactly one unambiguous route");
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
    const approval = response.data[0] as { data?: unknown; dexContractAddress?: unknown; gasLimit?: unknown; gasPrice?: unknown };
    const calldata = typeof approval?.data === "string" ? approval.data : "";
    if (!/^0x095ea7b3[0-9a-fA-F]{128}$/.test(calldata)) throw new Error("Approval API returned calldata that is not a single ERC-20 approve(address,uint256)");
    const spender = `0x${calldata.slice(34, 74)}`;
    const approvedAmount = BigInt(`0x${calldata.slice(74, 138)}`);
    if (!route.approvalTarget || spender.toLowerCase() !== route.approvalTarget.toLowerCase() ||
      (typeof approval.dexContractAddress === "string" && approval.dexContractAddress.toLowerCase() !== spender.toLowerCase()) || approvedAmount !== BigInt(amount)) {
      throw new Error("Approval transaction does not match the quote spender and exact required token amount");
    }
    return {
      kind: "evm_transaction",
      chainId: intent.toAsset.chainId,
      quoteId: route.quoteId,
      // Approval calldata itself is independent from quote expiry; keep a short review window, then quote the swap again afterward.
      expiresAt: Date.now() + 5 * 60_000,
      payload: {
        ...approval,
        tx: {
          from: intent.walletAddress,
          to: intent.fromTokenAddress,
          value: "0",
          data: calldata,
          ...(typeof approval.gasLimit === "string" ? { gas: approval.gasLimit } : {}),
          ...(typeof approval.gasPrice === "string" ? { gasPrice: approval.gasPrice } : {})
        }
      }
    };
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
    const maxSlippageBps = intent.maxSlippageBps;
    if (typeof maxSlippageBps !== "number" || !Number.isInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 10_000) {
      throw new Error("An explicit user-reviewed maximum slippage in basis points is required before preparing a transaction plan");
    }
    const [marketResult, quoteResult] = await Promise.allSettled([
      this.marketContext(intent.toAsset),
      this.quote(intent)
    ]);
    if (marketResult.status === "rejected") throw new PurchasePlanStageError("market_context", marketResult.reason);
    if (quoteResult.status === "rejected") throw new PurchasePlanStageError("price_quote", quoteResult.reason);
    const market = marketResult.value;
    const quote = quoteResult.value;
    const route = quote.routes.length === 1 ? quote.routes[0] : undefined;
    const plan: ActionPlan = {
      planId: `plan_${randomUUID()}`,
      status: quote.success ? "draft" : "failed",
      intent,
      assetContext: market,
      quoteId: route?.quoteId,
      expectedOutput: route?.toTokenAmount,
      executionMode: route?.executionMode,
      minimumOutput: route?.toTokenAmount && /^\d+$/.test(route.toTokenAmount)
        ? minimumOutputAfterSlippage(route.toTokenAmount, maxSlippageBps)
        : undefined,
      safetyReport: undefined,
      estimatedFees: {
        ...(route?.providerRouteFeeUsd ? { providerRouteFeeUsd: route.providerRouteFeeUsd } : {}),
        ...(route?.estimatedGasFeeBaseUnits ? { providerGasFeeBaseUnits: route.estimatedGasFeeBaseUnits } : {}),
        ...(intent.maxGasCostBnb ? { nativeGasBudgetBnb: intent.maxGasCostBnb } : {})
      },
      requiresUserConfirmation: true
    };
    if (!route) {
      plan.status = "failed";
      plan.preparationDiagnostics = [{
        stage: "price_quote",
        status: "failed",
        retryable: false,
        attempts: 1,
        message: quote.routes.length > 1
          ? "Provider returned multiple quote routes; an explicit route selection is required before preparing an action"
          : "Provider did not return exactly one executable quote route"
      }];
      plan.safetyReport = {
        passed: false,
        checks: [],
        blockingReasons: [quote.routes.length > 1
          ? "Provider returned multiple quote routes; an explicit route selection is required before preparing an action"
          : "Provider did not return exactly one executable quote route"]
      };
      return plan;
    }
    const requiredAllowance = parseTokenAmount(intent.amount, intent.amountDecimals);
    let allowance: bigint | undefined;
    let allowanceReadError: unknown;
    if (route?.approvalTarget) {
      try {
        allowance = await (this.readAllowance ?? ((...args) => new TransactionService(this.client).erc20Allowance(...args)))(
          intent.toAsset.chainId,
          intent.fromTokenAddress,
          intent.walletAddress,
          route.approvalTarget
        );
      } catch (error) {
        allowanceReadError = error;
        // A read failure does not prevent a quote-backed purchase plan. The
        // wallet flow will re-check authorization before requesting a swap.
      }
    }
    plan.safetyReport = evaluateSafety({ plan, market, quote, allowance, requiredAllowance });
    if (route?.approvalTarget && allowance !== undefined && allowance < requiredAllowance) {
      plan.approvalRequired = {
        tokenAddress: intent.fromTokenAddress,
        spender: route.approvalTarget,
        requiredAmount: requiredAllowance.toString(),
        currentAllowance: allowance.toString()
      };
    }
    if (route?.approvalTarget) {
      plan.authorizationCheck = {
        required: true,
        tokenAddress: intent.fromTokenAddress,
        spender: route.approvalTarget,
        requiredAmount: requiredAllowance.toString(),
        ...(allowance !== undefined ? { reviewedAllowance: allowance.toString(), allowanceReadStatus: "verified" as const } : { allowanceReadStatus: "unavailable" as const })
      };
    }
    if (allowanceReadError) {
      const stageError = new PurchasePlanStageError("allowance_check", allowanceReadError);
      plan.preparationDiagnostics = [...(plan.preparationDiagnostics ?? []), {
        stage: stageError.stage,
        status: "unavailable",
        retryable: stageError.retryable,
        attempts: stageError.attempts,
        message: stageError.causeMessage
      }];
    }
    if (!plan.safetyReport.passed) plan.status = "failed";
    if (plan.status !== "failed") {
      try {
        plan.unsignedActions = [await this.buildUnsignedAction(intent, quote)];
        plan.status = "awaiting_confirmation";
        plan.expiresAt = (plan.unsignedActions[0] as UnsignedAction).expiresAt;
      } catch (error) {
        const stageError = new PurchasePlanStageError("swap_build", error);
        plan.status = "failed";
        plan.preparationDiagnostics = [...(plan.preparationDiagnostics ?? []), {
          stage: stageError.stage,
          status: "failed",
          retryable: stageError.retryable,
          attempts: stageError.attempts,
          message: stageError.causeMessage
        }];
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

  /** Prepare the supported BSC USDT-to-stock route using on-chain token identity and decimal checks. */
  async createBscStockPurchasePlan(input: {
    walletAddress: string;
    inputTokenSymbol: string;
    amount: string;
    toAsset: StockAsset;
    maxSlippageBps: number;
    maxGasCostBnb?: string;
  }): Promise<ActionPlan> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input.walletAddress)) throw new Error("BSC stock purchase requires a valid EVM wallet address");
    if (input.toAsset.chainId !== "56") throw new Error("The first funded-closure route supports BSC chain 56 only");
    if (!input.toAsset.platformId.trim()) throw new Error("The BSC stock purchase requires an exact Binance Web3 issuer identity");
    if (!Number.isInteger(input.maxSlippageBps) || input.maxSlippageBps < 0 || input.maxSlippageBps > 10_000) {
      throw new Error("A user-reviewed maximum slippage in basis points is required for a BSC stock purchase");
    }
    const transactionService = new TransactionService(this.client);
    const readMetadata = this.readTokenMetadata ?? ((chainId: string, tokenAddress: string) => transactionService.erc20TokenMetadata(chainId, tokenAddress));
    const [inputIdentityResult, outputIdentityResult] = await Promise.allSettled([
      resolveBscInputToken({ erc20TokenMetadata: readMetadata }, input.inputTokenSymbol, "56"),
      verifyBscStockToken({ erc20TokenMetadata: readMetadata }, input.toAsset)
    ]);
    if (inputIdentityResult.status === "rejected") throw new PurchasePlanStageError("input_token_verification", inputIdentityResult.reason);
    if (outputIdentityResult.status === "rejected") throw new PurchasePlanStageError("stock_token_verification", outputIdentityResult.reason);
    const verifiedInput = inputIdentityResult.value;
    const verifiedOutput = outputIdentityResult.value;
    const intent: TradeIntent = {
      type: "buy",
      walletAddress: input.walletAddress,
      fromTokenAddress: verifiedInput.contractAddress,
      amount: input.amount,
      amountDecimals: verifiedInput.decimals,
      maxSlippageBps: input.maxSlippageBps,
      maxGasCostBnb: input.maxGasCostBnb,
      toAsset: input.toAsset
    };
    const plan = await this.createActionPlan(intent);
    plan.verifiedTokens = { input: verifiedInput, output: verifiedOutput };
    const action = plan.unsignedActions?.[0] as UnsignedAction | undefined;
    if (plan.status !== "failed" && (action?.kind !== "evm_transaction" || plan.executionMode !== "SWAP" || plan.assetContext?.asset.chainId !== "56")) {
      plan.status = "failed";
      plan.safetyReport = {
        passed: false,
        checks: plan.safetyReport?.checks ?? [],
        blockingReasons: [...(plan.safetyReport?.blockingReasons ?? []), "The supported BSC purchase path requires one standard EVM swap action"]
      };
      plan.unsignedActions = undefined;
      plan.expiresAt = undefined;
    }
    if (plan.status !== "failed" && !plan.minimumOutput) {
      plan.status = "failed";
      plan.safetyReport = {
        passed: false,
        checks: plan.safetyReport?.checks ?? [],
        blockingReasons: [...(plan.safetyReport?.blockingReasons ?? []), "Quote is missing a usable expected output; a reviewed minimum output cannot be calculated"]
      };
      plan.unsignedActions = undefined;
      plan.expiresAt = undefined;
    }
    if (plan.status !== "failed" && action?.kind === "evm_transaction") {
      let failureStage: PurchasePlanStage = "transaction_validation";
      try {
        const tx = (action.payload as { tx?: { from: string; to: string; value: string; data?: string; gas?: string; gasLimit?: string; gasPrice?: string; minReceiveAmount?: string; slippagePercent?: string } })?.tx;
        if (!tx) throw new Error("Swap action does not include an EVM transaction");
        const expectedSlippage = (input.maxSlippageBps / 100).toString();
        if (typeof tx.minReceiveAmount !== "string" || !/^\d+$/.test(tx.minReceiveAmount) || BigInt(tx.minReceiveAmount) < BigInt(plan.minimumOutput!) ||
          typeof tx.slippagePercent !== "string" || tx.slippagePercent !== expectedSlippage) {
          throw new Error("Built swap transaction does not prove the reviewed minimum output and exact slippage limit");
        }
        plan.minimumOutput = tx.minReceiveAmount;
        if (plan.approvalRequired || plan.authorizationCheck?.reviewedAllowance === undefined) {
          // A swap gas-limit simulation commonly reverts before allowance is
          // granted, and a failed allowance read leaves that prerequisite
          // unverified. Keep the user's requested plan visible and estimate
          // its swap fee only after allowance is confirmed and a fresh quote
          // is fetched. The approval transaction has its own fee estimate and
          // wallet review.
          plan.estimatedFees = {
            ...plan.estimatedFees,
            ...(input.maxGasCostBnb ? { nativeGasBudgetBnb: input.maxGasCostBnb, gasBudgetSource: "user_provided" as const } : {}),
            feeEstimateStatus: "deferred_until_allowance"
          };
        } else {
          failureStage = "gas_estimate";
          const fee = await transactionService.estimateBscEvmCost("56", tx);
          plan.estimatedFees = {
            ...plan.estimatedFees,
            networkGasLimit: fee.gasLimit,
            highGasPriceWei: fee.highGasPriceWei,
            estimatedMaxGasCostBnb: fee.estimatedMaxGasCostBnb,
            nativeGasBudgetBnb: input.maxGasCostBnb ?? fee.estimatedMaxGasCostBnb,
            gasBudgetSource: input.maxGasCostBnb ? "user_provided" : "provider_high_tier_estimate"
          };
          const reviewedGasBudgetBnb = input.maxGasCostBnb ?? fee.estimatedMaxGasCostBnb;
          plan.intent.maxGasCostBnb = reviewedGasBudgetBnb;
          if (parseTokenAmount(reviewedGasBudgetBnb, 18) < BigInt(fee.gasLimit) * BigInt(fee.highGasPriceWei)) {
            throw new Error(`Maximum gas budget ${reviewedGasBudgetBnb} BNB is below the current high-tier estimate ${fee.estimatedMaxGasCostBnb} BNB`);
          }
        }
      } catch (error) {
        const stageError = new PurchasePlanStageError(failureStage, error);
        plan.status = "failed";
        plan.preparationDiagnostics = [...(plan.preparationDiagnostics ?? []), {
          stage: stageError.stage as NonNullable<ActionPlan["preparationDiagnostics"]>[number]["stage"],
          status: "failed",
          retryable: stageError.retryable,
          attempts: stageError.attempts,
          message: stageError.causeMessage
        }];
        plan.safetyReport = {
          passed: false,
          checks: plan.safetyReport?.checks ?? [],
          blockingReasons: [...(plan.safetyReport?.blockingReasons ?? []), `Unable to verify BSC gas estimate/budget: ${error instanceof Error ? error.message : String(error)}`]
        };
        plan.unsignedActions = undefined;
        plan.expiresAt = undefined;
      }
    }
    if (plan.status === "awaiting_confirmation" && plan.safetyReport?.passed && plan.unsignedActions?.length) markSdkPreparedPlan(plan);
    return plan;
  }

  /** Build a distinct exact-amount allowance transaction; this never approves the swap or submits the approval. */
  async prepareBscStockAllowanceApproval(input: {
    walletAddress: string;
    inputTokenSymbol: string;
    amount: string;
    toAsset: StockAsset;
    maxSlippageBps: number;
    maxGasCostBnb?: string;
    purchaseMaxGasCostBnb?: string;
    confirmedPurchasePlan?: ActionPlan;
  }): Promise<AllowanceApprovalPlan> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input.walletAddress)) throw new Error("Allowance approval requires a valid BSC wallet address");
    if (input.toAsset.chainId !== "56" || !input.toAsset.platformId.trim()) throw new Error("Allowance approval requires an explicitly selected Binance Web3 BSC stock representation");
    if (!Number.isInteger(input.maxSlippageBps) || input.maxSlippageBps < 0 || input.maxSlippageBps > 10_000) {
      throw new Error("A user-reviewed maximum slippage in basis points is required for the subsequent purchase");
    }
    const transactionService = new TransactionService(this.client);
    const readMetadata = this.readTokenMetadata ?? ((chainId: string, tokenAddress: string) => transactionService.erc20TokenMetadata(chainId, tokenAddress));
    const [inputToken, outputToken, market] = await Promise.all([
      resolveBscInputToken({ erc20TokenMetadata: readMetadata }, input.inputTokenSymbol, "56"),
      verifyBscStockToken({ erc20TokenMetadata: readMetadata }, input.toAsset),
      this.marketContext(input.toAsset)
    ]);
    const confirmedPurchasePlan = input.confirmedPurchasePlan;
    if (confirmedPurchasePlan) {
      const parent = confirmedPurchasePlan;
      if (parent.status !== "confirmed" || parent.requiresUserConfirmation || !parent.verifiedTokens || !parent.minimumOutput || !parent.expectedOutput ||
        parent.intent.walletAddress.toLowerCase() !== input.walletAddress.toLowerCase() ||
        parent.intent.fromTokenAddress.toLowerCase() !== inputToken.contractAddress.toLowerCase() ||
        parent.intent.amount !== input.amount || parent.intent.maxSlippageBps !== input.maxSlippageBps ||
        parent.intent.toAsset.chainId !== input.toAsset.chainId || parent.intent.toAsset.platformId !== input.toAsset.platformId ||
        parent.intent.toAsset.contractAddress.toLowerCase() !== input.toAsset.contractAddress.toLowerCase() ||
        parent.verifiedTokens.output.contractAddress.toLowerCase() !== outputToken.contractAddress.toLowerCase() ||
        !parent.authorizationCheck?.required || !parent.authorizationCheck.spender) {
        throw new Error("The allowance must be bound to the exact confirmed wallet, amount, BSC stock token, issuer, spender and slippage plan");
      }
      if (input.purchaseMaxGasCostBnb && parent.intent.maxGasCostBnb && parseTokenAmount(input.purchaseMaxGasCostBnb, 18) > parseTokenAmount(parent.intent.maxGasCostBnb, 18)) {
        throw new Error("The allowance step cannot raise the confirmed purchase gas limit");
      }
    }
    const intent: TradeIntent = {
      type: "buy", walletAddress: input.walletAddress, fromTokenAddress: inputToken.contractAddress,
      amount: input.amount, amountDecimals: inputToken.decimals, toAsset: input.toAsset,
      maxSlippageBps: input.maxSlippageBps, maxGasCostBnb: input.maxGasCostBnb
    };
    const quote = await this.quote(intent);
    if (quote.routes.length !== 1) throw new Error("Allowance approval requires exactly one unambiguous quote route");
    const route = quote.routes[0];
    if (!quote.success || quote.platformMode !== "standard" || route?.executionMode !== "SWAP" || !route.quoteId ||
      !route.approvalTarget || !/^0x[0-9a-fA-F]{40}$/.test(route.approvalTarget)) {
      throw new Error("The selected representation has no supported standard BSC swap quote with a verified approval spender");
    }
    if (input.confirmedPurchasePlan?.authorizationCheck?.spender && route.approvalTarget.toLowerCase() !== input.confirmedPurchasePlan.authorizationCheck.spender.toLowerCase()) {
      throw new Error("The current approval route uses a different spender than the confirmed purchase plan");
    }
    const amountBaseUnits = parseTokenAmount(intent.amount, intent.amountDecimals);
    const allowance = await (this.readAllowance ?? ((...args) => transactionService.erc20Allowance(...args)))(
      "56", inputToken.contractAddress, intent.walletAddress, route.approvalTarget
    );
    const base: Omit<AllowanceApprovalPlan, "status"> = {
      approvalPlanId: `approval_${randomUUID()}`,
      walletAddress: intent.walletAddress,
      inputToken,
      outputToken,
      marketReview: {
        status: market.marketStatus,
        ...(market.openState !== undefined ? { providerOpenState: market.openState } : {}),
        warnings: [
          ...market.dataWarnings,
          ...(market.marketStatus === "unknown" ? ["Market status is unconfirmed; provider openState is only an independent signal and does not establish that the market is open or tradable."] : [])
        ]
      },
      spender: route.approvalTarget,
      amountBaseUnits: amountBaseUnits.toString(),
      amountDisplay: `${formatTokenAmount(amountBaseUnits.toString(), inputToken.decimals)} ${inputToken.symbol}`,
      quoteId: route.quoteId,
      expiresAt: Date.now() + 5 * 60_000,
      maxGasCostBnb: input.maxGasCostBnb ?? "",
      estimatedMaxGasCostBnb: "",
      purchase: {
        amount: intent.amount, maxSlippageBps: input.maxSlippageBps,
        ...((confirmedPurchasePlan?.intent.maxGasCostBnb ?? input.purchaseMaxGasCostBnb) ? { maxGasCostBnb: confirmedPurchasePlan?.intent.maxGasCostBnb ?? input.purchaseMaxGasCostBnb } : {}),
        asset: input.toAsset
      },
      ...(confirmedPurchasePlan ? { confirmedPurchasePlan: structuredClone(confirmedPurchasePlan) } : {}),
      requiresUserConfirmation: true
    };
    if (market.marketStatus === "closed" || market.openState === false || (market.marketStatus === "unknown" && market.openState !== true)) {
      return { ...base, status: "blocked", simulation: { success: false, warnings: ["Underlying market is not confirmed tradable; do not prepare an allowance transaction"], balanceChanges: [], allowanceChanges: [] } };
    }
    if (allowance >= amountBaseUnits) return { ...base, status: "not_required" };
    const action = await this.buildApprovalAction(intent, quote);
    const tx = (action?.payload as { tx?: { from?: unknown; to?: unknown; value?: unknown; data?: unknown; gas?: unknown; gasPrice?: unknown } } | undefined)?.tx;
    if (!action || !tx || tx.from !== intent.walletAddress || tx.to !== inputToken.contractAddress || tx.value !== "0" || typeof tx.data !== "string") {
      throw new Error("Approval builder did not return an ERC-20 call targeting the verified input token and wallet");
    }
    const estimate = await transactionService.estimateBscEvmCost("56", tx as { from: string; to: string; value: string; data: string; gas?: string; gasLimit?: string; gasPrice?: string });
    const reviewedGasBudgetBnb = input.maxGasCostBnb ?? estimate.estimatedMaxGasCostBnb;
    const unsignedTransaction = {
      from: tx.from, to: tx.to, value: tx.value, data: tx.data,
      gas: `0x${BigInt(estimate.gasLimit).toString(16)}`,
      gasPrice: `0x${BigInt(estimate.highGasPriceWei).toString(16)}`
    };
    if (parseTokenAmount(reviewedGasBudgetBnb, 18) < BigInt(estimate.gasLimit) * BigInt(estimate.highGasPriceWei)) {
      return { ...base, status: "blocked", maxGasCostBnb: reviewedGasBudgetBnb, estimatedMaxGasCostBnb: estimate.estimatedMaxGasCostBnb, unsignedTransaction, simulation: { success: false, warnings: ["User-reviewed gas budget is below the estimated high-tier approval transaction cost"], balanceChanges: [], allowanceChanges: [] } };
    }
    const simulation = await transactionService.simulateEvm("56", tx as { from: string; to: string; value: string; data: string });
    const reviewedSimulation = {
      ...simulation,
      warnings: [...new Set([
        ...base.marketReview.warnings,
        ...simulation.warnings,
        ...(!simulation.success && simulation.walletFundsOnlyFailure
          ? ["Provider simulation could not confirm wallet token/gas funds; Ariadne does not use this as a gate and the wallet decides whether it can submit."]
          : [])
      ])]
    };
    if (!simulation.success && !simulation.walletFundsOnlyFailure) {
      return { ...base, status: "blocked", estimatedMaxGasCostBnb: estimate.estimatedMaxGasCostBnb, simulation: reviewedSimulation };
    }
    const readyPlan: AllowanceApprovalPlan = {
      ...base,
      status: "ready_for_wallet_review",
      maxGasCostBnb: reviewedGasBudgetBnb,
      unsignedTransaction,
      estimatedMaxGasCostBnb: estimate.estimatedMaxGasCostBnb,
      gasBudgetSource: input.maxGasCostBnb ? "user_provided" : "provider_high_tier_estimate",
      simulation: reviewedSimulation
    };
    preparedApprovalSnapshots.set(readyPlan, jsonDataFingerprint(readyPlan));
    return readyPlan;
  }

  /** After the wallet confirms allowance, verify finality and build a fresh quote within the original confirmed plan bounds. */
  async refreshBscPurchaseAfterApproval(input: {
    approvalPlan: AllowanceApprovalPlan;
    txHash: string;
  }): Promise<{ status: "pending" | "reverted" | "blocked" | "ready"; reason?: string; allowanceFinalized?: boolean; allowance?: string; balance?: string; balanceReadWarning?: string; plan?: ActionPlan }> {
    const approval = input.approvalPlan;
    if (approval.status !== "ready_for_wallet_review" || !approval.unsignedTransaction) {
      return { status: "blocked", reason: "Approval plan is not ready for external-wallet review" };
    }
    let submittedFingerprint: string;
    try { submittedFingerprint = jsonDataFingerprint(approval); }
    catch { return { status: "blocked", reason: "Approval plan contains non-JSON or mutated data; prepare a fresh approval transaction" }; }
    if (!preparedApprovalSnapshots.has(approval) || preparedApprovalSnapshots.get(approval) !== submittedFingerprint) {
      return { status: "blocked", reason: "Approval plan is not the unchanged plan prepared by this SDK instance" };
    }
    if (!Number.isFinite(approval.expiresAt) || approval.expiresAt <= Date.now()) {
      return { status: "blocked", reason: "Approval review window has expired; prepare a fresh allowance review" };
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) return { status: "blocked", reason: "Approval receipt lookup requires a valid transaction hash" };
    const transactions = new TransactionService(this.client);
    const [rawReceipt, rawTransaction] = await Promise.all([
      (this.readReceipt ?? ((chainId, hash) => transactions.transactionReceipt(chainId, hash)))("56", input.txHash),
      (this.readTransaction ?? ((chainId, hash) => transactions.transactionByHash(chainId, hash)))("56", input.txHash)
    ]);
    if (!rawReceipt || typeof rawReceipt !== "object") return { status: "pending", reason: "Approval receipt is not available yet" };
    if (!rawTransaction || typeof rawTransaction !== "object") return { status: "pending", reason: "Approval transaction details are not available yet" };
    const receipt = rawReceipt as Record<string, unknown>;
    const transaction = rawTransaction as Record<string, unknown>;
    if (typeof receipt.transactionHash !== "string" || receipt.transactionHash.toLowerCase() !== input.txHash.toLowerCase() ||
      typeof receipt.from !== "string" || receipt.from.toLowerCase() !== approval.walletAddress.toLowerCase() ||
      typeof receipt.blockNumber !== "string" || !/^0x[0-9a-fA-F]+$/.test(receipt.blockNumber) || BigInt(receipt.blockNumber) <= 0n) {
      return { status: "blocked", reason: "Approval receipt hash, sender or confirmed block does not match the reviewed wallet" };
    }
    let latestFinalizedBlock: bigint;
    try {
      latestFinalizedBlock = await (this.readLatestFinalizedBlockNumber ?? ((chainId) => transactions.latestFinalizedBlockNumber(chainId)))("56");
    } catch (error) {
      return { status: "pending", reason: `Could not verify BSC approval finality: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (BigInt(receipt.blockNumber) > latestFinalizedBlock) {
      return { status: "pending", reason: `Approval receipt block ${BigInt(receipt.blockNumber)} is not finalized yet (latest finalized block ${latestFinalizedBlock})` };
    }
    if (typeof transaction.from !== "string" || transaction.from.toLowerCase() !== approval.walletAddress.toLowerCase() ||
      typeof transaction.to !== "string" || transaction.to.toLowerCase() !== approval.inputToken.contractAddress.toLowerCase() ||
      typeof transaction.input !== "string" || transaction.input.toLowerCase() !== approval.unsignedTransaction.data.toLowerCase() ||
      typeof transaction.value !== "string" || !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(transaction.value) || BigInt(transaction.value) !== 0n) {
      return { status: "blocked", reason: "Confirmed transaction does not match the exact reviewed allowance token, sender, amount and spender calldata" };
    }
    const quantity = (value: unknown): bigint | undefined => {
      if (typeof value !== "string" || !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(value)) return undefined;
      try { return BigInt(value); } catch { return undefined; }
    };
    const actualGasLimit = quantity(transaction.gas);
    const actualGasPrice = quantity(transaction.gasPrice);
    if (actualGasLimit === undefined || actualGasPrice === undefined ||
      actualGasLimit * actualGasPrice > parseTokenAmount(approval.maxGasCostBnb, 18)) {
      return { status: "blocked", reason: "Confirmed approval transaction gas fields are missing or exceed the reviewed maximum gas cap" };
    }
    const receiptStatus = typeof receipt.status === "string" ? receipt.status.toLowerCase() : "";
    if (receiptStatus === "0x0" || receiptStatus === "0x00") return { status: "reverted", reason: "Approval transaction reverted on BSC" };
    if (receiptStatus !== "0x1" && receiptStatus !== "0x01") return { status: "blocked", reason: "Approval receipt does not show a recognized successful status" };
    const allowance = await (this.readAllowance ?? ((...args) => transactions.erc20Allowance(...args)))("56", approval.inputToken.contractAddress, approval.walletAddress, approval.spender);
    let balance: bigint | undefined;
    let balanceReadWarning: string | undefined;
    try {
      balance = await (this.readBalance ?? ((...args) => transactions.erc20Balance(...args)))("56", approval.inputToken.contractAddress, approval.walletAddress);
    } catch (error) {
      // Balance is useful context for later reconciliation, but it is not a
      // permission to prepare a fresh quote-backed plan. The wallet decides
      // whether it can submit; the handoff re-reads balances for settlement.
      balanceReadWarning = `Could not read the current USDT balance for context: ${error instanceof Error ? error.message : String(error)}. This did not block the fresh purchase plan.`;
    }
    if (allowance < BigInt(approval.amountBaseUnits)) return { status: "blocked", allowanceFinalized: true, reason: "Confirmed approval receipt did not produce the reviewed allowance", allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}) };
    const plan = await this.createBscStockPurchasePlan({
      walletAddress: approval.walletAddress, inputTokenSymbol: approval.inputToken.symbol,
      amount: approval.purchase.amount, toAsset: approval.purchase.asset,
      maxSlippageBps: approval.purchase.maxSlippageBps, maxGasCostBnb: approval.purchase.maxGasCostBnb
    });
    const parent = approval.confirmedPurchasePlan;
    if (parent) {
      const identityMatches = plan.intent.walletAddress.toLowerCase() === parent.intent.walletAddress.toLowerCase() &&
        plan.intent.fromTokenAddress.toLowerCase() === parent.intent.fromTokenAddress.toLowerCase() &&
        plan.intent.amount === parent.intent.amount && plan.intent.toAsset.chainId === parent.intent.toAsset.chainId &&
        plan.intent.toAsset.platformId === parent.intent.toAsset.platformId &&
        plan.intent.toAsset.contractAddress.toLowerCase() === parent.intent.toAsset.contractAddress.toLowerCase() &&
        plan.verifiedTokens?.output.contractAddress.toLowerCase() === parent.verifiedTokens?.output.contractAddress.toLowerCase() &&
        plan.authorizationCheck?.spender.toLowerCase() === parent.authorizationCheck?.spender.toLowerCase() &&
        plan.intent.maxSlippageBps === parent.intent.maxSlippageBps &&
        (!parent.intent.maxGasCostBnb || Boolean(plan.intent.maxGasCostBnb && parseTokenAmount(plan.intent.maxGasCostBnb, 18) <= parseTokenAmount(parent.intent.maxGasCostBnb, 18)));
      if (!identityMatches) return { status: "blocked", allowanceFinalized: true, reason: "The refreshed quote changed a confirmed wallet, token, spender, amount, slippage or gas boundary", allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}) };
      if (plan.status !== "awaiting_confirmation" || !parent.minimumOutput || !plan.minimumOutput || BigInt(plan.minimumOutput) < BigInt(parent.minimumOutput)) {
        return { status: "blocked", allowanceFinalized: true, reason: "The refreshed quote would reduce the confirmed minimum stock amount. Review a new purchase plan before continuing.", allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}), ...(plan.status !== "failed" ? { plan } : {}) };
      }
      const baselinePrice = parent.assetContext?.tokenPrice;
      const currentPrice = plan.assetContext?.tokenPrice;
      const driftBps = baselinePrice && currentPrice ? decimalBpsDifference(currentPrice, baselinePrice) : undefined;
      if (driftBps === undefined) {
        return { status: "blocked", allowanceFinalized: true, reason: "A timestamped original and current Binance token price are required to compare this purchase plan", allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}) };
      }
      if (driftBps > BigInt(parent.intent.maxSlippageBps ?? 0)) {
        return { status: "blocked", allowanceFinalized: true, reason: `The current token price moved ${driftBps} bps from the confirmed plan, beyond its ${parent.intent.maxSlippageBps} bps limit. Review a new plan before continuing.`, allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}) };
      }
      if (!parent.assetContext?.tokenPriceUpdatedAt || !plan.assetContext?.tokenPriceUpdatedAt) {
        return { status: "blocked", allowanceFinalized: true, reason: "The original and current Binance market snapshots must include provider update times", allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}) };
      }
    }
    return { status: plan.status === "awaiting_confirmation" ? "ready" : "blocked", allowanceFinalized: true, allowance: allowance.toString(), ...(balance !== undefined ? { balance: balance.toString() } : {}), ...(balanceReadWarning ? { balanceReadWarning } : {}), ...(plan.status !== "awaiting_confirmation" ? { reason: plan.safetyReport?.blockingReasons.join("; ") || "Fresh swap plan did not pass its checks" } : {}), plan };
  }
}
