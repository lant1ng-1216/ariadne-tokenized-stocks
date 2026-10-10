import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ActionPlan, AllowanceApprovalPlan, StockAsset } from "../domain/types.js";

export type ExternalWalletTransaction = {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  gasPrice: string;
};

export type ExternalWalletLanguage = "zh-CN" | "en";

export type ExternalWalletPurchaseIntent = {
  intentId: string;
  language: ExternalWalletLanguage;
  asset: StockAsset;
  amount: string;
  inputTokenSymbol: "USDT";
  maxSlippageBps: number;
  networkFeePolicy: "provider_estimated_max";
  marketBaseline?: {
    tokenPrice?: string;
    referencePrice?: string;
    tokenPriceUpdatedAt?: number;
  };
};

export type ExternalWalletHandoffCreate = {
  planId: string;
  account: string;
  chainId: "0x38";
  request: ExternalWalletTransaction;
  expiresAt: number;
  display: {
    operation: "purchase" | "allowance_approval";
    issuer: string;
    ticker: string;
    underlyingName?: string;
    tokenLogoUrl?: string;
    issuerLogoUrl?: string;
    inputAmount: string;
    inputSymbol: string;
    inputContract: string;
    expectedOutput: string;
    outputSymbol: string;
    outputContract: string;
    minimumOutput: string;
    spender: string;
    allowanceCurrent?: string;
    allowanceRequired?: string;
    allowanceStatus?: "sufficient" | "insufficient" | "unverified";
    estimatedNetworkFeeBnb?: string;
    routeFeeUsd?: string;
    marketStatus: string;
    marketCaveat?: string;
    slippageBps: number;
    maxGasCostBnb: string;
    marketReference?: { chainId: "56"; platformId: string; contractAddress: string };
    marketBaseline?: { tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number };
    purchaseBaseline?: { expectedOutput: string; minimumOutput: string; outputDecimals: number; slippageBps: number; estimatedNetworkFeeBnb?: string; routeFeeUsd?: string };
    purchaseMaxGasCostBnb?: string;
    continuationOfPlanId?: string;
  };
};

export type ExternalWalletMarketSnapshot = {
  state: "available" | "unavailable";
  source: "Binance Web3";
  fetchedAt: number;
  tokenPrice?: string;
  referencePrice?: string;
  tokenPriceUpdatedAt?: number;
};

export type ExternalWalletCandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "12h" | "1d";
export type ExternalWalletCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type ExternalWalletCandles = {
  state: "available" | "unavailable";
  source: "Binance Web3";
  fetchedAt: number;
  interval: ExternalWalletCandleInterval;
  candles: ExternalWalletCandle[];
};

export type ExternalWalletHandoffState = "prepared" | "active" | "wallet_rejected" | "wallet_uncertain" | "submitted" | "confirmed" | "failed" | "expired";
export type ExternalWalletClientStage = "page_loaded" | "plan_loaded" | "quote_refresh_started" | "quote_ready" | "provider_discovery_started" | "provider_selected" | "account_lookup_started" | "account_lookup_resolved" | "account_request_started" | "account_ready" | "connect_execute_started" | "connect_execute_resolved" | "transaction_request_started" | "transaction_request_resolved" | "client_error";
export type ExternalWalletFailureStage = "quote_refresh" | "quote_boundary" | "wallet_discovery" | "wallet_connection" | "wallet_preflight" | "page_runtime";

export type ExternalWalletHandoffSnapshot = Omit<ExternalWalletHandoffCreate, "request" | "account"> & {
  /** Absent for a wallet-free purchase intent; set only after the browser selects an account. */
  account?: string;
  request?: ExternalWalletTransaction;
  id: string;
  state: ExternalWalletHandoffState;
  createdAt: number;
  /** Set only after the external approval page loads and reads this one-time handoff. */
  pageOpenedAt?: number;
  /** Set atomically before the first page may request wallet access or a transaction. */
  walletAttemptClaimedAt?: number;
  txHash?: string;
  connectedAccount?: string;
  connectedChainId?: string;
  walletError?: string;
  reconciliation?: Record<string, unknown>;
  resultSummary?: string;
  followUpHandoffId?: string;
  reviewMode?: "purchase_plan" | "purchase_intent";
  purchaseIntent?: ExternalWalletPurchaseIntent;
  quoteExpiresAt?: number;
  quoteDriftBps?: number;
  requiresQuoteAcceptance?: boolean;
  pendingQuoteId?: string;
  quoteAcceptedAt?: number;
  /** Last non-sensitive browser-side stage, persisted so popup failures are diagnosable. */
  clientStage?: ExternalWalletClientStage;
  clientStageAt?: number;
  clientStageDetail?: string;
  /** Durable ownership markers prevent duplicate Agent reports across App reloads. */
  agentReportClaimedAt?: number;
  agentReportDeliveredAt?: number;
};

type StoredHandoff = Omit<ExternalWalletHandoffSnapshot, "account"> & {
  /** Internal sentinel is never exposed while reviewMode is purchase_intent. */
  account: string;
  capabilityHash: string;
  walletAttemptIdHash?: string;
  originalPlan?: ActionPlan;
  latestExecutionPlan?: ActionPlan;
  beforeBalances?: Record<string, unknown>;
  pendingRequest?: ExternalWalletTransaction;
  allowancePlan?: AllowanceApprovalPlan;
};

export type ExternalWalletHandoffInternalSnapshot = ExternalWalletHandoffSnapshot & {
  originalPlan?: ActionPlan;
  latestExecutionPlan?: ActionPlan;
  beforeBalances?: Record<string, unknown>;
  allowancePlan?: AllowanceApprovalPlan;
};

export type ExternalWalletPurchaseRefresh = {
  plan: ActionPlan;
  request: ExternalWalletTransaction;
  display: ExternalWalletHandoffCreate["display"];
  beforeBalances?: Record<string, unknown>;
};

export type ExternalWalletAllowancePreparation = {
  approvalPlan: AllowanceApprovalPlan;
  request: ExternalWalletTransaction;
  display: ExternalWalletHandoffCreate["display"];
};
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const HEX = /^0x(?:[0-9a-fA-F]{2})*$/;

function hashCapability(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function matchesCapability(expectedHash: string, supplied: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hashCapability(supplied), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function assertCreateInput(input: ExternalWalletHandoffCreate): void {
  if (!input.planId || input.chainId !== "0x38" || !ADDRESS.test(input.account)) throw new Error("External wallet handoff must bind a plan, BSC chain 56 and a valid account");
  const { request } = input;
  if (!ADDRESS.test(request.from) || !ADDRESS.test(request.to) || !/^0x[0-9a-fA-F]*$/.test(request.value) ||
    !HEX.test(request.data) || !/^0x[0-9a-fA-F]+$/.test(request.gas) || !/^0x[0-9a-fA-F]+$/.test(request.gasPrice) ||
    request.from.toLowerCase() !== input.account.toLowerCase()) throw new Error("External wallet request is incomplete or is not bound to the reviewed sender");
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= 0) throw new Error("External wallet handoff quote has expired");
  if (!input.display.ticker || !input.display.inputSymbol || !input.display.outputSymbol || !Number.isInteger(input.display.slippageBps) || input.display.slippageBps < 0) {
    throw new Error("External wallet handoff display is incomplete");
  }
  if (input.display.operation !== "purchase" && input.display.operation !== "allowance_approval") throw new Error("External wallet handoff operation is invalid");
  for (const logoUrl of [input.display.tokenLogoUrl, input.display.issuerLogoUrl]) {
    if (logoUrl === undefined) continue;
    let parsed: URL;
    try { parsed = new URL(logoUrl); } catch { throw new Error("Wallet handoff logo URL is invalid"); }
    if (parsed.protocol !== "https:" || !["onchainos.bnbstatic.com", "public.bnbstatic.com"].includes(parsed.hostname)) {
      throw new Error("Wallet handoff logos must use an approved Binance image origin");
    }
  }
  if (!ADDRESS.test(input.display.inputContract) || !ADDRESS.test(input.display.outputContract) || !ADDRESS.test(input.display.spender)) {
    throw new Error("External wallet handoff must display verified token and spender addresses");
  }
  if (input.display.marketReference && (input.display.marketReference.chainId !== "56" || !input.display.marketReference.platformId.trim() || !ADDRESS.test(input.display.marketReference.contractAddress))) {
    throw new Error("Live market data requires an exact Binance Web3 BSC issuer and token identity");
  }
  if (input.display.marketBaseline && (input.display.marketBaseline.tokenPrice !== undefined && (!/^\d+(?:\.\d+)?$/.test(input.display.marketBaseline.tokenPrice) || Number(input.display.marketBaseline.tokenPrice) <= 0) ||
    input.display.marketBaseline.referencePrice !== undefined && (!/^\d+(?:\.\d+)?$/.test(input.display.marketBaseline.referencePrice) || Number(input.display.marketBaseline.referencePrice) <= 0) ||
    input.display.marketBaseline.tokenPriceUpdatedAt !== undefined && (!Number.isSafeInteger(input.display.marketBaseline.tokenPriceUpdatedAt) || input.display.marketBaseline.tokenPriceUpdatedAt <= 0))) {
    throw new Error("Live market baseline contains an invalid price or timestamp");
  }
  if (input.display.purchaseBaseline && (!/^\d+$/.test(input.display.purchaseBaseline.expectedOutput) || !/^\d+$/.test(input.display.purchaseBaseline.minimumOutput) ||
    !Number.isInteger(input.display.purchaseBaseline.outputDecimals) || input.display.purchaseBaseline.outputDecimals < 0 || input.display.purchaseBaseline.outputDecimals > 36 ||
    input.display.purchaseBaseline.estimatedNetworkFeeBnb !== undefined && !/^\d+(?:\.\d+)?$/.test(input.display.purchaseBaseline.estimatedNetworkFeeBnb) ||
    input.display.purchaseBaseline.routeFeeUsd !== undefined && !/^\d+(?:\.\d+)?$/.test(input.display.purchaseBaseline.routeFeeUsd) ||
    !Number.isInteger(input.display.purchaseBaseline.slippageBps) || input.display.purchaseBaseline.slippageBps < 0 || input.display.purchaseBaseline.slippageBps > 10_000)) {
    throw new Error("Confirmed purchase baseline is incomplete or invalid");
  }
  if (input.display.estimatedNetworkFeeBnb !== undefined && !/^\d+(?:\.\d+)?$/.test(input.display.estimatedNetworkFeeBnb)) throw new Error("Current estimated network fee is invalid");
  if (input.display.continuationOfPlanId !== undefined && (typeof input.display.continuationOfPlanId !== "string" || !input.display.continuationOfPlanId.trim())) {
    throw new Error("Purchase continuation plan identity is invalid");
  }
}

/**
 * Single-process relay state for deterministic tests and a small first deployment.
 * Optional atomic file persistence survives service restarts; multi-instance deployments
 * must replace this store with a shared durable implementation.
 */
export class WalletHandoffStore {
  private readonly sessions = new Map<string, StoredHandoff>();
  private readonly portalOrigin: string;

  constructor(private readonly options: { portalOrigin: string; now?: () => number; tokenBytes?: number; storagePath?: string }) {
    const url = new URL(options.portalOrigin);
    const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
      throw new Error("Wallet approval portal must use HTTPS; plain HTTP is allowed only on loopback for local tests");
    }
    if (url.pathname !== "/" || url.search || url.hash) throw new Error("Wallet approval portal origin must not include a path, query or fragment");
    this.portalOrigin = `${url.origin}/`;
    if (options.storagePath && existsSync(options.storagePath)) {
      const decoded: unknown = JSON.parse(readFileSync(options.storagePath, "utf8"));
      if (!Array.isArray(decoded) || decoded.some((entry) => !entry || typeof entry !== "object" || typeof entry.id !== "string" || typeof entry.capabilityHash !== "string")) {
        throw new Error("Wallet handoff store is malformed; refusing to start with ambiguous transaction state");
      }
      for (const entry of decoded as StoredHandoff[]) this.sessions.set(entry.id, entry);
      chmodSync(options.storagePath, 0o600);
    }
  }

  create(input: ExternalWalletHandoffCreate): { id: string; capability: string; url: string; expiresAt: number } {
    return this.createWithCapability(input, randomBytes(this.options.tokenBytes ?? 32).toString("base64url"));
  }

  /** Create a long-lived plan link with no wallet request attached. The quote is only a baseline. */
  createPurchasePlanReview(plan: ActionPlan, display: ExternalWalletHandoffCreate["display"]): { id: string; capability: string; url: string; expiresAt: number } {
    if (plan.status !== "awaiting_confirmation" || plan.intent.toAsset.chainId !== "56" || !plan.intent.toAsset.platformId.trim() ||
      !plan.verifiedTokens || !plan.expectedOutput || !plan.minimumOutput || !plan.expiresAt || plan.expiresAt <= (this.options.now ?? Date.now)()) {
      throw new Error("A plan-review link requires a fresh, prepared Binance Web3 BSC stock purchase plan with verified issuer and quote details");
    }
    if (display.operation !== "purchase" || display.inputAmount !== plan.intent.amount ||
      display.inputContract.toLowerCase() !== plan.verifiedTokens.input.contractAddress.toLowerCase() ||
      display.outputContract.toLowerCase() !== plan.verifiedTokens.output.contractAddress.toLowerCase()) {
      throw new Error("Plan-review display does not match the prepared purchase intent");
    }
    const now = (this.options.now ?? Date.now)();
    const id = randomBytes(16).toString("hex");
    const capability = randomBytes(this.options.tokenBytes ?? 32).toString("base64url");
    const expiresAt = now + 24 * 60 * 60_000;
    const session: StoredHandoff = {
      planId: plan.planId,
      account: plan.intent.walletAddress,
      chainId: "0x38",
      expiresAt,
      display: structuredClone(display),
      reviewMode: "purchase_plan",
      quoteExpiresAt: plan.expiresAt,
      originalPlan: structuredClone(plan),
      id,
      state: "active",
      createdAt: now,
      capabilityHash: hashCapability(capability)
    };
    this.sessions.set(id, session);
    this.persist();
    return { id, capability, url: `${this.portalOrigin}approve#${id}.${capability}`, expiresAt };
  }

  /** Create a browser link before any wallet account, quote or transaction request exists. */
  createPurchaseIntent(intent: ExternalWalletPurchaseIntent): { id: string; capability: string; url: string; expiresAt: number } {
    if (!intent.intentId || intent.asset.chainId !== "56" || !intent.asset.platformId.trim() ||
      !ADDRESS.test(intent.asset.contractAddress) || !/^\d+(?:\.\d+)?$/.test(intent.amount) || Number(intent.amount) <= 0 ||
      intent.inputTokenSymbol !== "USDT" || !Number.isInteger(intent.maxSlippageBps) || intent.maxSlippageBps < 0 ||
      intent.networkFeePolicy !== "provider_estimated_max" || !["zh-CN", "en"].includes(intent.language)) {
      throw new Error("Browser purchase intent is incomplete or is not an exact BSC stock representation");
    }
    const now = (this.options.now ?? Date.now)();
    const id = randomBytes(16).toString("hex");
    const capability = randomBytes(this.options.tokenBytes ?? 32).toString("base64url");
    const expiresAt = now + 24 * 60 * 60_000;
    const pendingAddress = "0x0000000000000000000000000000000000000000";
    const session: StoredHandoff = {
      planId: intent.intentId,
      account: pendingAddress,
      chainId: "0x38",
      expiresAt,
      display: {
        operation: "purchase",
        issuer: intent.asset.platformId === "bstock" ? "bStocks" : intent.asset.platformId === "ondo" ? "Ondo" : intent.asset.platformId,
        ticker: intent.asset.underlyingTicker,
        underlyingName: intent.asset.underlyingName,
        ...(intent.asset.tokenLogoUrl ? { tokenLogoUrl: intent.asset.tokenLogoUrl } : {}),
        ...(intent.asset.issuerLogoUrl ? { issuerLogoUrl: intent.asset.issuerLogoUrl } : {}),
        inputAmount: intent.amount,
        inputSymbol: "USDT",
        inputContract: pendingAddress,
        expectedOutput: "pending",
        outputSymbol: intent.asset.tokenSymbol,
        outputContract: intent.asset.contractAddress,
        minimumOutput: "pending",
        spender: pendingAddress,
        marketStatus: "pending_wallet",
        slippageBps: intent.maxSlippageBps,
        maxGasCostBnb: "provider_estimate_pending",
        marketReference: { chainId: "56", platformId: intent.asset.platformId, contractAddress: intent.asset.contractAddress },
        ...(intent.marketBaseline ? { marketBaseline: structuredClone(intent.marketBaseline) } : {})
      },
      reviewMode: "purchase_intent",
      purchaseIntent: structuredClone(intent),
      id,
      state: "active",
      createdAt: now,
      capabilityHash: hashCapability(capability)
    };
    this.sessions.set(id, session);
    this.persist();
    return { id, capability, url: `${this.portalOrigin}approve?lang=${encodeURIComponent(intent.language)}#${id}.${capability}`, expiresAt };
  }

  /** Bind the browser-selected account and first exact quote to a wallet-free intent. */
  bindPurchaseIntent(id: string, capability: string, plan: ActionPlan, display: ExternalWalletHandoffCreate["display"]): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    const intent = session.purchaseIntent;
    if (session.reviewMode !== "purchase_intent" || !intent) throw new Error("This handoff is not a wallet-free purchase intent");
    if (session.walletAttemptClaimedAt !== undefined || session.request) throw new Error("This purchase intent already started a wallet request");
    if (plan.status !== "awaiting_confirmation" || !plan.verifiedTokens || !plan.expectedOutput || !plan.minimumOutput || !plan.expiresAt ||
      plan.intent.walletAddress.toLowerCase() === "0x0000000000000000000000000000000000000000" ||
      plan.intent.amount !== intent.amount || plan.intent.toAsset.chainId !== intent.asset.chainId ||
      plan.intent.toAsset.platformId !== intent.asset.platformId ||
      plan.intent.toAsset.contractAddress.toLowerCase() !== intent.asset.contractAddress.toLowerCase() ||
      plan.intent.maxSlippageBps !== intent.maxSlippageBps || display.inputAmount !== intent.amount) {
      throw new Error("The wallet-bound plan changed the original purchase intent");
    }
    session.planId = plan.planId;
    session.account = plan.intent.walletAddress;
    session.display = structuredClone(display);
    session.originalPlan = structuredClone(plan);
    session.reviewMode = "purchase_plan";
    session.quoteExpiresAt = plan.expiresAt;
    this.persist();
    return this.snapshot(session);
  }

  /** Replace only the quote/request inside a plan link, preserving its original intent and baseline. */
  preparePurchaseReview(id: string, capability: string, refreshed: ExternalWalletPurchaseRefresh): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.reviewMode !== "purchase_plan" || !session.originalPlan) throw new Error("This handoff is not a reusable purchase-plan review");
    if (session.walletAttemptClaimedAt !== undefined) throw new Error("This wallet request has already been attempted; inspect its status before refreshing");
    const original = session.originalPlan;
    const next = refreshed.plan;
    if (next.status !== "confirmed" || next.requiresUserConfirmation || !next.expiresAt || next.expiresAt <= (this.options.now ?? Date.now)() ||
      !next.verifiedTokens || !next.minimumOutput || !next.expectedOutput || !next.quoteId || next.intent.maxSlippageBps === undefined) {
      throw new Error("The current execution plan is not confirmed, complete and quote-fresh");
    }
    if (!original.verifiedTokens) throw new Error("The original plan has no verified token identities");
    const userSetGasCap = original.estimatedFees?.gasBudgetSource === "user_provided";
    const changed: string[] = [];
    if (next.planId !== original.planId) changed.push("plan identity");
    if (next.intent.walletAddress.toLowerCase() !== original.intent.walletAddress.toLowerCase()) changed.push("wallet");
    if (next.intent.fromTokenAddress.toLowerCase() !== original.intent.fromTokenAddress.toLowerCase()) changed.push("input token");
    if (next.intent.amount !== original.intent.amount || next.intent.amountDecimals !== original.intent.amountDecimals) changed.push("amount");
    if (next.intent.toAsset.chainId !== original.intent.toAsset.chainId) changed.push("chain");
    if (next.intent.toAsset.platformId !== original.intent.toAsset.platformId) changed.push("issuer");
    if (next.intent.toAsset.contractAddress.toLowerCase() !== original.intent.toAsset.contractAddress.toLowerCase()) changed.push("stock token");
    if (next.intent.maxSlippageBps !== original.intent.maxSlippageBps) changed.push("slippage limit");
    if (userSetGasCap && next.intent.maxGasCostBnb !== original.intent.maxGasCostBnb) changed.push("user gas cap");
    if (next.authorizationCheck?.spender?.toLowerCase() !== original.authorizationCheck?.spender?.toLowerCase()) changed.push("spender");
    if (next.verifiedTokens.input.contractAddress.toLowerCase() !== original.verifiedTokens.input.contractAddress.toLowerCase()) changed.push("verified input token");
    if (next.verifiedTokens.output.contractAddress.toLowerCase() !== original.verifiedTokens.output.contractAddress.toLowerCase()) changed.push("verified stock token");
    if (changed.length) throw new Error(`The fresh quote changed the original ${changed.join(", ")}; no wallet request was sent`);
    if (original.estimatedFees?.gasBudgetSource === "user_provided" && original.intent.maxGasCostBnb) {
      const freshFee = next.estimatedFees?.estimatedMaxGasCostBnb;
      const toWei = (value: string) => {
        if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("The fresh execution fee is not a valid BNB amount");
        const [whole, fraction = ""] = value.split(".");
        if (fraction.length > 18) throw new Error("The fresh execution fee has unsupported precision");
        return BigInt(whole!) * 10n ** 18n + BigInt(fraction.padEnd(18, "0") || "0");
      };
      if (!freshFee) {
        throw new Error(`The current network-fee estimate is unavailable; the original cap is ${original.intent.maxGasCostBnb} BNB, so no wallet request was prepared`);
      }
      if (toWei(freshFee) > toWei(original.intent.maxGasCostBnb)) {
        throw new Error(`The current estimated network fee is ${freshFee} BNB, above the original ${original.intent.maxGasCostBnb} BNB cap; no wallet request was prepared`);
      }
    }
    assertCreateInput({
      planId: session.planId, account: session.account, chainId: session.chainId,
      request: refreshed.request, expiresAt: next.expiresAt, display: refreshed.display
    });
    if (refreshed.request.from.toLowerCase() !== session.account.toLowerCase()) throw new Error("Fresh wallet request sender differs from the plan-review wallet");
    session.display = structuredClone(refreshed.display);
    session.quoteExpiresAt = next.expiresAt;
    session.latestExecutionPlan = structuredClone(next);
    session.beforeBalances = refreshed.beforeBalances ? structuredClone(refreshed.beforeBalances) : undefined;
    const baselineOutput = BigInt(original.expectedOutput!);
    const currentOutput = BigInt(next.expectedOutput!);
    const driftBps = currentOutput < baselineOutput ? Number((baselineOutput - currentOutput) * 10_000n / baselineOutput) : 0;
    session.quoteDriftBps = driftBps;
    session.quoteAcceptedAt = undefined;
    const approvedSlippageBps = original.intent.maxSlippageBps ?? 0;
    if (driftBps > approvedSlippageBps) {
      session.request = undefined;
      session.pendingRequest = structuredClone(refreshed.request);
      session.requiresQuoteAcceptance = true;
      session.pendingQuoteId = next.quoteId;
    } else {
      session.request = structuredClone(refreshed.request);
      session.pendingRequest = undefined;
      session.requiresQuoteAcceptance = false;
      session.pendingQuoteId = undefined;
    }
    this.persist();
    return this.snapshot(session);
  }

  /** Convert the same long-lived purchase intent into its exact prerequisite allowance step. */
  prepareAllowanceReview(id: string, capability: string, prepared: ExternalWalletAllowancePreparation): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.reviewMode !== "purchase_plan" || !session.originalPlan) throw new Error("This handoff is not a reusable purchase-plan review");
    if (session.walletAttemptClaimedAt !== undefined) throw new Error("This purchase-plan stage already started a wallet attempt");
    const original = session.originalPlan;
    const approval = prepared.approvalPlan;
    if (approval.status !== "ready_for_wallet_review" || !approval.unsignedTransaction || approval.expiresAt <= (this.options.now ?? Date.now)()) {
      throw new Error("The exact allowance request is not ready for wallet review");
    }
    if (approval.walletAddress.toLowerCase() !== original.intent.walletAddress.toLowerCase() ||
      approval.purchase.amount !== original.intent.amount || approval.purchase.maxSlippageBps !== original.intent.maxSlippageBps ||
      approval.purchase.asset.chainId !== original.intent.toAsset.chainId || approval.purchase.asset.platformId !== original.intent.toAsset.platformId ||
      approval.purchase.asset.contractAddress.toLowerCase() !== original.intent.toAsset.contractAddress.toLowerCase() ||
      approval.inputToken.contractAddress.toLowerCase() !== original.intent.fromTokenAddress.toLowerCase() ||
      approval.outputToken.contractAddress.toLowerCase() !== original.intent.toAsset.contractAddress.toLowerCase() ||
      approval.spender.toLowerCase() !== original.authorizationCheck?.spender?.toLowerCase()) {
      throw new Error("The allowance request changed the original wallet, amount, asset, issuer, token or spender");
    }
    assertCreateInput({
      planId: approval.approvalPlanId,
      account: session.account,
      chainId: session.chainId,
      request: prepared.request,
      expiresAt: approval.expiresAt,
      display: prepared.display,
    });
    if (prepared.display.operation !== "allowance_approval" || prepared.request.from.toLowerCase() !== session.account.toLowerCase()) {
      throw new Error("The allowance wallet request is not bound to this purchase-plan account");
    }
    session.display = structuredClone(prepared.display);
    session.request = structuredClone(prepared.request);
    session.allowancePlan = structuredClone(approval);
    session.planId = approval.approvalPlanId;
    session.quoteExpiresAt = approval.expiresAt;
    session.requiresQuoteAcceptance = false;
    session.pendingRequest = undefined;
    session.pendingQuoteId = undefined;
    session.clientStageDetail = "Exact USDT allowance is ready before the stock purchase";
    this.persist();
    return this.snapshot(session);
  }

  /** The owner may explicitly accept an adverse quote move shown on the plan page; limits stay unchanged. */
  acceptLatestPurchaseQuote(id: string, capability: string, quoteId: string): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.reviewMode !== "purchase_plan" || session.state !== "active" || session.walletAttemptClaimedAt !== undefined) {
      throw new Error("This purchase plan is not waiting for quote review");
    }
    if (session.pageOpenedAt === undefined) throw new Error("Open this purchase page before accepting its current quote");
    if (!session.requiresQuoteAcceptance || !session.pendingRequest || !session.latestExecutionPlan || !session.pendingQuoteId || quoteId !== session.pendingQuoteId) {
      throw new Error("The displayed quote is not the current quote awaiting your decision");
    }
    if (!session.quoteExpiresAt || session.quoteExpiresAt <= (this.options.now ?? Date.now)()) {
      session.request = undefined;
      session.pendingRequest = undefined;
      session.requiresQuoteAcceptance = false;
      session.pendingQuoteId = undefined;
      this.persist();
      throw new Error("The displayed quote expired before you accepted it. Refresh this same plan to see a new quote.");
    }
    session.request = structuredClone(session.pendingRequest);
    session.pendingRequest = undefined;
    session.requiresQuoteAcceptance = false;
    session.pendingQuoteId = undefined;
    session.quoteAcceptedAt = (this.options.now ?? Date.now)();
    this.persist();
    return this.snapshot(session);
  }

  createFollowUp(parentId: string, parentCapability: string, input: ExternalWalletHandoffCreate): { id: string; capability: string; url: string; expiresAt: number } {
    const parent = this.requireCapability(parentId, parentCapability);
    if (parent.state !== "confirmed") throw new Error("A purchase follow-up can be linked only after the exact allowance is confirmed");
    if (parent.display.operation !== "allowance_approval" || parent.account.toLowerCase() !== input.account.toLowerCase()) {
      throw new Error("The follow-up purchase does not match the allowance wallet session");
    }
    if (parent.followUpHandoffId) throw new Error("This allowance already has its one-time purchase follow-up");
    const id = randomBytes(16).toString("hex");
    const capability = createHmac("sha256", parentCapability).update(`ariadne-follow-up:${parentId}:${id}`).digest("base64url");
    const created = this.createWithCapability(input, capability, id);
    parent.followUpHandoffId = created.id;
    this.persist();
    return created;
  }

  /**
   * Create the one purchase request that may follow a confirmed allowance.
   * The fresh request must still satisfy the original purchase intent and its
   * output/gas boundaries; a confirmed allowance never authorizes a worse or
   * otherwise changed purchase.
   */
  createPurchaseFollowUpAfterAllowance(
    parentId: string,
    parentCapability: string,
    refreshed: ExternalWalletPurchaseRefresh
  ): { id: string; capability: string; url: string; expiresAt: number } {
    const parent = this.requireCapability(parentId, parentCapability);
    if (parent.followUpHandoffId) {
      const existing = this.readFollowUp(parentId, parentCapability);
      const child = this.require(existing.id);
      return { ...existing, url: `${this.portalOrigin}approve#${existing.id}.${existing.capability}`, expiresAt: child.expiresAt };
    }
    if (parent.state !== "confirmed" || parent.display.operation !== "allowance_approval" || !parent.originalPlan) {
      throw new Error("A purchase continuation requires the exact finalized allowance and its original purchase plan");
    }
    const original = parent.originalPlan;
    const next = refreshed.plan;
    if (next.status !== "confirmed" || next.requiresUserConfirmation || !next.expiresAt ||
      next.expiresAt <= (this.options.now ?? Date.now)() || !next.verifiedTokens ||
      !next.expectedOutput || !next.minimumOutput || !next.authorizationCheck?.spender) {
      throw new Error("The post-allowance purchase plan is not confirmed, complete and quote-fresh");
    }
    if (!original.verifiedTokens || !original.minimumOutput || !original.expectedOutput || !original.authorizationCheck?.spender) {
      throw new Error("The original purchase plan is incomplete");
    }
    const changed: string[] = [];
    if (next.planId !== original.planId) changed.push("plan identity");
    if (next.intent.walletAddress.toLowerCase() !== original.intent.walletAddress.toLowerCase()) changed.push("wallet");
    if (next.intent.fromTokenAddress.toLowerCase() !== original.intent.fromTokenAddress.toLowerCase()) changed.push("input token");
    if (next.intent.amount !== original.intent.amount || next.intent.amountDecimals !== original.intent.amountDecimals) changed.push("amount");
    if (next.intent.toAsset.chainId !== original.intent.toAsset.chainId) changed.push("chain");
    if (next.intent.toAsset.platformId !== original.intent.toAsset.platformId) changed.push("issuer");
    if (next.intent.toAsset.contractAddress.toLowerCase() !== original.intent.toAsset.contractAddress.toLowerCase()) changed.push("stock token");
    if (next.intent.maxSlippageBps !== original.intent.maxSlippageBps) changed.push("slippage limit");
    if (next.authorizationCheck.spender.toLowerCase() !== original.authorizationCheck.spender.toLowerCase()) changed.push("spender");
    if (next.verifiedTokens.input.contractAddress.toLowerCase() !== original.verifiedTokens.input.contractAddress.toLowerCase()) changed.push("verified input token");
    if (next.verifiedTokens.output.contractAddress.toLowerCase() !== original.verifiedTokens.output.contractAddress.toLowerCase()) changed.push("verified stock token");
    if (BigInt(next.minimumOutput) < BigInt(original.minimumOutput)) changed.push("minimum output");
    if (changed.length) throw new Error(`The post-allowance quote changed the original ${changed.join(", ")}; no purchase wallet request was prepared`);

    const toWei = (value: string) => {
      if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("The purchase fee is not a valid BNB amount");
      const [whole, fraction = ""] = value.split(".");
      if (fraction.length > 18) throw new Error("The purchase fee has unsupported precision");
      return BigInt(whole!) * 10n ** 18n + BigInt(fraction.padEnd(18, "0") || "0");
    };
    if (original.estimatedFees?.gasBudgetSource === "user_provided" && original.intent.maxGasCostBnb) {
      const freshFee = next.estimatedFees?.estimatedMaxGasCostBnb;
      if (!freshFee || toWei(freshFee) > toWei(original.intent.maxGasCostBnb)) {
        throw new Error("The post-allowance purchase fee is unavailable or exceeds the original gas cap");
      }
    }
    if (refreshed.display.operation !== "purchase" || refreshed.display.continuationOfPlanId !== original.planId) {
      throw new Error("The post-allowance wallet request is not identified as this plan's purchase continuation");
    }
    const input: ExternalWalletHandoffCreate = {
      planId: original.planId,
      account: parent.account,
      chainId: parent.chainId,
      request: refreshed.request,
      expiresAt: next.expiresAt,
      display: refreshed.display
    };
    assertCreateInput(input);
    const created = this.createFollowUp(parentId, parentCapability, input);
    const child = this.require(created.id);
    child.latestExecutionPlan = structuredClone(next);
    child.beforeBalances = refreshed.beforeBalances ? structuredClone(refreshed.beforeBalances) : undefined;
    this.activate(created.id);
    return created;
  }

  readFollowUp(parentId: string, parentCapability: string): { id: string; capability: string } {
    const parent = this.requireCapability(parentId, parentCapability);
    if (parent.state !== "confirmed" || !parent.followUpHandoffId) throw new Error("The exact allowance is not finalized or the purchase follow-up is not ready");
    const capability = createHmac("sha256", parentCapability).update(`ariadne-follow-up:${parentId}:${parent.followUpHandoffId}`).digest("base64url");
    const child = this.require(parent.followUpHandoffId);
    if (!matchesCapability(child.capabilityHash, capability)) throw new Error("The linked purchase follow-up no longer matches this allowance session");
    return { id: child.id, capability };
  }

  readMarketReference(id: string, capability: string): NonNullable<ExternalWalletHandoffCreate["display"]["marketReference"]> {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (!session.display.marketReference) throw new Error("This wallet page has no live market-data reference");
    return structuredClone(session.display.marketReference);
  }

  private createWithCapability(input: ExternalWalletHandoffCreate, capability: string, suppliedId?: string): { id: string; capability: string; url: string; expiresAt: number } {
    assertCreateInput(input);
    this.pruneExpired();
    const id = suppliedId ?? randomBytes(16).toString("hex");
    if (!/^[A-Za-z0-9_-]{40,}$/.test(capability)) throw new Error("External wallet capability is malformed");
    const createdAt = (this.options.now ?? Date.now)();
    if (input.expiresAt <= createdAt) throw new Error("External wallet handoff quote has expired");
    const session: StoredHandoff = {
      ...structuredClone(input), id, state: "prepared", createdAt,
      expiresAt: Math.min(input.expiresAt, createdAt + 15 * 60_000),
      capabilityHash: hashCapability(capability)
    };
    this.sessions.set(id, session);
    this.persist();
    return { id, capability, url: `${this.portalOrigin}approve#${id}.${capability}`, expiresAt: session.expiresAt };
  }

  activate(id: string): ExternalWalletHandoffSnapshot {
    const session = this.require(id);
    this.assertLive(session);
    if (session.state !== "prepared") throw new Error("Only a prepared wallet handoff can be activated");
    session.state = "active";
    this.persist();
    return this.snapshot(session);
  }

  cancel(id: string): void {
    const session = this.sessions.get(id);
    if (session && ["prepared", "active"].includes(session.state)) {
      this.sessions.delete(id);
      this.persist();
    }
  }

  readPublic(id: string, capability: string): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    const before = session.state;
    const alreadyOpened = session.pageOpenedAt !== undefined;
    this.expireIfNeeded(session);
    if (session.pageOpenedAt === undefined) session.pageOpenedAt = (this.options.now ?? Date.now)();
    if (before !== session.state || !alreadyOpened) this.persist();
    return this.snapshot(session);
  }

  recordClientStage(id: string, capability: string, stage: ExternalWalletClientStage, detail?: string): ExternalWalletHandoffSnapshot {
    const allowed: ExternalWalletClientStage[] = ["page_loaded", "plan_loaded", "quote_refresh_started", "quote_ready", "provider_discovery_started", "provider_selected", "account_lookup_started", "account_lookup_resolved", "account_request_started", "account_ready", "connect_execute_started", "connect_execute_resolved", "transaction_request_started", "transaction_request_resolved", "client_error"];
    if (!allowed.includes(stage)) throw new Error("Wallet client stage is invalid");
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    session.clientStage = stage;
    session.clientStageAt = (this.options.now ?? Date.now)();
    session.clientStageDetail = detail?.slice(0, 240);
    this.persist();
    return this.snapshot(session);
  }

  /**
   * Persist a failure that happened after the one-time page was opened but before
   * a transaction hash existed. This makes pre-broadcast failures visible to the
   * Agent monitor without ever implying that funds moved.
   */
  recordClientFailure(id: string, capability: string, input: { stage: ExternalWalletFailureStage; reason: string }): ExternalWalletHandoffSnapshot {
    const allowed: ExternalWalletFailureStage[] = ["quote_refresh", "quote_boundary", "wallet_discovery", "wallet_connection", "wallet_preflight", "page_runtime"];
    if (!allowed.includes(input.stage) || !input.reason.trim()) throw new Error("Wallet client failure is incomplete");
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.state !== "active" || session.txHash || ["transaction_request_started", "transaction_request_resolved"].includes(session.clientStage ?? "")) {
      throw new Error("A pre-broadcast failure cannot replace a submitted or transaction-requested handoff");
    }
    const reason = input.reason.trim().slice(0, 500);
    const lastSuccessfulClientStage = session.clientStage ?? null;
    session.state = "failed";
    session.clientStage = "client_error";
    session.clientStageAt = (this.options.now ?? Date.now)();
    session.clientStageDetail = `${input.stage}: ${reason}`.slice(0, 240);
    session.walletError = reason;
    session.reconciliation = {
      status: "not_submitted",
      stage: input.stage,
      lastSuccessfulClientStage,
      transactionHash: null,
      fundsChanged: false,
      reason
    };
    session.resultSummary = `这次购买流程在提交钱包交易前停止：${reason}。没有交易哈希，也没有证据表明资金发生变化。`;
    this.persist();
    return this.snapshot(session);
  }

  portalUrlForExternalOpen(id: string, capability: string): string {
    const session = this.requireCapability(id, capability);
    const before = session.state;
    this.assertLive(session);
    if (session.state !== "active") throw new Error("This wallet page is not active or has already been used");
    if (session.walletAttemptClaimedAt !== undefined) throw new Error("This wallet request has already been attempted; return to Ariadne and inspect its status");
    if (before !== session.state) this.persist();
    // Deliberately do not set pageOpenedAt here. Only the actual approval page's
    // public handoff read counts as evidence that the user loaded that page.
    const language = session.purchaseIntent?.language;
    return `${this.portalOrigin}approve${language ? `?lang=${encodeURIComponent(language)}` : ""}#${id}.${capability}`;
  }

  claimWalletAttempt(id: string, capability: string, attemptId: string): ExternalWalletHandoffSnapshot {
    if (!/^[a-f0-9-]{36}$/i.test(attemptId)) throw new Error("Wallet attempt identifier is invalid");
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.state !== "active") throw new Error("This wallet handoff is not active or has already been used");
    if (session.requiresQuoteAcceptance) throw new Error("Review and accept the displayed current quote before requesting the wallet");
    if (!session.request) throw new Error("A fresh executable wallet request has not been prepared for this purchase plan");
    if (session.quoteExpiresAt !== undefined && session.quoteExpiresAt <= (this.options.now ?? Date.now)()) {
      throw new Error("The current execution quote expired; refresh this same purchase plan before opening the wallet");
    }
    if (session.pageOpenedAt === undefined) throw new Error("The wallet page must load the reviewed request before starting the wallet");
    const attemptHash = createHash("sha256").update(attemptId).digest("hex");
    if (session.walletAttemptIdHash && session.walletAttemptIdHash !== attemptHash) {
      throw new Error("A wallet attempt has already started for this handoff; inspect its status before retrying");
    }
    if (!session.walletAttemptIdHash) {
      session.walletAttemptIdHash = attemptHash;
      session.walletAttemptClaimedAt = (this.options.now ?? Date.now)();
      this.persist();
    }
    return this.snapshot(session);
  }

  submitFromWallet(id: string, capability: string, input: { account: string; chainId: string; txHash?: string; walletError?: string }): ExternalWalletHandoffSnapshot {
    const session = this.requireCapability(id, capability);
    this.assertLive(session);
    if (session.state !== "active") throw new Error("This wallet handoff is not active or has already been used");
    if (!session.walletAttemptIdHash) throw new Error("Wallet attempt was not claimed before submitting a wallet result");
    if (!ADDRESS.test(input.account) || input.chainId !== "0x38" || input.account.toLowerCase() !== session.account.toLowerCase()) {
      session.state = "wallet_rejected";
      session.walletError = "Wallet account or chain differs from the exact purchase plan";
      this.persist();
      return this.snapshot(session);
    }
    if (input.txHash && HASH.test(input.txHash)) {
      session.txHash = input.txHash;
      session.connectedAccount = input.account;
      session.connectedChainId = input.chainId;
      session.state = "submitted";
    } else {
      session.state = input.walletError ? "wallet_uncertain" : "wallet_rejected";
      session.walletError = (input.walletError ?? "The wallet did not return a valid transaction hash").slice(0, 500);
    }
    this.persist();
    return this.snapshot(session);
  }

  readInternal(id: string): ExternalWalletHandoffInternalSnapshot {
    const session = this.require(id);
    const before = session.state;
    this.expireIfNeeded(session);
    if (before !== session.state) this.persist();
    return {
      ...this.snapshot(session),
      ...(session.originalPlan ? { originalPlan: structuredClone(session.originalPlan) } : {}),
      ...(session.latestExecutionPlan ? { latestExecutionPlan: structuredClone(session.latestExecutionPlan) } : {}),
      ...(session.beforeBalances ? { beforeBalances: structuredClone(session.beforeBalances) } : {}),
      ...(session.allowancePlan ? { allowancePlan: structuredClone(session.allowancePlan) } : {})
    } as ExternalWalletHandoffInternalSnapshot;
  }

  setVerification(id: string, update: { state: "confirmed" | "failed"; reconciliation: Record<string, unknown>; resultSummary: string }): ExternalWalletHandoffSnapshot {
    const session = this.require(id);
    if (session.state !== "submitted") throw new Error("Only a wallet-submitted handoff can receive chain verification");
    session.state = update.state;
    session.reconciliation = structuredClone(update.reconciliation);
    session.resultSummary = update.resultSummary.slice(0, 1_000);
    this.persist();
    return this.snapshot(session);
  }

  claimAgentReport(id: string): { claimed: boolean; status: "claimed" | "busy" | "delivered"; snapshot: ExternalWalletHandoffSnapshot } {
    const session = this.require(id);
    this.expireIfNeeded(session);
    if (!["confirmed", "failed", "wallet_rejected", "wallet_uncertain", "expired"].includes(session.state)) {
      throw new Error("Only a terminal wallet handoff can be reported to the Agent");
    }
    if (session.agentReportDeliveredAt !== undefined) {
      return { claimed: false, status: "delivered", snapshot: this.snapshot(session) };
    }
    const now = (this.options.now ?? Date.now)();
    if (session.agentReportClaimedAt !== undefined && now - session.agentReportClaimedAt < 60_000) {
      return { claimed: false, status: "busy", snapshot: this.snapshot(session) };
    }
    session.agentReportClaimedAt = now;
    this.persist();
    return { claimed: true, status: "claimed", snapshot: this.snapshot(session) };
  }

  finishAgentReport(id: string, delivered: boolean): ExternalWalletHandoffSnapshot {
    const session = this.require(id);
    if (session.agentReportClaimedAt === undefined) throw new Error("This Agent report was not claimed");
    if (delivered) session.agentReportDeliveredAt = (this.options.now ?? Date.now)();
    delete session.agentReportClaimedAt;
    this.persist();
    return this.snapshot(session);
  }

  setContinuationStatus(id: string, update: { status: "ready" | "blocked"; reason?: string; followUpHandoffId?: string }): ExternalWalletHandoffSnapshot {
    const session = this.require(id);
    if (session.state !== "confirmed" || session.display.operation !== "allowance_approval") {
      throw new Error("Only a finalized USDT allowance can receive a purchase continuation result");
    }
    if (update.status === "ready" && (!update.followUpHandoffId || session.followUpHandoffId !== update.followUpHandoffId)) {
      throw new Error("The ready purchase continuation does not match the linked follow-up page");
    }
    const reconciliation = session.reconciliation ?? {};
    session.reconciliation = {
      ...reconciliation,
      purchaseFollowUpStatus: update.status,
      ...(update.followUpHandoffId ? { followUpHandoffId: update.followUpHandoffId } : {}),
      ...(update.reason ? { reason: update.reason.slice(0, 500) } : {})
    };
    session.resultSummary = update.status === "ready"
      ? "USDT 授权已在链上确认。Ariadne 已在同一浏览器页面准备好这份原计划对应的独立买入请求；只有你在 MetaMask 中确认后才会买入股票。"
      : `USDT 授权已确认，但没能按原计划准备买入请求，因此没有买入股票。${update.reason ? `原因：${update.reason}` : ""}`;
    this.persist();
    return this.snapshot(session);
  }

  private require(id: string): StoredHandoff {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Wallet handoff was not found or has expired");
    return session;
  }

  private requireCapability(id: string, capability: string): StoredHandoff {
    const session = this.require(id);
    if (!matchesCapability(session.capabilityHash, capability)) throw new Error("Wallet handoff capability is invalid");
    return session;
  }

  private assertLive(session: StoredHandoff): void {
    this.expireIfNeeded(session);
    if (session.state === "expired") throw new Error("Wallet handoff has expired; prepare a fresh quote and plan");
  }

  private expireIfNeeded(session: StoredHandoff): void {
    if (session.expiresAt <= (this.options.now ?? Date.now)() && !["submitted", "confirmed", "failed", "wallet_rejected", "wallet_uncertain"].includes(session.state)) session.state = "expired";
  }

  private pruneExpired(): void {
    const now = (this.options.now ?? Date.now)();
    let changed = false;
    for (const [id, session] of this.sessions) {
      const terminal = ["confirmed", "failed", "wallet_rejected", "wallet_uncertain", "expired"].includes(session.state);
      const terminalStale = terminal && session.createdAt + 30 * 24 * 60 * 60_000 < now;
      const expiredTemporary = !terminal && session.state !== "submitted" && session.expiresAt + 60 * 60_000 < now;
      if (terminalStale || expiredTemporary) {
        this.sessions.delete(id);
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  private persist(): void {
    const path = this.options.storagePath;
    if (!path) return;
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.tmp-${process.pid}`;
    writeFileSync(temporary, JSON.stringify([...this.sessions.values()]), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, path);
    chmodSync(path, 0o600);
  }

  private snapshot(session: StoredHandoff): ExternalWalletHandoffSnapshot {
    const { capabilityHash: _discard, walletAttemptIdHash: _attemptDiscard, originalPlan: _originalDiscard,
      latestExecutionPlan: _latestDiscard, beforeBalances: _beforeDiscard, pendingRequest: _pendingRequestDiscard, ...snapshot } = session;
    const publicSnapshot = structuredClone(snapshot) as ExternalWalletHandoffSnapshot;
    if (session.reviewMode === "purchase_intent") delete publicSnapshot.account;
    return publicSnapshot;
  }
}

export class WalletHandoffRelayClient {
  private readonly baseUrl: URL;

  constructor(private readonly options: { baseUrl: string; secret: string; fetcher?: typeof fetch }) {
    this.baseUrl = new URL(options.baseUrl);
    const isLoopback = this.baseUrl.hostname === "localhost" || this.baseUrl.hostname === "127.0.0.1" || this.baseUrl.hostname === "[::1]";
    if (this.baseUrl.protocol !== "https:" && !(this.baseUrl.protocol === "http:" && isLoopback)) throw new Error("Approval relay URL must use HTTPS except for a loopback test server");
    if (!options.secret.trim()) throw new Error("Approval relay service secret is not configured");
  }

  async assertHealthy(): Promise<void> {
    const fetcher = this.options.fetcher ?? fetch;
    let response: Response;
    try {
      response = await fetcher(new URL("/healthz", this.baseUrl), {
        method: "GET",
        signal: AbortSignal.timeout(2_000)
      });
    } catch (error) {
      const code = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : undefined;
      const reason = code ? `connection failed (${code})` : "connection failed or timed out";
      throw new Error(`Wallet handoff relay is unreachable at ${this.baseUrl.origin}: ${reason}`);
    }
    if (!response.ok) throw new Error(`Wallet handoff relay health check failed at ${this.baseUrl.origin} (${response.status})`);
    const payload = await response.json().catch(() => undefined) as { status?: string; service?: string } | undefined;
    if (payload?.status !== "ok" || payload.service !== "ariadne-wallet-handoff-relay") {
      throw new Error(`Wallet handoff relay at ${this.baseUrl.origin} returned an unexpected health response`);
    }
  }

  async create(input: ExternalWalletHandoffCreate): Promise<{ id: string; capability: string; url: string; expiresAt: number }> {
    return this.internal("POST", "/api/internal/handoffs", input);
  }

  async createPurchasePlanReview(plan: ActionPlan, display: ExternalWalletHandoffCreate["display"]): Promise<{ id: string; capability: string; url: string; expiresAt: number }> {
    return this.internal("POST", "/api/internal/purchase-plan-reviews", { plan, display });
  }

  async createPurchaseIntent(intent: ExternalWalletPurchaseIntent): Promise<{ id: string; capability: string; url: string; expiresAt: number }> {
    return this.internal("POST", "/api/internal/purchase-intents", { intent });
  }

  async bindPurchaseIntent(id: string, capability: string, account: string, chainId: "0x38"): Promise<ExternalWalletHandoffSnapshot> {
    return this.publicRequest("POST", `/api/handoffs/${encodeURIComponent(id)}/bind-wallet`, capability, { account, chainId });
  }

  async preparePurchaseReview(id: string, capability: string): Promise<ExternalWalletHandoffSnapshot> {
    return this.publicRequest("POST", `/api/handoffs/${encodeURIComponent(id)}/refresh-purchase`, capability, {});
  }

  async acceptLatestPurchaseQuote(id: string, capability: string, quoteId: string): Promise<ExternalWalletHandoffSnapshot> {
    return this.publicRequest("POST", `/api/handoffs/${encodeURIComponent(id)}/accept-purchase-quote`, capability, { quoteId });
  }

  async finalizeAllowancePurchase(id: string, capability: string): Promise<ExternalWalletHandoffSnapshot & { followUp?: { id: string; capability: string } }> {
    return this.publicRequest("POST", `/api/handoffs/${encodeURIComponent(id)}/finalize-allowance`, capability, {});
  }

  async createFollowUp(parentId: string, parentCapability: string, input: ExternalWalletHandoffCreate): Promise<{ id: string; capability: string; url: string; expiresAt: number }> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(parentId)}/follow-up`, { parentCapability, handoff: input });
  }

  async readFollowUp(parentId: string, parentCapability: string): Promise<{ id: string; capability: string }> {
    return this.publicRequest("GET", `/api/handoffs/${encodeURIComponent(parentId)}/follow-up`, parentCapability);
  }

  async readMarket(id: string, capability: string): Promise<ExternalWalletMarketSnapshot> {
    return this.publicRequest("GET", `/api/handoffs/${encodeURIComponent(id)}/market`, capability);
  }

  async readCandles(id: string, capability: string, interval: ExternalWalletCandleInterval = "5m", limit = 100): Promise<ExternalWalletCandles> {
    const query = new URLSearchParams({ interval, limit: String(limit) });
    return this.publicRequest("GET", `/api/handoffs/${encodeURIComponent(id)}/candles?${query}`, capability);
  }

  browserOpenUrl(id: string, capability: string, portalUrl: string): string {
    if (!/^[a-f0-9]{32}$/.test(id) || !/^[A-Za-z0-9_-]{40,}$/.test(capability)) throw new Error("Wallet page handoff link is malformed");
    const parsedPortalUrl = new URL(portalUrl);
    const isLoopback = this.baseUrl.hostname === "localhost" || this.baseUrl.hostname === "127.0.0.1" || this.baseUrl.hostname === "[::1]";
    if (this.baseUrl.protocol === "http:" && isLoopback) {
      const launcher = new URL(`/open-external/${id}`, this.baseUrl);
      launcher.hash = capability;
      return launcher.toString();
    }
    if (parsedPortalUrl.protocol !== "https:") throw new Error("A non-local wallet page must use HTTPS");
    return parsedPortalUrl.toString();
  }

  async activate(id: string): Promise<ExternalWalletHandoffSnapshot> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(id)}/activate`, {});
  }

  async cancel(id: string): Promise<void> {
    await this.internal("DELETE", `/api/internal/handoffs/${encodeURIComponent(id)}`, {});
  }

  async read(id: string): Promise<ExternalWalletHandoffInternalSnapshot> {
    return this.internal("GET", `/api/internal/handoffs/${encodeURIComponent(id)}`);
  }

  private async publicRequest<T>(method: string, path: string, capability: string, body?: unknown): Promise<T> {
    const fetcher = this.options.fetcher ?? fetch;
    let response: Response;
    try {
      response = await fetcher(new URL(path, this.baseUrl), {
        method,
        headers: { authorization: `Bearer ${capability}`, origin: this.baseUrl.origin, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(8_000)
      });
    } catch (error) {
      const code = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : undefined;
      const reason = code ? `connection failed (${code})` : "connection failed or timed out";
      throw new Error(`Wallet handoff relay became unreachable at ${this.baseUrl.origin}: ${reason}`);
    }
    const parsed = await response.json().catch(() => undefined) as { error?: string } | T | undefined;
    if (!response.ok) throw new Error(typeof parsed === "object" && parsed && "error" in parsed ? String(parsed.error) : `Approval relay request failed (${response.status})`);
    return parsed as T;
  }

  async setVerification(id: string, update: { state: "confirmed" | "failed"; reconciliation: Record<string, unknown>; resultSummary: string }): Promise<ExternalWalletHandoffSnapshot> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(id)}/verification`, update);
  }

  async claimAgentReport(id: string): Promise<{ claimed: boolean; status: "claimed" | "busy" | "delivered"; snapshot: ExternalWalletHandoffSnapshot }> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(id)}/agent-report-claim`, {});
  }

  async finishAgentReport(id: string, delivered: boolean): Promise<ExternalWalletHandoffSnapshot> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(id)}/agent-report-result`, { delivered });
  }

  async setContinuationStatus(id: string, update: { status: "ready" | "blocked"; reason?: string; followUpHandoffId?: string }): Promise<ExternalWalletHandoffSnapshot> {
    return this.internal("POST", `/api/internal/handoffs/${encodeURIComponent(id)}/continuation`, update);
  }

  private async internal<T>(method: string, path: string, body?: unknown): Promise<T> {
    const fetcher = this.options.fetcher ?? fetch;
    let response: Response;
    try {
      response = await fetcher(new URL(path, this.baseUrl), {
        method,
        headers: { authorization: `Bearer ${this.options.secret}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(8_000)
      });
    } catch (error) {
      const code = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : undefined;
      const reason = code ? `connection failed (${code})` : "connection failed or timed out";
      throw new Error(`Wallet handoff relay became unreachable at ${this.baseUrl.origin}: ${reason}`);
    }
    const parsed = await response.json().catch(() => undefined) as { error?: string } | T | undefined;
    if (!response.ok) throw new Error(typeof parsed === "object" && parsed && "error" in parsed ? String(parsed.error) : `Approval relay request failed (${response.status})`);
    return parsed as T;
  }
}
