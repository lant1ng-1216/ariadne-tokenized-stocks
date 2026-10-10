#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { BinanceWeb3Client } from "../binance-web3-client.js";
import { TokenizedStocksService } from "../services/tokenized-stocks.js";
import { WalletService } from "../services/wallet.js";
import { TransactionService } from "../services/transaction.js";
import { SettlementReconciler, type BalanceSnapshot } from "../services/settlement-reconciler.js";
import { bindSettlementTransactionHash } from "../services/settlement-hash-binding.js";
import { buildWalletSubmissionRequest, walletSubmissionRequestsMatch, walletTransactionMismatches, type ExpectedWalletTransaction } from "../services/eip1193-wallet.js";
import { assertExecutable, attachSimulation, confirmPlan, isPlanExpired } from "../domain/action-plan.js";
import type { ActionPlan, AllowanceApprovalPlan, StockAsset } from "../domain/types.js";
import { errorOutcome, outcome, textResult } from "./response.js";
import { compareAgentAssets, toAgentAsset } from "../domain/agent-normalizers.js";
import type { AssetPreference } from "../domain/agent-types.js";
import { renderAssetCard, renderComparisonTable, renderResearchBrief, renderResearchInterpretation, researchNextSteps } from "../presentation/asset-view.js";
import { DemoTokenizedStocksService } from "../services/demo-tokenized-stocks.js";
import { AmbiguousAssetQueryError, explicitlyRequestsNoTrade, searchAssetIntent } from "../services/asset-intent-query.js";
import { performance } from "node:perf_hooks";
import { PlanRegistry } from "./plan-registry.js";
import { assertSignedTransactionMatchesPlan } from "../domain/signed-transaction.js";
import { assessSignedTransactionFee, requireReviewedGasBudget } from "../domain/gas-safety.js";
import { assertAllowanceCoversPlan } from "../domain/balance-safety.js";
import { formatTokenAmount, parseTokenAmount } from "../domain/amount.js";
import { WalletHandoffRelayClient, type ExternalWalletTransaction } from "../services/wallet-handoff-relay.js";
import { enrichAgentAssets, type MarketContextEnrichmentDiagnostics } from "./asset-enrichment.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { buildResearchAppHtml } from "./ui/research-app-html.js";
import { buildCatalogAppHtml } from "./ui/catalog-app-html.js";
import { buildPurchaseApprovalAppHtml } from "./ui/purchase-approval-app-html.js";
import { registerActionPlanConfirmationTool } from "./user-confirmation.js";
import { inferOutputLanguage, localizeEvidenceMessage } from "../presentation/language.js";
import { PurchasePlanStageError, purchasePlanStageLabel } from "../services/purchase-plan-error.js";
import { buildCatalogBrowsePayload } from "./catalog-browse.js";
import { ensureWalletHandoffRelayReady } from "./wallet-handoff-relay-readiness.js";
import { BROWSER_PURCHASE_FEE_POLICY, DEFAULT_BROWSER_PURCHASE_SLIPPAGE_BPS } from "../domain/purchase-defaults.js";
import { randomUUID } from "node:crypto";

type McpServerDependencies = {
  client?: BinanceWeb3Client;
  stocks?: TokenizedStocksService | DemoTokenizedStocksService;
  wallet?: WalletService;
  transactions?: TransactionService;
};

export function buildMcpServer(dependencies: McpServerDependencies = {}): McpServer {
const demoMode = process.env.ARIADNE_MODE === "demo";
const apiKey = process.env.BINANCE_WEB3_API_KEY?.trim();
const apiSecret = process.env.BINANCE_WEB3_API_SECRET?.trim();
if (!demoMode && !dependencies.stocks && (!apiKey || !apiSecret)) throw new Error("Missing Binance Web3 credentials in .env. Set ARIADNE_MODE=demo for credential-free read-only exploration.");

const client = dependencies.client ?? new BinanceWeb3Client({
  apiKey: apiKey ?? "demo",
  apiSecret: apiSecret ?? "demo",
  baseUrl: process.env.BINANCE_WEB3_BASE_URL,
  proxyUrl: process.env.BINANCE_WEB3_PROXY_URL
});
const stocks = dependencies.stocks ?? (demoMode ? new DemoTokenizedStocksService(client) : new TokenizedStocksService(client));
const wallet = dependencies.wallet ?? new WalletService(client);
const transactions = dependencies.transactions ?? new TransactionService(client);
const settlement = new SettlementReconciler(transactions);
const settlementRecords = new Map<string, {
  before: BalanceSnapshot;
  txHash?: string;
  expectedTransaction?: ExpectedWalletTransaction;
  walletHashRegistered?: boolean;
}>();
const externalHandoffIds = new Map<string, string>();
const externalAllowanceHandoffIds = new Map<string, string>();
const externalAllowanceHandoffCapabilities = new Map<string, string>();
const allowancePlanHandoffIds = new Map<string, string>();
const allowanceApprovalPlans = new Map<string, AllowanceApprovalPlan>();
const allowanceWalletPages = new Map<string, { handoffId: string; browserOpenUrl: string; expiresAt: number }>();
const plans = new PlanRegistry();
const elapsedMs = (startedAt: number) => Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100);
const BSC_CHAIN_ID = "56";

const currentDirectoryStocks = {
  search: async (query: string, options: { chainId?: string; platformId?: string } = {}) =>
    (await stocks.searchCurrentDirectory(query, options)).assets,
  list: async (options: { chainId?: string; platformId?: string } = {}) => stocks.list(options),
};

function unsupportedResearchChain(query: string, requestedChainId?: string): string | undefined {
  const supplied = requestedChainId?.trim().toLowerCase();
  const bscAliases = new Set(["56", "bsc", "bnb", "bnb chain", "bnbchain", "bnb smart chain", "binance smart chain"]);
  if (supplied && !bscAliases.has(supplied)) return requestedChainId;
  const otherChain = query.match(/\b(?:ethereum|solana|polygon|arbitrum|optimism|avalanche|base)\b|\b(?:on|chain|network)\s+(?:eth|sol)\b|以太坊|索拉纳|波场|雪崩链/i)?.[0];
  return otherChain;
}

function bscOnlyScopeResult(query: string, requestedChain: string) {
  const zh = inferOutputLanguage(query) === "zh-CN";
  const summary = zh
    ? `当前参赛版只提供 BSC 上的 Binance Web3 链上股票数据；${requestedChain} 不在本次支持范围内。`
    : `The current competition build provides Binance Web3 tokenized-stock data on BSC only; ${requestedChain} is outside this release's supported scope.`;
  return textResult(outcome({ summary, requestedChain, supportedChainId: BSC_CHAIN_ID }, "blocked",
    zh ? "请查询 BSC（BNB Chain）上的发行方和行情。" : "Query issuer representations and market data on BSC (BNB Chain).",
    { sideEffects: "none" }), { structuredContent: true });
}

function onlyBscAssets<T extends { chainId: string }>(assets: T[]): T[] {
  return assets.filter((asset) => asset.chainId === BSC_CHAIN_ID);
}

function issuerDisplayName(platformId: string): string {
  if (platformId === "bstock") return "bStocks";
  if (platformId === "ondo") return "Ondo";
  return platformId;
}

function ambiguousAssetResult(error: AmbiguousAssetQueryError, query: string) {
  const language = inferOutputLanguage(query);
  const summary = language === "zh-CN"
    ? `请求涉及多个标的（${error.tickers.join("、")}），请先指定一个股票代码或公司。`
    : error.message;
  const nextAction = language === "zh-CN" ? "请先选择一个标的，再继续查询。" : "Ask the user to choose one underlying ticker or company before continuing";
  return textResult(outcome({ summary, candidateTickers: error.tickers }, "blocked", nextAction, { sideEffects: "none" }));
}

function extractTransactionHash(value: unknown): string | undefined {
  const queue: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  const seen = new Set<object>();
  while (queue.length) {
    const current = queue.shift()!;
    if (!current.value || typeof current.value !== "object" || Array.isArray(current.value) || current.depth > 3 || seen.has(current.value)) continue;
    seen.add(current.value);
    const record = current.value as Record<string, unknown>;
    for (const key of ["txHash", "transactionHash", "hash"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && /^0x[0-9a-fA-F]{64}$/.test(candidate)) return candidate;
    }
    for (const nested of Object.values(record)) queue.push({ value: nested, depth: current.depth + 1 });
  }
  return undefined;
}

async function enrichAgentAsset(asset: Parameters<typeof toAgentAsset>[0], requestMarketContext = true) {
  if (!requestMarketContext) return toAgentAsset(asset);
  try {
    const market = await stocks.marketContext(asset);
    return toAgentAsset(asset, market, {}, {}, { marketContextRequested: true });
  } catch {
    return toAgentAsset(asset, undefined, {}, {}, { marketContextRequested: true, marketContextUnavailable: true });
  }
}

const server = new McpServer({ name: "ariadne-tokenized-stocks", version: "0.1.0" });
const CATALOG_UI_URI = "ui://ariadne/catalog-view-v1.html";
const RESEARCH_UI_URI = "ui://ariadne/research-view-v2.html";
const PURCHASE_APPROVAL_UI_URI = "ui://ariadne/purchase-approval-v9.html";
const PURCHASE_APPROVAL_UI_DOMAIN = "https://web-sandbox.oaiusercontent.com";
const researchUiHtml = buildResearchAppHtml();
const catalogUiHtml = buildCatalogAppHtml();
const purchaseApprovalUiHtml = buildPurchaseApprovalAppHtml({ reownProjectId: process.env.ARIADNE_REOWN_PROJECT_ID });
const purchaseApprovalUiCsp = {
  connectDomains: [
    "wss://relay.walletconnect.org",
    "https://verify.walletconnect.org",
    "https://verify.walletconnect.com"
  ],
  frameDomains: [
    "https://verify.walletconnect.org",
    "https://verify.walletconnect.com"
  ]
};
const purchaseApprovalUiMetadata = {
  "openai/widgetDomain": PURCHASE_APPROVAL_UI_DOMAIN,
  ui: {
    prefersBorder: true,
    domain: PURCHASE_APPROVAL_UI_DOMAIN,
    csp: purchaseApprovalUiCsp
  }
};

function walletHandoffRelay(): WalletHandoffRelayClient {
  const baseUrl = process.env.ARIADNE_WALLET_HANDOFF_RELAY_URL;
  const secret = process.env.ARIADNE_WALLET_HANDOFF_RELAY_SECRET;
  if (!baseUrl || !secret) throw new Error("The branded wallet approval portal is not configured. Set ARIADNE_WALLET_HANDOFF_RELAY_URL and ARIADNE_WALLET_HANDOFF_RELAY_SECRET on the Ariadne MCP server.");
  return new WalletHandoffRelayClient({ baseUrl, secret });
}

async function prepareAllowanceWalletPage(plan: AllowanceApprovalPlan): Promise<{ handoffId: string; browserOpenUrl: string; expiresAt: number }> {
  const existing = allowanceWalletPages.get(plan.approvalPlanId);
  if (existing && existing.expiresAt > Date.now()) return existing;
  if (allowancePlanHandoffIds.has(plan.approvalPlanId)) {
    throw new Error("This exact approval plan already has a wallet page attempt. Refresh the plan before trying again.");
  }
  if (!plan.unsignedTransaction || plan.status !== "ready_for_wallet_review") throw new Error("The exact USDT approval request is not ready for wallet review");
  if (plan.expiresAt <= Date.now()) throw new Error("The allowance review expired; prepare a fresh amount, gas estimate and wallet review");

  allowancePlanHandoffIds.set(plan.approvalPlanId, "creating");
  let createdId: string | undefined;
  let failureStep = "validating the reviewed approval request";
  try {
    const tx = plan.unsignedTransaction;
    if (typeof tx.from !== "string" || typeof tx.to !== "string" || typeof tx.data !== "string" ||
      typeof tx.gas !== "string" || typeof tx.gasPrice !== "string" || tx.value !== "0") {
      throw new Error("The prepared allowance lacks exact sender, token, calldata or gas fields");
    }
    if (tx.from.toLowerCase() !== plan.walletAddress.toLowerCase() || tx.to.toLowerCase() !== plan.inputToken.contractAddress.toLowerCase()) {
      throw new Error("The allowance transaction does not match the reviewed wallet and verified USDT contract");
    }
    const request: ExternalWalletTransaction = { from: tx.from, to: tx.to, value: "0x0", data: tx.data, gas: tx.gas, gasPrice: tx.gasPrice };
    const requestGasWei = BigInt(request.gas) * BigInt(request.gasPrice);
    const reviewedGasCapWei = parseTokenAmount(plan.maxGasCostBnb, 18);
    failureStep = "checking the current USDT allowance on BSC";
    const allowance = await transactions.erc20Allowance("56", plan.inputToken.contractAddress, plan.walletAddress, plan.spender);
    failureStep = "validating the current allowance and reviewed fee cap";
    if (allowance >= BigInt(plan.amountBaseUnits)) throw new Error("USDT allowance is already sufficient. Skip this transaction and prepare a fresh stock-purchase quote.");
    if (requestGasWei > reviewedGasCapWei) throw new Error("The allowance transaction gas fields exceed the reviewed maximum gas cap; prepare a fresh review");
    failureStep = "creating Ariadne's one-time wallet page";
    const created = await walletHandoffRelay().create({
      planId: plan.approvalPlanId, account: plan.walletAddress, chainId: "0x38", request,
      expiresAt: plan.expiresAt,
      display: {
        operation: "allowance_approval",
        issuer: issuerDisplayName(plan.purchase.asset.platformId), ticker: plan.purchase.asset.underlyingTicker,
        inputAmount: formatTokenAmount(plan.amountBaseUnits, plan.inputToken.decimals), inputSymbol: plan.inputToken.symbol,
        inputContract: plan.inputToken.contractAddress,
        expectedOutput: "No stock purchased in this step", outputSymbol: plan.outputToken.symbol,
        outputContract: plan.outputToken.contractAddress, minimumOutput: "Not applicable",
        spender: plan.spender, marketStatus: plan.marketReview.status,
        allowanceCurrent: formatTokenAmount(allowance.toString(), plan.inputToken.decimals),
        allowanceRequired: formatTokenAmount(plan.amountBaseUnits, plan.inputToken.decimals),
        allowanceStatus: "insufficient" as const,
        ...(plan.marketReview.warnings.length ? { marketCaveat: plan.marketReview.warnings.join("; ") } : {}),
        slippageBps: plan.purchase.maxSlippageBps, maxGasCostBnb: plan.maxGasCostBnb,
        ...(plan.purchase.maxGasCostBnb ? { purchaseMaxGasCostBnb: plan.purchase.maxGasCostBnb } : {}),
        ...(plan.confirmedPurchasePlan ? {
          marketReference: { chainId: "56", platformId: plan.confirmedPurchasePlan.intent.toAsset.platformId, contractAddress: plan.confirmedPurchasePlan.intent.toAsset.contractAddress },
          ...(plan.confirmedPurchasePlan.assetContext?.tokenPrice ? { marketBaseline: {
            tokenPrice: plan.confirmedPurchasePlan.assetContext.tokenPrice,
            ...(plan.confirmedPurchasePlan.assetContext.referencePrice ? { referencePrice: plan.confirmedPurchasePlan.assetContext.referencePrice } : {}),
            ...(plan.confirmedPurchasePlan.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: plan.confirmedPurchasePlan.assetContext.tokenPriceUpdatedAt } : {})
          } } : {}),
          ...(plan.confirmedPurchasePlan.expectedOutput && plan.confirmedPurchasePlan.minimumOutput && plan.confirmedPurchasePlan.verifiedTokens ? { purchaseBaseline: {
            expectedOutput: plan.confirmedPurchasePlan.expectedOutput,
            minimumOutput: plan.confirmedPurchasePlan.minimumOutput,
            outputDecimals: plan.confirmedPurchasePlan.verifiedTokens.output.decimals,
            slippageBps: plan.confirmedPurchasePlan.intent.maxSlippageBps ?? 0
          } } : {})
        } : {})
      }
    });
    createdId = created.id;
    failureStep = "activating Ariadne's one-time wallet page";
    await walletHandoffRelay().activate(created.id);
    const page = {
      handoffId: created.id,
      browserOpenUrl: walletHandoffRelay().browserOpenUrl(created.id, created.capability, created.url),
      expiresAt: created.expiresAt
    };
    externalAllowanceHandoffIds.set(created.id, plan.approvalPlanId);
    externalAllowanceHandoffCapabilities.set(created.id, created.capability);
    allowancePlanHandoffIds.set(plan.approvalPlanId, created.id);
    allowanceWalletPages.set(plan.approvalPlanId, page);
    return page;
  } catch (error) {
    if (createdId) await walletHandoffRelay().cancel(createdId).catch(() => undefined);
    if (allowancePlanHandoffIds.get(plan.approvalPlanId) === "creating") allowancePlanHandoffIds.delete(plan.approvalPlanId);
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${failureStep} failed: ${reason}`);
  }
}

async function reserveWalletSubmission(planId: string, walletRequest: unknown) {
  const trusted = plans.requireById(planId, "confirmed");
  if (isPlanExpired(trusted)) throw new Error("The purchase quote has expired; prepare and confirm a fresh plan");
  const { request, expected } = buildWalletSubmissionRequest(trusted);
  if (!walletSubmissionRequestsMatch(request, walletRequest)) throw new Error("The wallet transaction request differs from the exact confirmed plan; no wallet attempt was reserved");
  if (!trusted.verifiedTokens || !trusted.minimumOutput) throw new Error("The confirmed plan lacks verified token identities or a reviewed minimum output");
  const allowance = await transactions.erc20Allowance(
    trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender
  );
  assertAllowanceCoversPlan(trusted, allowance);
  const before = await settlement.captureBefore({
    chainId: trusted.intent.toAsset.chainId, walletAddress: trusted.intent.walletAddress,
    inputToken: trusted.verifiedTokens.input, outputToken: trusted.verifiedTokens.output
  });
  plans.reserveBroadcast(trusted);
  settlementRecords.set(trusted.planId, { before, expectedTransaction: expected });
  return { trusted, request: request as ExternalWalletTransaction, expected, before };
}

function purchaseHandoffDisplay(trusted: ActionPlan, baseline: ActionPlan = trusted) {
  if (!trusted.verifiedTokens || !trusted.expectedOutput || !trusted.minimumOutput || !trusted.intent.maxGasCostBnb || !trusted.authorizationCheck?.spender) {
    throw new Error("The confirmed purchase is missing exact display and safety boundaries");
  }
  return {
    operation: "purchase" as const,
    issuer: issuerDisplayName(trusted.intent.toAsset.platformId), ticker: trusted.intent.toAsset.underlyingTicker,
    underlyingName: trusted.intent.toAsset.underlyingName,
    ...(trusted.assetContext?.asset.tokenLogoUrl ?? trusted.intent.toAsset.tokenLogoUrl
      ? { tokenLogoUrl: trusted.assetContext?.asset.tokenLogoUrl ?? trusted.intent.toAsset.tokenLogoUrl }
      : {}),
    ...(trusted.assetContext?.asset.issuerLogoUrl ?? trusted.intent.toAsset.issuerLogoUrl
      ? { issuerLogoUrl: trusted.assetContext?.asset.issuerLogoUrl ?? trusted.intent.toAsset.issuerLogoUrl }
      : {}),
    inputAmount: trusted.intent.amount, inputSymbol: trusted.verifiedTokens.input.symbol,
    inputContract: trusted.verifiedTokens.input.contractAddress,
    expectedOutput: formatTokenAmount(trusted.expectedOutput, trusted.verifiedTokens.output.decimals),
    outputSymbol: trusted.verifiedTokens.output.symbol, outputContract: trusted.verifiedTokens.output.contractAddress,
    minimumOutput: formatTokenAmount(trusted.minimumOutput, trusted.verifiedTokens.output.decimals),
    spender: trusted.authorizationCheck.spender,
    ...(trusted.authorizationCheck.requiredAmount ? {
      allowanceRequired: formatTokenAmount(trusted.authorizationCheck.requiredAmount, trusted.verifiedTokens.input.decimals),
      ...(trusted.authorizationCheck.reviewedAllowance !== undefined ? {
        allowanceCurrent: formatTokenAmount(trusted.authorizationCheck.reviewedAllowance, trusted.verifiedTokens.input.decimals),
        allowanceStatus: BigInt(trusted.authorizationCheck.reviewedAllowance) >= BigInt(trusted.authorizationCheck.requiredAmount) ? "sufficient" as const : "insufficient" as const
      } : { allowanceStatus: "unverified" as const })
    } : {}),
    ...(trusted.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: trusted.estimatedFees.providerRouteFeeUsd } : {}),
    marketStatus: trusted.assetContext?.marketStatus ?? "unknown",
    ...(trusted.assetContext?.dataWarnings?.length ? { marketCaveat: trusted.assetContext.dataWarnings.join("; ") } : {}),
    slippageBps: trusted.intent.maxSlippageBps ?? 0, maxGasCostBnb: trusted.intent.maxGasCostBnb,
    marketReference: { chainId: "56" as const, platformId: trusted.intent.toAsset.platformId, contractAddress: trusted.intent.toAsset.contractAddress },
    ...(baseline.assetContext?.tokenPrice ? { marketBaseline: {
      tokenPrice: baseline.assetContext.tokenPrice,
      ...(baseline.assetContext.referencePrice ? { referencePrice: baseline.assetContext.referencePrice } : {}),
      ...(baseline.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: baseline.assetContext.tokenPriceUpdatedAt } : {})
    } } : {}),
    ...(baseline.expectedOutput && baseline.minimumOutput && baseline.verifiedTokens ? { purchaseBaseline: {
      expectedOutput: baseline.expectedOutput, minimumOutput: baseline.minimumOutput,
      outputDecimals: baseline.verifiedTokens.output.decimals,
      slippageBps: baseline.intent.maxSlippageBps ?? 0
    } } : {}),
    ...(baseline.planId !== trusted.planId ? { continuationOfPlanId: baseline.planId } : {})
  };
}

function purchasePlanReviewDisplay(plan: ActionPlan) {
  if (!plan.verifiedTokens || !plan.expectedOutput || !plan.minimumOutput || !plan.authorizationCheck?.spender) {
    throw new Error("The purchase plan lacks verified tokens, a quote or a spender required for its browser review link");
  }
  return {
    operation: "purchase" as const,
    issuer: issuerDisplayName(plan.intent.toAsset.platformId),
    ticker: plan.intent.toAsset.underlyingTicker,
    underlyingName: plan.intent.toAsset.underlyingName,
    ...(plan.assetContext?.asset.tokenLogoUrl ?? plan.intent.toAsset.tokenLogoUrl
      ? { tokenLogoUrl: plan.assetContext?.asset.tokenLogoUrl ?? plan.intent.toAsset.tokenLogoUrl }
      : {}),
    ...(plan.assetContext?.asset.issuerLogoUrl ?? plan.intent.toAsset.issuerLogoUrl
      ? { issuerLogoUrl: plan.assetContext?.asset.issuerLogoUrl ?? plan.intent.toAsset.issuerLogoUrl }
      : {}),
    inputAmount: plan.intent.amount,
    inputSymbol: plan.verifiedTokens.input.symbol,
    inputContract: plan.verifiedTokens.input.contractAddress,
    expectedOutput: formatTokenAmount(plan.expectedOutput, plan.verifiedTokens.output.decimals),
    outputSymbol: plan.verifiedTokens.output.symbol,
    outputContract: plan.verifiedTokens.output.contractAddress,
    minimumOutput: formatTokenAmount(plan.minimumOutput, plan.verifiedTokens.output.decimals),
    spender: plan.authorizationCheck.spender,
    allowanceRequired: formatTokenAmount(plan.authorizationCheck.requiredAmount, plan.verifiedTokens.input.decimals),
    ...(plan.authorizationCheck.reviewedAllowance !== undefined ? {
      allowanceCurrent: formatTokenAmount(plan.authorizationCheck.reviewedAllowance, plan.verifiedTokens.input.decimals),
      allowanceStatus: BigInt(plan.authorizationCheck.reviewedAllowance) >= BigInt(plan.authorizationCheck.requiredAmount) ? "sufficient" as const : "insufficient" as const
    } : { allowanceStatus: "unverified" as const }),
    ...(plan.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: plan.estimatedFees.estimatedMaxGasCostBnb } : {}),
    ...(plan.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: plan.estimatedFees.providerRouteFeeUsd } : {}),
    marketStatus: plan.assetContext?.marketStatus ?? "unknown",
    ...(plan.assetContext?.dataWarnings?.length ? { marketCaveat: plan.assetContext.dataWarnings.join("; ") } : {}),
    slippageBps: plan.intent.maxSlippageBps ?? 0,
    maxGasCostBnb: plan.intent.maxGasCostBnb ?? plan.estimatedFees?.estimatedMaxGasCostBnb ?? "Will refresh before wallet review",
    marketReference: { chainId: "56" as const, platformId: plan.intent.toAsset.platformId, contractAddress: plan.intent.toAsset.contractAddress },
    ...(plan.assetContext?.tokenPrice ? { marketBaseline: {
      tokenPrice: plan.assetContext.tokenPrice,
      ...(plan.assetContext.referencePrice ? { referencePrice: plan.assetContext.referencePrice } : {}),
      ...(plan.assetContext.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: plan.assetContext.tokenPriceUpdatedAt } : {})
    } } : {}),
    purchaseBaseline: {
      expectedOutput: plan.expectedOutput,
      minimumOutput: plan.minimumOutput,
      outputDecimals: plan.verifiedTokens.output.decimals,
      slippageBps: plan.intent.maxSlippageBps ?? 0,
      ...(plan.estimatedFees?.estimatedMaxGasCostBnb ? { estimatedNetworkFeeBnb: plan.estimatedFees.estimatedMaxGasCostBnb } : {}),
      ...(plan.estimatedFees?.providerRouteFeeUsd ? { routeFeeUsd: plan.estimatedFees.providerRouteFeeUsd } : {})
    }
  };
}

async function createAllowanceContinuationPurchaseHandoff(parentHandoffId: string, approvalPlan: AllowanceApprovalPlan, plan: ActionPlan): Promise<string> {
  const parentPlan = approvalPlan.confirmedPurchasePlan;
  const parentCapability = externalAllowanceHandoffCapabilities.get(parentHandoffId);
  if (!parentPlan || !parentCapability) throw new Error("The confirmed purchase plan or one-time page session is unavailable for continuation");
  const { request } = buildWalletSubmissionRequest(plan);
  const relay = walletHandoffRelay();
  const created = await relay.createFollowUp(parentHandoffId, parentCapability, {
    planId: plan.planId, account: plan.intent.walletAddress, chainId: "0x38",
    request: request as ExternalWalletTransaction, expiresAt: plan.expiresAt!,
    display: purchaseHandoffDisplay(plan, parentPlan)
  });
  try {
    await reserveWalletSubmission(plan.planId, request);
    await relay.activate(created.id);
  } catch (error) {
    await relay.cancel(created.id).catch(() => undefined);
    throw error;
  }
  externalHandoffIds.set(created.id, plan.planId);
  return created.id;
}

const catalogCoverageWarning = () => demoMode
  ? "Demo Mode uses a limited synthetic sample and is not a complete live asset catalog"
  : "Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified";

registerAppResource(server, "Ariadne asset research view", RESEARCH_UI_URI, {
  description: "Read-only visual comparison of tokenized-stock representations returned by Ariadne research tools."
}, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: await researchUiHtml }]
}));

registerAppResource(server, "Ariadne BSC stock catalog", CATALOG_UI_URI, {
  description: "Read-only market-roaming view of the tokenized-stock representations returned by the current Binance Web3 BSC catalog request."
}, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: await catalogUiHtml }]
}));

registerAppResource(server, "Ariadne purchase approval panel", PURCHASE_APPROVAL_UI_URI, {
  description: "In-conversation BSC purchase review and user-controlled wallet connection. The panel uses an exposed wallet bridge when available or its configured in-panel WalletConnect QR; wallet signatures remain in the wallet.",
  _meta: purchaseApprovalUiMetadata
}, async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: RESOURCE_MIME_TYPE,
    text: await purchaseApprovalUiHtml,
    _meta: purchaseApprovalUiMetadata
  }]
}));

registerAppTool(server, "browse_tokenized_stock_catalog", {
  title: "Browse the BSC tokenized-stock catalog",
  description: "Use this read-only capability when the user is exploring the BSC tokenized-stock market before choosing a specific company or ticker, asks what issuers or asset types are available, or wants candidates represented by multiple issuers. The Agent should select this capability from the user's conversational stage and meaning; examples are illustrative and are not phrase triggers. Once the user selects a company or ticker, use the specific research and comparison tools instead. Counts describe only the current Binance Web3 response and do not claim a complete market universe.",
  _meta: { ui: { resourceUri: CATALOG_UI_URI } },
  inputSchema: {
    query: z.string().min(1).optional().describe("Optional conversation context used only to choose output language; it is not parsed as a fixed intent command."),
    language: z.enum(["zh-CN", "en"]).optional(),
    chainId: z.string().optional(),
    issuerIds: z.array(z.string().min(1)).optional(),
    assetTypes: z.array(z.number().int().nonnegative()).optional(),
    multiIssuerOnly: z.boolean().optional(),
    offset: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }
}, async ({ query, language: requestedLanguage, chainId, issuerIds, assetTypes, multiIssuerOnly, offset, limit }) => {
  const language = requestedLanguage ?? inferOutputLanguage(query ?? "");
  const context = query ?? (language === "zh-CN" ? "浏览 BSC 链上股票目录" : "Browse the BSC tokenized-stock catalog");
  try {
    const unsupportedChain = unsupportedResearchChain(context, chainId);
    if (unsupportedChain) return bscOnlyScopeResult(context, unsupportedChain);
    const snapshot = await stocks.listSnapshot({ chainId: BSC_CHAIN_ID });
    const catalog = buildCatalogBrowsePayload(snapshot, { issuerIds, assetTypes, multiIssuerOnly, offset, limit }, language);
    catalog.warnings = [...new Set(catalog.warnings.length ? catalog.warnings : [catalogCoverageWarning()])].map((warning) => localizeEvidenceMessage(warning, language));
    const hasResults = catalog.filtered.uniqueUnderlyingCount > 0;
    const summary = language === "zh-CN"
      ? hasResults
        ? `本次 Binance Web3 在 BSC 返回 ${catalog.scope.uniqueUnderlyingCount} 个标的、${catalog.scope.representationCount} 个链上版本；当前条件显示 ${catalog.filtered.uniqueUnderlyingCount} 个标的`
        : "本次 Binance Web3 目录已返回，但当前筛选条件没有匹配标的"
      : hasResults
        ? `This Binance Web3 BSC response contains ${catalog.scope.uniqueUnderlyingCount} underlyings and ${catalog.scope.representationCount} representations; ${catalog.filtered.uniqueUnderlyingCount} underlyings match the current filters`
        : "The Binance Web3 catalog returned, but no underlying matches the current filters";
    const nextAction = language === "zh-CN"
      ? hasResults ? "选择一个标的，继续查看其发行方版本、行情快照和数据缺口" : "放宽发行方、资产类型或双发行方筛选"
      : hasResults ? "Choose one underlying to research its issuer representations, market snapshot and data gaps" : "Relax issuer, asset-type or dual-issuer filters";
    const payload = outcome({
      ...catalog,
      query: context,
      summary,
      presentation: language === "zh-CN"
        ? `目录面板已展示本次返回的市场范围。当前页列出 ${catalog.pagination.returned} 个标的；选择具体股票后再进入研究比较。`
        : `The catalog panel shows this request's market scope. This page lists ${catalog.pagination.returned} underlyings; choose a stock next for detailed research.`,
      decisionBoundary: language === "zh-CN" ? "目录用于探索和筛选，不替用户选择股票或发行方。" : "The catalog supports exploration and filtering; it does not choose a stock or issuer for the user.",
      executionBoundary: language === "zh-CN" ? "仅进行了只读目录查询；未创建计划、访问钱包、签名或广播。" : "This was a read-only catalog request. No plan, wallet access, signature or broadcast occurred."
    }, hasResults ? catalog.warnings.length ? "warning" : "success" : "warning", nextAction, { warnings: catalog.warnings, sideEffects: "none" });
    const conversationalText = language === "zh-CN"
      ? `目录已打开：本次 Binance Web3 在 BSC 返回 ${catalog.scope.uniqueUnderlyingCount} 个标的，覆盖 ${catalog.issuers.length} 家发行方。你可以从双发行方标的、发行方或资产类型继续缩小范围。`
      : `Catalog opened: this Binance Web3 BSC response contains ${catalog.scope.uniqueUnderlyingCount} underlyings across ${catalog.issuers.length} issuers. You can narrow it by dual-issuer availability, issuer or asset type.`;
    return textResult(payload, { structuredContent: true, text: conversationalText });
  } catch (error) {
    return textResult(errorOutcome(error, language === "zh-CN" ? "检查 Binance Web3 目录可用性后重试" : "Check Binance Web3 catalog availability before retrying", "catalog_browse_failed"));
  }
});

registerAppTool(server, "discover_tokenized_assets", {
  title: "Discover tokenized-stock representations",
  description: "Discover Binance Web3 tokenized-stock representations on BSC (chain 56) after the user has selected or named a ticker or company. If the user is still exploring what exists and has not selected a stock, use browse_tokenized_stock_catalog instead. If no issuer is named, return all matching BSC issuers; only apply platforms when the user explicitly selects one. Extract the intended asset if possible; ambiguous requests require clarification. This competition build does not show other chains. Results are returned matches, not a verified complete catalog. Read-only.",
  _meta: { ui: { resourceUri: RESEARCH_UI_URI } },
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    includeMarketContext: z.boolean().optional()
  }
}, async ({ query, chainId, platforms, includeMarketContext }) => {
  const language = inferOutputLanguage(query);
  try {
    const unsupportedChain = unsupportedResearchChain(query, chainId);
    if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
    const { assets, resolvedQuery } = await searchAssetIntent(currentDirectoryStocks, query, { chainId: BSC_CHAIN_ID });
    const bscAssets = onlyBscAssets(assets);
    const filtered = platforms?.length ? bscAssets.filter((asset) => platforms.includes(asset.platformId)) : bscAssets;
    const enriched = await enrichAgentAssets(stocks, filtered, includeMarketContext !== false);
    const warnings = [...new Set([catalogCoverageWarning(), ...enriched.flatMap((asset) => asset.dataQuality.warnings)])];
    return textResult(outcome({
      summary: language === "zh-CN"
        ? enriched.length ? `为 ${resolvedQuery} 找到 ${enriched.length} 个代币化股票发行方版本` : `没有找到与“${query}”匹配的代币化股票版本`
        : enriched.length ? `Discovered ${enriched.length} tokenized-stock representations for ${resolvedQuery}` : `No tokenized-stock representations found for ${query}`,
      query,
      resolvedQuery,
      assets: enriched,
      count: enriched.length,
      presentation: enriched.length
        ? enriched.map((asset) => renderAssetCard(asset, { language })).join("\n\n---\n\n")
        : language === "zh-CN" ? "未识别到具体标的。可以先浏览 BSC 链上股票目录，或明确一个股票代码或公司。" : "No specific underlying was identified. Browse the BSC catalog first or name a ticker or company."
    }, enriched.length ? warnings.length ? "warning" : "success" : "warning", enriched.length
      ? language === "zh-CN" ? "比较发行方版本并查看已返回的行情快照；决定继续后再明确创建购买计划" : "Compare issuer representations and review the returned market snapshot; explicitly create a purchase plan only after deciding to continue"
      : language === "zh-CN" ? "先浏览 BSC 链上股票目录，或明确一个股票代码或公司" : "Browse the BSC catalog first or name a ticker or company", { warnings: warnings.map((warning) => localizeEvidenceMessage(warning, language)) }), { structuredContent: true });
  } catch (error) {
    if (error instanceof AmbiguousAssetQueryError) return ambiguousAssetResult(error, query);
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "asset_discovery_failed"));
  }
});

registerAppTool(server, "compare_asset_representations", {
  title: "Compare issuer representations",
  description: "Compare all returned Binance Web3 issuer representations on BSC (chain 56) for a company or ticker the user has already selected. For open-ended market exploration, use browse_tokenized_stock_catalog first. Honor explicit issuer choices; this competition build does not show other chains. Do not silently narrow to a single platform. Results are returned matches, not a verified complete catalog. The Agent can use this instead of manually calling low-level search and market tools.",
  _meta: { ui: { resourceUri: RESEARCH_UI_URI } },
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    }).optional()
  }
}, async ({ query, chainId, preference }) => {
  const language = inferOutputLanguage(query);
  try {
    const unsupportedChain = unsupportedResearchChain(query, chainId);
    if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
    const { assets } = await searchAssetIntent(currentDirectoryStocks, query, { chainId: BSC_CHAIN_ID });
    const enriched = await enrichAgentAssets(stocks, onlyBscAssets(assets));
    const comparison = compareAgentAssets(enriched, (preference ?? {}) as AssetPreference);
    comparison.warnings = [...new Set([catalogCoverageWarning(), ...comparison.warnings])];
    const eligibleCount = comparison.rows.filter((row) => row.excludedReasons.length === 0).length;
    const summary = language === "zh-CN" ? eligibleCount ? `${eligibleCount} / ${comparison.rows.length} 个发行方版本符合指定条件` : "没有发行方版本符合指定条件" : comparison.summary;
    const nextAction = language === "zh-CN"
      ? eligibleCount ? "查看排序结果和数据缺口；决定继续后再明确选择发行方并创建购买计划" : "放宽筛选条件或查看排除原因"
      : eligibleCount ? "Review ranked representations and data gaps; explicitly select an issuer and create a purchase plan only after deciding to continue" : "Relax the preference filters or inspect the exclusion reasons";
    return textResult(outcome({ query, summary, comparison, presentation: renderComparisonTable(comparison, { language }) }, eligibleCount ? comparison.warnings.length ? "warning" : "success" : "blocked", nextAction, { warnings: comparison.warnings.map((warning) => localizeEvidenceMessage(warning, language)) }), { structuredContent: true });
  } catch (error) {
    if (error instanceof AmbiguousAssetQueryError) return ambiguousAssetResult(error, query);
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "asset_comparison_failed"));
  }
});

registerAppTool(server, "research_tokenized_stock", {
  title: "Research a tokenized stock",
  description: "Run an Agent-native Binance Web3 research workflow for a BSC stock the user has already selected or named: discover issuer representations, enrich market context, compare evidence and return a human-readable brief in the research panel. If the user has not selected a company or ticker and is exploring what exists, use browse_tokenized_stock_catalog instead. The Agent chooses from conversation meaning and stage rather than matching example phrases. The conversation text is a short interpretation only; do not repeat the report table or row-by-row data in the assistant reply. When no issuer is named, compare all returned BSC issuer representations. Apply platforms only when the user explicitly selects an issuer. Results are returned matches, not a verified complete catalog. Read-only; never signs or broadcasts.",
  _meta: { ui: { resourceUri: RESEARCH_UI_URI } },
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    }).optional()
  }
}, async ({ query, chainId, platforms, preference }) => {
  const language = inferOutputLanguage(query);
  try {
    const unsupportedChain = unsupportedResearchChain(query, chainId);
    if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
    const workflowStartedAt = performance.now();
    const searchStartedAt = performance.now();
    const { assets, resolvedQuery, diagnostics: searchDiagnostics } = await searchAssetIntent(currentDirectoryStocks, query, { chainId: BSC_CHAIN_ID });
    const searchMs = elapsedMs(searchStartedAt);
    const bscAssets = onlyBscAssets(assets);
    const filtered = platforms?.length ? bscAssets.filter((asset) => platforms.includes(asset.platformId)) : bscAssets;
    const marketContextStartedAt = performance.now();
    let marketDiagnostics: MarketContextEnrichmentDiagnostics = { batchCalls: 0, assetsRequested: filtered.length, durationMs: 0 };
    const enriched = await enrichAgentAssets(stocks, filtered, true, (diagnostics) => { marketDiagnostics = diagnostics; });
    const marketContextMs = elapsedMs(marketContextStartedAt);
    const comparisonStartedAt = performance.now();
    const comparison = compareAgentAssets(enriched, (preference ?? {}) as AssetPreference);
    comparison.warnings = [...new Set([catalogCoverageWarning(), ...comparison.warnings])];
    const comparisonMs = elapsedMs(comparisonStartedAt);
    const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
    const warnings = [...new Set([
      ...comparison.warnings,
      ...enriched.flatMap((asset) => asset.dataQuality.warnings)
    ])];
    const status = !enriched.length ? "warning" : eligible.length ? warnings.length ? "warning" : "success" : "blocked";
    const noTradeRequested = explicitlyRequestsNoTrade(query);
    const nextAction = !enriched.length
      ? "Browse the BSC catalog first or name a ticker or company"
      : eligible.length
        ? noTradeRequested ? "Review the evidence and data gaps; no trading follow-up was requested" : "Review the evidence and data gaps; explicitly create a purchase plan only after deciding to continue"
        : "Review exclusion reasons or relax the preference filters";
    const nextSteps = researchNextSteps(enriched, comparison, {
      allowWalletExposureFollowUp: !noTradeRequested,
      language
    });
    const presentationStartedAt = performance.now();
    const timing = {
      searchMs,
      searchResolution: {
        directSearchMs: searchDiagnostics.durationsMs.directSearch,
        catalogReadMs: searchDiagnostics.durationsMs.catalogRead,
        catalogMatchMs: searchDiagnostics.durationsMs.catalogMatch,
        resolvedSearchMs: searchDiagnostics.durationsMs.resolvedSearch,
        calls: searchDiagnostics.calls
      },
      marketContextMs,
      marketContextBatchCalls: marketDiagnostics.batchCalls,
      marketContextFailedGroups: marketDiagnostics.failedGroups ?? 0,
      ...(marketDiagnostics.failureCategory ? { marketContextFailureCategory: marketDiagnostics.failureCategory } : {}),
      comparisonMs,
      presentationMs: 0,
      totalMs: 0,
      marketContextAssets: filtered.length,
      agentReasoningExcluded: true as const
    };
    if (enriched.length) renderResearchBrief(enriched, comparison, timing, nextSteps, { language });
    timing.presentationMs = elapsedMs(presentationStartedAt);
    timing.totalMs = elapsedMs(workflowStartedAt);
    const presentation = enriched.length ? renderResearchBrief(enriched, comparison, timing, nextSteps, { language }) : language === "zh-CN" ? "未识别到具体标的，因此没有请求发行方行情。可以先浏览 BSC 链上股票目录，或明确一个股票代码或公司。" : "No specific underlying was identified, so issuer market data was not requested. Browse the BSC catalog first or name a ticker or company.";
    const payload = outcome({
      summary: language === "zh-CN"
        ? enriched.length ? `${resolvedQuery} 研究简报：比较了 ${enriched.length} 个发行方版本` : `没有找到与“${query}”匹配的代币化股票版本`
        : enriched.length ? `Research brief for ${resolvedQuery}: ${enriched.length} issuer representations compared` : `No tokenized-stock representations found for ${query}`,
      query,
      resolvedQuery,
      chainId,
      assets: enriched,
      comparison,
      nextSteps,
      timing,
      presentation,
      decisionBoundary: language === "zh-CN" ? "Ariadne 只呈现证据和筛选条件匹配情况，不替用户作投资决策。" : "Ariadne presents evidence and preference matches; it does not make an investment decision.",
      executionBoundary: language === "zh-CN" ? "此流程仅进行只读研究；未创建购买计划，未请求签名或交易，也未广播交易。" : "This workflow is read-only. No purchase plan, signature, transaction or broadcast was created or requested."
    }, status, language === "zh-CN" ? !enriched.length ? "先浏览 BSC 链上股票目录，或明确一个股票代码或公司" : eligible.length ? noTradeRequested ? "查看证据和数据缺口；未请求任何交易后续操作" : "查看证据和数据缺口；决定继续后再明确选择发行方并创建购买计划" : "查看排除原因或放宽筛选条件" : nextAction, { warnings: warnings.map((warning) => localizeEvidenceMessage(warning, language)) });
    return textResult(payload, { structuredContent: true, text: renderResearchInterpretation(enriched, comparison, language) });
  } catch (error) {
    if (error instanceof AmbiguousAssetQueryError) return ambiguousAssetResult(error, query);
    return textResult(errorOutcome(error, "Check the query and API availability before retrying", "stock_research_failed"));
  }
});

server.registerTool("prepare_action_from_intent", {
  description: "Translate a tokenized-stock intent into a platform-aware ActionPlan using Binance Web3 asset data on BSC (chain 56). This competition build does not prepare plans for other chains. Multiple BSC issuer representations require an explicit preference. Never signs or broadcasts.",
  inputSchema: {
    query: z.string().min(1),
    type: z.enum(["buy", "sell", "swap"]),
    walletAddress: z.string().min(1),
    fromTokenAddress: z.string().min(1),
    amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
    amountDecimals: z.number().int().min(0).max(36),
    chainId: z.string().optional(),
    platformId: z.string().optional(),
    selectionPolicy: z.enum(["explicit_platform", "lowest_price_gap"]).optional(),
    maxSlippageBps: z.number().int().min(0).max(10_000),
    maxGasCostBnb: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/).optional()
  }
}, async (input) => {
  try {
    const unsupportedChain = unsupportedResearchChain(input.query, input.chainId);
    if (unsupportedChain) return bscOnlyScopeResult(input.query, unsupportedChain);
    const assets = onlyBscAssets((await stocks.searchCurrentDirectory(input.query, { chainId: BSC_CHAIN_ID, platformId: input.platformId })).assets);
    if (!assets.length) return textResult(outcome({ summary: `No tokenized-stock representation found for ${input.query}`, assets: [] }, "warning", "Try a broader ticker or remove the platform filter", { warnings: ["No matching asset was found"] }));
    let selected = input.platformId ? assets.find((asset) => asset.platformId === input.platformId) : undefined;
    if (!selected && input.selectionPolicy === "lowest_price_gap") {
      const enriched = await enrichAgentAssets(stocks, assets);
      const comparison = compareAgentAssets(enriched, { requireMarketPrice: true, requireReferencePrice: true });
      selected = comparison.rows.find((row) => !row.excludedReasons.length)?.asset;
    }
    if (!selected && assets.length > 1) {
      const enriched = await enrichAgentAssets(stocks, assets);
      const comparison = compareAgentAssets(enriched, {});
      return textResult(outcome({ summary: "Multiple tokenized-stock representations require an explicit choice", comparison, presentation: renderComparisonTable(comparison) }, "blocked", "Choose a platformId or provide selectionPolicy=lowest_price_gap before preparing the ActionPlan", { warnings: ["Ariadne did not silently choose between multiple issuers"] }));
    }
    selected ??= assets[0];
    const plan = await stocks.createActionPlan({
      type: input.type,
      walletAddress: input.walletAddress,
      fromTokenAddress: input.fromTokenAddress,
      amount: input.amount,
      amountDecimals: input.amountDecimals,
      maxSlippageBps: input.maxSlippageBps,
      maxGasCostBnb: input.maxGasCostBnb,
      toAsset: selected
    });
    if (plan.status === "awaiting_confirmation") plans.registerPrepared(plan);
    const status = plan.status === "failed" ? "blocked" : plan.assetContext?.dataWarnings.length ? "warning" : "success";
    return textResult(outcome({ summary: plan.status === "failed" ? "ActionPlan preparation was blocked by a readiness or safety condition" : "ActionPlan prepared; no signing or broadcast occurred", selectedAsset: selected, plan }, status, plan.status === "failed" ? "Resolve the blocking reasons before simulation" : "Simulate the ActionPlan before requesting confirmation", { warnings: plan.assetContext?.dataWarnings ?? [], sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Inspect the error and revise the intent before retrying", "intent_preparation_failed"));
  }
});

registerAppTool(server, "prepare_bsc_stock_purchase", {
  title: "Create a BSC stock purchase intent",
  description: "Use only after the user has explicitly selected one BSC issuer representation and confirmed how much USDT to spend. If the amount is missing, ask only for the amount. Do not ask for or reuse a wallet address, slippage value or network-fee cap for this browser journey. Ariadne uses a 2% maximum slippage and the current provider-derived network-fee estimate by default. This tool creates a wallet-free external-browser intent link; it does not quote for a wallet, open the page, connect a wallet, request allowance, sign or broadcast. When the user opens the link, the page resolves the active MetaMask account and BSC network, then builds and displays the exact wallet-bound quote, allowance state, fee estimate and plan before any wallet confirmation.",
  _meta: { ui: { resourceUri: PURCHASE_APPROVAL_UI_URI } },
  inputSchema: {
    query: z.string().min(1),
    platformId: z.enum(["bstock", "ondo"]),
    inputTokenSymbol: z.literal("USDT"),
    amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
  }
}, async (input) => {
  try {
    const language = inferOutputLanguage(input.query);
    let relay: WalletHandoffRelayClient;
    try {
      relay = walletHandoffRelay();
      await relay.assertHealthy();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return textResult(outcome({
        summary: language === "zh-CN" ? "钱包交接服务尚未就绪，因此没有创建购买意向链接" : "The wallet handoff service is not ready, so no purchase-intent link was created",
        diagnostics: { stage: "wallet_handoff_readiness", reason }
      }, "blocked", "Start or repair the configured wallet handoff relay, then create the plan again with the same confirmed parameters", {
        warnings: [reason],
        sideEffects: "none"
      }));
    }
    let assets: StockAsset[];
    try {
      const discovery = await stocks.searchCurrentDirectory(input.query, { chainId: "56", platformId: input.platformId });
      assets = discovery.assets;
      if (!assets.length && discovery.staleSearchMatches.length) {
        return textResult(outcome({
          summary: "The provider search returned an old representation that is no longer present in the current Binance Web3 BSC directory; no purchase plan was created",
          staleSearchMatches: discovery.staleSearchMatches,
          currentDirectoryMatches: []
        }, "blocked", "Choose an issuer representation that is present in the current BSC directory", {
          warnings: ["A stale search identity was rejected before quote or purchase-plan preparation"],
          sideEffects: "none"
        }));
      }
    } catch (error) {
      throw new PurchasePlanStageError("asset_discovery", error);
    }
    if (assets.length !== 1) {
      return textResult(outcome({
        summary: assets.length ? "The selected issuer returned multiple BSC representations; choose an exact token before planning" : "No matching BSC representation was found for the selected issuer",
        candidates: assets
      }, "blocked", "Resolve the exact issuer token identity, then prepare a fresh plan", { sideEffects: "none" }));
    }
    if (!(stocks instanceof TokenizedStocksService)) throw new Error("The verified BSC purchase journey is available only in Live mode");
    const asset = assets[0]!;
    let marketBaseline: { tokenPrice?: string; referencePrice?: string; tokenPriceUpdatedAt?: number } | undefined;
    const warnings: string[] = [];
    try {
      const market = await stocks.marketContext(asset);
      marketBaseline = {
        ...(market.tokenPrice ? { tokenPrice: market.tokenPrice } : {}),
        ...(market.referencePrice ? { referencePrice: market.referencePrice } : {}),
        ...(market.tokenPriceUpdatedAt ? { tokenPriceUpdatedAt: market.tokenPriceUpdatedAt } : {})
      };
      warnings.push(...market.dataWarnings);
    } catch (error) {
      warnings.push(language === "zh-CN" ? "当前市场快照暂不可用；打开页面并连接钱包后会重新请求精确报价。" : "The current market snapshot is unavailable; the page will request an exact quote after the wallet is connected.");
    }
    const intentId = randomUUID();
    const created = await relay.createPurchaseIntent({
      intentId,
      language,
      asset,
      amount: input.amount,
      inputTokenSymbol: input.inputTokenSymbol,
      maxSlippageBps: DEFAULT_BROWSER_PURCHASE_SLIPPAGE_BPS,
      networkFeePolicy: BROWSER_PURCHASE_FEE_POLICY,
      ...(marketBaseline ? { marketBaseline } : {})
    });
    externalHandoffIds.set(created.id, intentId);
    const browserOpenUrl = relay.browserOpenUrl(created.id, created.capability, created.url);
    return textResult(outcome({
      mode: "purchase_intent_review_monitor",
      language,
      intentId,
      summary: language === "zh-CN" ? "购买意向和外部浏览器链接已准备好；钱包账户、精确报价和交易请求尚未创建" : "The purchase intent and external-browser link are ready; no wallet account, exact quote or transaction request exists yet",
      selectedAsset: asset,
      purchaseIntent: {
        amount: input.amount,
        inputTokenSymbol: input.inputTokenSymbol,
        maxSlippageBps: DEFAULT_BROWSER_PURCHASE_SLIPPAGE_BPS,
        networkFeePolicy: BROWSER_PURCHASE_FEE_POLICY,
        ...(marketBaseline ? { marketBaseline } : {})
      },
      handoffId: created.id,
      browserOpenUrl,
      walletPage: {
        handoffId: created.id,
        expiresAt: created.expiresAt,
        link: language === "zh-CN" ? `[在浏览器中打开 Ariadne 购买页面](${browserOpenUrl})` : `[Open Ariadne's purchase page in your browser](${browserOpenUrl})`,
        linkPurpose: language === "zh-CN" ? "页面会读取你当前选择的 MetaMask 账户和 BSC 网络，再生成该钱包对应的精确报价、授权检查、网络费估算和购买计划。" : "The page reads the MetaMask account and BSC network you choose, then creates the exact wallet-bound quote, allowance check, network-fee estimate and purchase plan."
      },
      executionBoundary: language === "zh-CN" ? "创建链接不会打开页面、连接钱包、请求授权、签名或广播。任何资金操作仍由你在 MetaMask 中逐笔确认。" : "Creating the link does not open the page, connect a wallet, request allowance, sign or broadcast. Every funds action still requires your confirmation in MetaMask."
    }, warnings.length ? "warning" : "success", language === "zh-CN" ? "准备好后打开浏览器链接；页面将使用当前钱包形成精确计划。" : "Open the browser link when ready; the page will form the exact plan with the current wallet.", { warnings, sideEffects: "none" }), { structuredContent: true });
  } catch (error) {
    if (error instanceof PurchasePlanStageError) {
      const language = inferOutputLanguage(input.query);
      const stageLabel = purchasePlanStageLabel(error.stage, language);
      const summary = language === "zh-CN"
        ? `购买计划停在“${stageLabel}”阶段：${error.causeMessage}。尚未建立可用计划。`
        : `Purchase planning stopped at ${stageLabel}: ${error.causeMessage}. No usable plan was created.`;
      const retryAdvice = error.retryable
        ? language === "zh-CN" ? "这是可重试的只读请求；请刷新计划再试。" : "This read-only request is retryable; refresh the plan to try again."
        : language === "zh-CN" ? "请先处理该阶段指出的问题，再重新生成计划。" : "Resolve the issue in this stage before preparing a new plan.";
      return textResult(outcome({
        summary,
        diagnostics: { stage: error.stage, stageLabel, attempts: error.attempts, retryable: error.retryable, providerMessage: error.causeMessage }
      }, "error", retryAdvice, { error: { code: "bsc_purchase_plan_failed", message: summary }, sideEffects: "none" }));
    }
    return textResult(errorOutcome(error, "Verify the selected issuer and amount before retrying", "bsc_purchase_intent_failed"));
  }
});

if (process.env.ARIADNE_TEST_FIXTURE === "1") server.registerTool("prepare_bsc_stock_purchase_fixture", {
  description: "Deterministic test-only exact BSC plan preparation. Never exposed by the product server.",
  inputSchema: {
    walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
    maxSlippageBps: z.number().int().min(0).max(10_000),
    maxGasCostBnb: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
    asset: z.object({
      assetId: z.string(), chainId: z.string(), platformId: z.string(), contractAddress: z.string(),
      tokenSymbol: z.string(), underlyingTicker: z.string(), underlyingName: z.string()
    })
  }
}, async (input) => {
  if (!(stocks instanceof TokenizedStocksService)) throw new Error("Fixture exact purchase planning requires the Live service adapter");
  const plan = await stocks.createBscStockPurchasePlan({
    walletAddress: input.walletAddress,
    inputTokenSymbol: "USDT",
    amount: input.amount,
    toAsset: input.asset,
    maxSlippageBps: input.maxSlippageBps,
    maxGasCostBnb: input.maxGasCostBnb
  });
  if (plan.status === "awaiting_confirmation") plans.registerPrepared(plan);
  return textResult(outcome({ summary: "Fixture exact BSC plan prepared", plan }, plan.status === "failed" ? "blocked" : "success", "Continue deterministic closure checks", { warnings: plan.assetContext?.dataWarnings ?? [], sideEffects: "none" }));
});

server.registerTool("prepare_bsc_stock_allowance_approval", {
  title: "Review exact USDT allowance",
  description: "Prepare the exact USDT allowance for an already confirmed Binance Web3 BSC stock purchase plan. The user-reviewed plan ID is required so approval and the later purchase remain one continuous session. Return the full one-time wallet page URL as a direct Markdown link; do not use an MCP App open-link button. Never signs or broadcasts.",
  inputSchema: { planId: z.string().min(1) }
}, async ({ planId }) => {
  try {
    if (!(stocks instanceof TokenizedStocksService)) throw new Error("Verified BSC allowance planning is available only in Live mode");
    const confirmedPurchasePlan = plans.captureConfirmedContinuation(planId);
    if (confirmedPurchasePlan.intent.toAsset.chainId !== "56" || !confirmedPurchasePlan.intent.toAsset.platformId.trim() ||
      confirmedPurchasePlan.verifiedTokens?.input.symbol !== "USDT" || !confirmedPurchasePlan.intent.maxGasCostBnb) {
      throw new Error("Same-page allowance continuation requires a confirmed Binance Web3 BSC stock purchase with an explicit issuer, USDT amount and gas cap");
    }
    const approvalPlan = await stocks.prepareBscStockAllowanceApproval({
      walletAddress: confirmedPurchasePlan.intent.walletAddress, inputTokenSymbol: "USDT",
      amount: confirmedPurchasePlan.intent.amount, toAsset: confirmedPurchasePlan.intent.toAsset,
      maxSlippageBps: confirmedPurchasePlan.intent.maxSlippageBps!,
      purchaseMaxGasCostBnb: confirmedPurchasePlan.intent.maxGasCostBnb,
      confirmedPurchasePlan
    });
    const walletPage = approvalPlan.status === "ready_for_wallet_review"
      ? await prepareAllowanceWalletPage(approvalPlan)
      : undefined;
    if (approvalPlan.status === "ready_for_wallet_review") allowanceApprovalPlans.set(approvalPlan.approvalPlanId, approvalPlan);
    return textResult(outcome({
      mode: "allowance_approval_review",
      approvalPlanId: approvalPlan.approvalPlanId,
      ...(walletPage ? { handoffId: walletPage.handoffId, walletPageExpiresAt: walletPage.expiresAt } : {}),
      ...(walletPage ? { handoffStatus: "wallet_handoff_ready" } : {}),
      ...(walletPage ? {
        presentationMode: "native_conversation",
        walletPageMarkdownLink: `[Open Ariadne's USDT approval page in your browser](${walletPage.browserOpenUrl})`,
        walletPageLinkRequirement: "Use this single link to open the exact one-time approval page in the system browser."
      } : {}),
      summary: approvalPlan.status === "ready_for_wallet_review"
        ? approvalPlan.simulation?.success
          ? "The exact USDT allowance is ready and bound to the confirmed purchase plan. After allowance finality, Ariadne will refresh and compare the same plan, then open a separate MetaMask purchase confirmation only if its limits still hold."
          : "The exact allowance is bound to the confirmed purchase plan. Provider simulation could not verify wallet funds; MetaMask decides whether it can submit. After finality, Ariadne will refresh the same plan and continue only within its original limits."
        : approvalPlan.status === "not_required" ? "Current allowance is sufficient; no approval transaction is needed" : "Allowance step is blocked",
      approvalPlan,
      marketReview: approvalPlan.marketReview,
      distinction: "This exact USDT allowance authorizes only the named spender and amount. It does not approve or execute the later stock swap.",
      walletBoundary: "Review this separate transaction in the branded external wallet page. MetaMask remains the signer and broadcaster. If the refreshed quote exceeds the confirmed plan boundary, the page stops and asks for a new plan; otherwise MetaMask shows a separate purchase confirmation."
    }, approvalPlan.status === "ready_for_wallet_review" ? approvalPlan.simulation?.success ? "success" : "warning" : approvalPlan.status === "not_required" ? "warning" : "blocked", approvalPlan.status === "ready_for_wallet_review" ? "Present the confirmed purchase plan and its single browser link; allowance and stock purchase will be separate MetaMask confirmations in the same page" : "Resolve the blocking transaction-content or permission issue, or continue from the confirmed plan if allowance is already sufficient", { warnings: approvalPlan.simulation?.warnings ?? [], sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Verify the selected BSC representation and allowance transaction details", "allowance_approval_preparation_failed"));
  }
});

server.registerTool("refresh_bsc_stock_purchase_after_approval", {
  description: "Verify an externally approved USDT allowance receipt, re-read allowance and attempt a read-only balance refresh for context, then fetch a fresh quote and return a new stock purchase plan. A balance-read failure does not block the plan. Does not simulate, sign, or broadcast the swap.",
  inputSchema: {
    approvalPlanId: z.string().min(1),
    txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/)
  }
}, async ({ approvalPlanId, txHash }) => {
  try {
    if (!(stocks instanceof TokenizedStocksService)) throw new Error("Verified BSC purchase refresh is available only in Live mode");
    const approvalPlan = allowanceApprovalPlans.get(approvalPlanId);
    if (!approvalPlan) throw new Error("Approval plan is unknown, expired or belongs to another MCP session");
    const result = await stocks.refreshBscPurchaseAfterApproval({ approvalPlan, txHash });
    if (result.plan?.status === "awaiting_confirmation") plans.registerPrepared(result.plan);
    if (result.status === "ready") allowanceApprovalPlans.delete(approvalPlanId);
    return textResult(outcome({
      summary: result.status === "ready" ? "Approval receipt and allowance verified; a fresh stock quote and plan are ready" : `Approval completion is ${result.status}`,
      approvalStatus: result.status,
      allowance: result.allowance,
      inputBalance: result.balance,
      balanceReadWarning: result.balanceReadWarning,
      reason: result.reason,
      freshPlan: result.plan,
      nextBoundary: result.status === "ready" ? "Simulate and review this new plan. The earlier approval did not authorize the stock swap." : undefined
    }, result.status === "ready" ? "success" : result.status === "pending" ? "warning" : "blocked", result.status === "ready" ? "Simulate the fresh stock purchase plan" : result.status === "pending" ? "Wait for the approval receipt, then retry" : "Inspect the receipt or allowance and prepare a fresh step", { warnings: [result.reason, result.balanceReadWarning].filter((value): value is string => Boolean(value)), sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Use the exact approval plan and transaction hash from the connected wallet", "approval_refresh_failed"));
  }
});

server.registerTool("screen_assets_by_preferences", {
  description: "Screen Binance Web3 tokenized-stock representations on BSC (chain 56) by explicit issuer, platform, market-data, market-status and price-gap preferences. This is evidence-based screening, not investment advice; this competition build does not show other chains.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    preference: z.object({
      issuerIds: z.array(z.string()).optional(),
      platforms: z.array(z.string()).optional(),
      requireMarketPrice: z.boolean().optional(),
      requireReferencePrice: z.boolean().optional(),
      requireKnownMarketStatus: z.boolean().optional(),
      maxPriceGapPercent: z.string().optional(),
      sectors: z.array(z.string()).optional()
    })
  }
}, async ({ query, chainId, preference }) => {
  const language = inferOutputLanguage(query);
  try {
    const unsupportedChain = unsupportedResearchChain(query, chainId);
    if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
    const { assets } = await searchAssetIntent(currentDirectoryStocks, query, { chainId: BSC_CHAIN_ID });
    const enriched = await enrichAgentAssets(stocks, onlyBscAssets(assets));
    const comparison = compareAgentAssets(enriched, preference as AssetPreference);
    const eligible = comparison.rows.filter((row) => !row.excludedReasons.length);
    return textResult(outcome({
      summary: language === "zh-CN" ? `${eligible.length} 个发行方版本符合指定偏好` : `${eligible.length} representations match the requested preferences`,
      comparison,
      presentation: renderComparisonTable(comparison, { language }),
      recommendationBoundary: language === "zh-CN" ? "这是基于偏好的证据筛选，不构成投资建议。" : "This is preference-based evidence screening, not investment advice",
      interpretation: language === "zh-CN" ? "匹配只反映所提供的条件和观测数据，并非买卖建议。" : "Eligibility reflects the supplied criteria and observed data; it is not a recommendation to buy or sell."
    }, eligible.length ? "success" : "blocked", eligible.length
      ? language === "zh-CN" ? "查看证据和数据缺口；决定继续后再明确创建购买计划" : "Review the evidence and data gaps; explicitly create a purchase plan only after deciding to continue"
      : language === "zh-CN" ? "放宽偏好条件或查看排除原因" : "Relax the preferences or inspect exclusion reasons", { warnings: comparison.warnings.map((warning) => localizeEvidenceMessage(warning, language)) }));
  } catch (error) {
    if (error instanceof AmbiguousAssetQueryError) return ambiguousAssetResult(error, query);
    return textResult(errorOutcome(error, "Check the query and preference values before retrying", "asset_screening_failed"));
  }
});

server.registerTool("analyze_portfolio_exposure", {
  description: "Read wallet holdings and summarize tokenized-stock exposure. Read-only; does not rebalance or execute anything.",
  inputSchema: { walletAddress: z.string().min(1), chainIds: z.array(z.string()).min(1), query: z.string().optional() }
}, async ({ walletAddress, chainIds, query }) => {
  try {
    const holdings = await wallet.holdings(walletAddress, chainIds);
    const assets = query ? (await stocks.searchCurrentDirectory(query, { chainId: chainIds.length === 1 ? chainIds[0] : undefined })).assets : [];
    const resolved = holdings.map((holding) => ({ ...holding, asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase()) }));
    const tokenized = resolved.filter((holding) => holding.asset);
    const warnings = resolved.flatMap((holding) => holding.warnings).filter((warning, index, all) => all.indexOf(warning) === index);
    return textResult(outcome({ walletAddress, holdings: resolved, tokenizedStockHoldings: tokenized, summary: `${tokenized.length} tokenized-stock holdings identified`, recommendationBoundary: "This is an exposure summary, not investment advice" }, warnings.length ? "warning" : "success", "Review exposure and warnings before considering a simulated action", { warnings }));
  } catch (error) {
    return textResult(errorOutcome(error, "Check the wallet address, chain IDs and API availability", "portfolio_analysis_failed"));
  }
});

server.registerTool("resolve_tokenized_stock", {
  description: "Search BSC tokenized stocks and return platform-aware asset identities. Read-only.",
  inputSchema: {
    query: z.string().min(1),
    chainId: z.string().optional(),
    platformId: z.string().optional()
  }
}, async ({ query, chainId, platformId }) => {
  const unsupportedChain = unsupportedResearchChain(query, chainId);
  if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
  const assets = onlyBscAssets((await stocks.searchCurrentDirectory(query, { chainId: BSC_CHAIN_ID, platformId })).assets);
  const assetViews = assets.map((asset) => toAgentAsset(asset));
  return textResult(outcome({
    summary: `Found ${assets.length} tokenized stock assets; identity only`,
    assets,
    assetViews,
    count: assets.length,
    coverage: { identity: assets.length ? "confirmed" : "unresolved", marketContext: "not_requested" },
    presentation: assetViews.length ? assetViews.map((asset) => renderAssetCard(asset)).join("\n\n---\n\n") : "No representations available."
  }, assets.length ? "success" : "warning", assets.length ? "Request market context before comparing prices or assessing tradability" : "Try a broader ticker or omit platformId", { warnings: assets.length ? [] : ["No matching tokenized-stock asset was found"] }));
});

server.registerTool("get_stock_market_context", {
  description: "Return tokenized stock price, reference price, market status, timestamps and data warnings. Read-only.",
  inputSchema: { chainId: z.string(), contractAddress: z.string(), platformId: z.string(), tokenSymbol: z.string(), underlyingTicker: z.string(), underlyingName: z.string() }
}, async (input) => {
  const unsupportedChain = unsupportedResearchChain(input.underlyingTicker, input.chainId);
  if (unsupportedChain) return bscOnlyScopeResult(input.underlyingTicker, unsupportedChain);
  const context = await stocks.marketContext({
    assetId: `${input.chainId}:${input.contractAddress.toLowerCase()}`,
    chainId: input.chainId,
    contractAddress: input.contractAddress,
    platformId: input.platformId,
    tokenSymbol: input.tokenSymbol,
    underlyingTicker: input.underlyingTicker,
    underlyingName: input.underlyingName
  });
  return textResult(outcome({ ...context, summary: "Market context retrieved", warnings: context.dataWarnings }, context.dataWarnings.length ? "warning" : "success", context.dataWarnings.length ? "Review warnings before creating a plan" : "Compare context with another wrapper or create a plan", { warnings: context.dataWarnings }));
});

server.registerTool("compare_stock_wrappers", {
  description: "Compare tokenized-stock representations across issuers and platforms on BSC (chain 56) using Binance Web3 data. This competition build does not compare other chains. Read-only.",
  inputSchema: { query: z.string().min(1), chainId: z.string().optional() }
}, async ({ query, chainId }) => {
  const unsupportedChain = unsupportedResearchChain(query, chainId);
  if (unsupportedChain) return bscOnlyScopeResult(query, unsupportedChain);
  const assets = onlyBscAssets((await stocks.searchCurrentDirectory(query, { chainId: BSC_CHAIN_ID })).assets);
  const grouped = assets.reduce<Record<string, typeof assets>>((acc, asset) => {
    (acc[asset.underlyingTicker || query.toUpperCase()] ??= []).push(asset);
    return acc;
  }, {});
  return textResult(outcome({ query, chainId: BSC_CHAIN_ID, groups: grouped, count: assets.length, summary: `Compared ${assets.length} tokenized-stock representations on BSC using Binance Web3 data` }, assets.length ? "success" : "warning", assets.length ? "Review the returned evidence; explicitly select an issuer and create a purchase plan only after deciding to continue" : "Try a broader ticker", { warnings: assets.length ? [] : ["No wrapper comparison result was found"] }));
});

server.registerTool("get_wallet_stock_exposure", {
  description: "Read wallet token balances and resolve matching tokenized-stock identities. Read-only.",
  inputSchema: { walletAddress: z.string(), chainIds: z.array(z.string()).min(1), query: z.string().optional() }
}, async ({ walletAddress, chainIds, query }) => {
  const holdings = await wallet.holdings(walletAddress, chainIds);
  const assets = query ? (await stocks.searchCurrentDirectory(query)).assets : [];
  const resolved = holdings.map((holding) => ({ ...holding, asset: assets.find((asset) => asset.chainId === holding.chainId && asset.contractAddress.toLowerCase() === holding.contractAddress.toLowerCase()) }));
  return textResult(outcome({ walletAddress, holdings: resolved, count: resolved.length, summary: `Read ${resolved.length} wallet holdings` }, "success", "Review holdings and warnings before preparing an action"));
});

server.registerTool("simulate_stock_action", {
  description: "Simulate an unsigned EVM transaction without broadcasting it. Read-only and no wallet signing.",
  inputSchema: {
    chainId: z.string(),
    from: z.string(),
    to: z.string(),
    value: z.string().regex(/^\d+$/),
    data: z.string().regex(/^0x[0-9a-fA-F]*$/).optional()
  }
}, async ({ chainId, from, to, value, data }) => {
  const simulation = await transactions.simulateEvm(chainId, { from, to, value, data });
  return textResult(outcome({ summary: simulation.success ? "Simulation succeeded; nothing broadcast" : "Simulation failed", simulation }, simulation.success ? "success" : "blocked", simulation.success ? "Review the simulation, then confirm the plan if appropriate" : "Inspect simulation warnings and revise the unsigned transaction", { warnings: simulation.warnings }));
});

server.registerTool("simulate_stock_action_plan", {
  description: "Simulate the unsigned transaction contained in an Ariadne action plan and write the result back to the plan. Never broadcasts.",
  inputSchema: { plan: z.any() }
}, async ({ plan }) => {
  try {
    const trusted = plans.requireExact(plan as ActionPlan, "awaiting_confirmation");
    const action = trusted.unsignedActions?.[0] as any;
    const tx = action?.payload?.tx;
    if (!tx) throw new Error("Plan has no unsigned EVM transaction");
    const simulation = await transactions.simulateEvm(trusted.intent.toAsset.chainId, tx);
    const updated = attachSimulation(trusted, simulation);
    if (updated.status === "simulated" || updated.status === "wallet_review") {
      plans.advance(plan as ActionPlan, "awaiting_confirmation", updated, updated.status);
    }
    const simulationWarnings = (updated.simulation as { warnings?: string[] } | undefined)?.warnings ?? [];
    const resultStatus = updated.status === "simulated" ? "success" : updated.status === "wallet_review" ? "warning" : "blocked";
    const nextAction = updated.status === "wallet_review"
      ? "Show the warning and ask whether to continue; MetaMask will decide whether funds and fees are sufficient"
      : updated.status === "simulated" ? "Request explicit confirmation before opening the wallet" : "Resolve the blocking transaction or safety checks";
    return textResult(outcome({ summary: updated.status === "wallet_review" ? "Simulation could not verify wallet funds; the exact plan is still available for wallet review" : "Plan simulation completed; nothing broadcast", plan: updated, broadcasted: false }, resultStatus, nextAction, { warnings: simulationWarnings }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Provide a plan with an unsigned EVM transaction and retry", "simulation_failed"), broadcasted: false });
  }
});

server.registerTool("create_stock_action_plan", {
  description: "Create a tokenized-stock action plan with quote and market context. Specify a user-reviewed maxGasCostBnb before confirmation. Does not execute or broadcast.",
  inputSchema: {
    type: z.enum(["buy", "sell", "swap"]),
    walletAddress: z.string(),
    fromTokenAddress: z.string(),
    amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
    amountDecimals: z.number().int().min(0).max(36),
    maxSlippageBps: z.number().int().min(0).max(10_000),
    maxGasCostBnb: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/).optional(),
    asset: z.object({
      assetId: z.string(),
      chainId: z.string(),
      platformId: z.string(),
      contractAddress: z.string(),
      tokenSymbol: z.string(),
      underlyingTicker: z.string(),
      underlyingName: z.string()
    })
  }
}, async ({ type, walletAddress, fromTokenAddress, amount, amountDecimals, maxSlippageBps, maxGasCostBnb, asset }) => {
  const plan = await stocks.createActionPlan({
    type,
    walletAddress,
    fromTokenAddress,
    amount,
    amountDecimals,
    maxSlippageBps,
    maxGasCostBnb,
    toAsset: asset
  });
  if (plan.status === "awaiting_confirmation") plans.registerPrepared(plan);
  return textResult(outcome({
    summary: plan.status === "failed" ? "Action plan could not be created" : "Action plan created; no transaction executed",
    plan
  }, plan.status === "failed" ? "blocked" : "success", plan.status === "failed" ? "Resolve the blocking reasons before simulation" : "Simulate the plan before requesting confirmation", { warnings: plan.assetContext?.dataWarnings ?? [], sideEffects: "none" }));
});

registerActionPlanConfirmationTool(server, plans, (plan) => {
  const action = plan.unsignedActions?.[0] as { kind?: string } | undefined;
  if (action?.kind === "evm_transaction") requireReviewedGasBudget(plan);
});

server.registerTool("submit_signed_rfq_order", {
  description: "Submit an externally signed RFQ order only with an unchanged, confirmed plan from this MCP session. No private keys are handled.",
  inputSchema: {
    plan: z.any(),
    requestId: z.string().uuid(),
    userSignature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
    vendor: z.enum(["InchFusion", "CowSwap", "PcsXRfq"]),
    quoteId: z.string().min(1),
    signingScheme: z.string().optional()
  }
}, async (input) => {
  try {
    const trusted = plans.requireExact(input.plan as ActionPlan, "confirmed");
    assertExecutable(trusted);
    const action = trusted.unsignedActions?.[0] as any;
    const rfq = action?.payload?.rfq;
    if (action?.kind !== "rfq_order" || trusted.quoteId !== input.quoteId || rfq?.vendor !== input.vendor ||
      (rfq?.signingScheme && rfq.signingScheme !== input.signingScheme)) throw new Error("RFQ signature request does not match the confirmed plan");
    plans.reserveBroadcast(input.plan as ActionPlan);
    const { plan: _plan, ...signedOrder } = input;
    const order = await stocks.submitRfqOrder(signedOrder);
    return textResult(outcome({ summary: "Signed RFQ submitted; poll status for settlement", order, privateKeyHandled: false }, "success", "Poll RFQ order status; do not replay the signed order blindly", { sideEffects: "broadcast_possible" }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Inspect the error and query order status before retrying", "rfq_submission_failed"), privateKeyHandled: false });
  }
});

server.registerTool("get_rfq_order_status", {
  description: "Read the settlement status of a previously submitted RFQ order. Read-only.",
  inputSchema: { orderId: z.string().min(1) }
}, async ({ orderId }) => {
  const status = await stocks.rfqOrderStatus(orderId);
  return textResult(outcome({ orderId, status, summary: "RFQ order status retrieved" }, "success", "Use the returned settlement status to decide whether further action is required"));
});

server.registerTool("broadcast_confirmed_transaction", {
  description: "Broadcast an externally signed raw transaction only for an explicitly confirmed action plan. This sends a real transaction to the chain and never signs internally.",
  inputSchema: {
    plan: z.any(),
    signedTransaction: z.string().regex(/^0x[0-9a-fA-F]+$/).max(131_072),
    address: z.string().min(1),
    enableMevProtection: z.boolean().optional()
  }
}, async ({ plan, signedTransaction, address, enableMevProtection }) => {
  try {
    const trusted = plans.requireExact(plan as ActionPlan, "confirmed");
    await assertSignedTransactionMatchesPlan(trusted, signedTransaction, address);
    assessSignedTransactionFee(trusted, signedTransaction);
    const currentAllowance = await transactions.erc20Allowance(
      trusted.intent.toAsset.chainId,
      trusted.authorizationCheck!.tokenAddress,
      address,
      trusted.authorizationCheck!.spender
    );
    assertAllowanceCoversPlan(trusted, currentAllowance);
    let before: BalanceSnapshot | undefined;
    if (trusted.verifiedTokens && trusted.minimumOutput) {
      before = await settlement.captureBefore({
        chainId: trusted.intent.toAsset.chainId,
        walletAddress: trusted.intent.walletAddress,
        inputToken: trusted.verifiedTokens.input,
        outputToken: trusted.verifiedTokens.output
      });
    }
    plans.reserveBroadcast(plan as ActionPlan);
    if (before) settlementRecords.set(trusted.planId, { before });
    const result = await transactions.broadcastSigned(trusted.intent.toAsset.chainId, signedTransaction, address, enableMevProtection ?? false);
    const txHash = extractTransactionHash(result);
    if (before) settlementRecords.set(trusted.planId, { before, ...(txHash ? { txHash } : {}) });
    return textResult(outcome({
      summary: "Signed transaction broadcast; settlement is not confirmed until receipt and balance reconciliation pass",
      result,
      signedInternally: false,
      settlement: before ? {
        status: "awaiting_reconciliation",
        planId: trusted.planId,
        ...(txHash ? { txHash } : {}),
        beforeBalancesCaptured: true,
        restartBoundary: "Reconciliation snapshot is held in this MCP process; keep this session available until the result is terminal."
      } : { status: "unavailable", reason: "This plan lacks on-chain verified token decimals needed for balance reconciliation" }
    }, "success", before ? "Poll receipt and reconcile the reviewed wallet's before/after token balances; do not replay the signed transaction" : "Query broadcast order status; do not replay the signed transaction blindly", { sideEffects: "broadcast_possible" }));
  } catch (error) {
    return textResult({ ...errorOutcome(error, "Resolve the plan or address rejection before attempting another broadcast", "broadcast_rejected"), broadcasted: false });
  }
});

registerAppTool(server, "connect_bsc_wallet_readonly", {
  title: "Connect a BSC wallet (read-only)",
  description: "Open the Ariadne panel to verify a BSC wallet connection by reading only the account and chain. It never requests eth_sendTransaction, approval, signing, or broadcast.",
  _meta: { ui: { resourceUri: PURCHASE_APPROVAL_UI_URI } },
  inputSchema: {}
}, async () => textResult(outcome({
  mode: "wallet_connection_check",
  summary: "Connect MetaMask or another WalletConnect-compatible wallet to verify this Agent host. Ariadne will read the active account and network only, then close the WalletConnect session when supported."
}, "success", "Open the in-panel connection check and select Connect wallet; no transaction will be requested", { sideEffects: "none" })));

registerAppTool(server, "prepare_stock_purchase_wallet_request", {
  title: "Open Ariadne's secure purchase handoff",
  description: "After the exact purchase plan has been simulated and explicitly confirmed, open the Ariadne purchase handoff panel. The panel creates a short-lived branded HTTPS wallet page and starts monitoring for a verified settlement. Wallet approval remains in the owner's wallet.",
  _meta: { ui: { resourceUri: PURCHASE_APPROVAL_UI_URI } },
  inputSchema: { plan: z.any() }
}, async ({ plan }) => {
  try {
    const trusted = plans.requireExact(plan as ActionPlan, "confirmed");
    const { request } = buildWalletSubmissionRequest(trusted);
    if (!trusted.verifiedTokens || !trusted.minimumOutput) throw new Error("The confirmed plan lacks verified token identities or a reviewed minimum output");
    if (isPlanExpired(trusted)) throw new Error("The purchase quote has expired; prepare and confirm a fresh plan");
    const allowance = await transactions.erc20Allowance(
      trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender
    );
    assertAllowanceCoversPlan(trusted, allowance);
    return textResult(outcome({
      summary: "Purchase review is ready in the Ariadne panel; no wallet attempt is reserved and no signature or transaction was sent",
      planId: trusted.planId,
      walletRequest: { method: "eth_sendTransaction", params: [request] },
      requiredWalletContext: { chainId: "0x38", account: trusted.intent.walletAddress },
      reviewed: {
        inputAmount: trusted.intent.amount, inputToken: trusted.verifiedTokens.input,
        expectedOutput: trusted.expectedOutput, minimumOutput: trusted.minimumOutput,
        outputToken: trusted.verifiedTokens.output, spender: trusted.authorizationCheck!.spender,
        target: request.to, maxSlippageBps: trusted.intent.maxSlippageBps,
        quoteExpiresAt: trusted.expiresAt, maxGasCostBnb: trusted.intent.maxGasCostBnb
      },
      submissionAttemptReserved: false,
      nextStep: "The Ariadne panel will open the branded HTTPS wallet page, attempt to call the wallet automatically after its short introduction, and ask MetaMask to display its own exact transaction confirmation. The panel then monitors the same handoff until BSC finality and balance reconciliation."
    }, "success", "Open the branded wallet handoff and wait for the verified transaction report", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Keep the confirmed plan unchanged and resolve the authorization, quote-expiry or reviewed transaction-detail issue before opening the wallet panel", "wallet_request_preparation_failed"));
  }
});

registerAppTool(server, "create_external_stock_purchase_handoff", {
  title: "Create the one-time branded wallet handoff",
  description: "App-only. Create a short-lived one-time HTTPS approval page for the exact confirmed BSC purchase. The server rechecks allowance, the reviewed gas cap and quote expiry, captures pre-transaction balances for settlement reconciliation, and reserves one attempt before opening the page. It does not gate on wallet balances and never signs or broadcasts.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: { planId: z.string().min(1) }
}, async ({ planId }) => {
  let createdId: string | undefined;
  try {
    const relay = walletHandoffRelay();
    const trusted = plans.requireById(planId, "confirmed");
    if (isPlanExpired(trusted) || !trusted.expiresAt || trusted.expiresAt <= Date.now()) throw new Error("The purchase quote has expired; prepare, simulate and confirm a fresh plan");
    if (!trusted.verifiedTokens || !trusted.minimumOutput || !trusted.expectedOutput || trusted.intent.maxSlippageBps === undefined || !trusted.intent.maxGasCostBnb) {
      throw new Error("The confirmed purchase is missing verified token, output, slippage or gas details");
    }
    const { request } = buildWalletSubmissionRequest(trusted);
    const created = await relay.create({
      planId, account: trusted.intent.walletAddress, chainId: "0x38", request: request as ExternalWalletTransaction,
      expiresAt: trusted.expiresAt,
      display: purchaseHandoffDisplay(trusted)
    });
    createdId = created.id;
    await relay.activate(created.id);
    try {
      await reserveWalletSubmission(planId, request);
    } catch (error) {
      await relay.cancel(created.id).catch(() => undefined);
      createdId = undefined;
      throw error;
    }
    externalHandoffIds.set(created.id, planId);
    const browserOpenUrl = relay.browserOpenUrl(created.id, created.capability, created.url);
    return textResult(outcome({
      handoffId: created.id, browserOpenUrl, expiresAt: created.expiresAt, status: "wallet_handoff_ready",
      summary: "Fresh server-side checks passed and one attempt is reserved. The branded wallet page may now request MetaMask confirmation; Ariadne has not signed or broadcast."
    }, "success", "Open the branded page, review the exact transaction in MetaMask, then wait for finality and balance reconciliation", { sideEffects: "none" }));
  } catch (error) {
    if (createdId) await walletHandoffRelay().cancel(createdId).catch(() => undefined);
    return textResult(errorOutcome(error, "Do not resubmit a reserved plan. Inspect the panel and wallet activity, or prepare a fresh plan after resolving the cause.", "external_wallet_handoff_failed"));
  }
});

registerAppTool(server, "reconcile_external_stock_purchase_handoff", {
  title: "Monitor and reconcile the external wallet purchase",
  description: "App-only. Retrieve the one-time wallet result, bind its returned hash to the reserved plan, and check exact transaction fields, BSC finality and before/after token balances. Only fully reconciled results are marked confirmed.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: { handoffId: z.string().regex(/^[a-f0-9]{32}$/) }
}, async ({ handoffId }) => {
  try {
    const attachedIntentId = externalHandoffIds.get(handoffId);
    if (!attachedIntentId) throw new Error("This handoff is not attached to the current Ariadne MCP session");
    const relay = walletHandoffRelay();
    let snapshot = await relay.read(handoffId);
    if (snapshot.planId !== attachedIntentId && snapshot.purchaseIntent?.intentId !== attachedIntentId) {
      throw new Error("Returned wallet handoff does not match the current purchase intent");
    }
    if (snapshot.state !== "submitted" || !snapshot.txHash) {
      return textResult(outcome({ snapshot, summary: snapshot.walletError ?? `Wallet handoff status: ${snapshot.state}` },
        ["wallet_rejected", "wallet_uncertain", "expired", "failed"].includes(snapshot.state) ? "blocked" : "warning",
        "Read the reported wallet status; never send this purchase request again", { sideEffects: "none" }));
    }
    if (snapshot.reviewMode === "purchase_plan") {
      const stored = snapshot as typeof snapshot & {
        originalPlan?: ActionPlan;
        latestExecutionPlan?: ActionPlan;
        beforeBalances?: BalanceSnapshot;
      };
      const original = stored.originalPlan ?? plans.readStoredPlan(snapshot.planId);
      const fresh = stored.latestExecutionPlan;
      if (!original || !fresh || fresh.status !== "confirmed" || fresh.requiresUserConfirmation || !fresh.minimumOutput || !fresh.verifiedTokens) {
        throw new Error("The returned wallet result is missing its verified same-plan refreshed quote");
      }
      const sameIntent = fresh.intent.walletAddress.toLowerCase() === original.intent.walletAddress.toLowerCase() &&
        fresh.intent.fromTokenAddress.toLowerCase() === original.intent.fromTokenAddress.toLowerCase() &&
        fresh.intent.amount === original.intent.amount && fresh.intent.amountDecimals === original.intent.amountDecimals &&
        fresh.intent.toAsset.chainId === original.intent.toAsset.chainId && fresh.intent.toAsset.platformId === original.intent.toAsset.platformId &&
        fresh.intent.toAsset.contractAddress.toLowerCase() === original.intent.toAsset.contractAddress.toLowerCase() &&
        fresh.intent.maxSlippageBps === original.intent.maxSlippageBps &&
        fresh.authorizationCheck?.spender?.toLowerCase() === original.authorizationCheck?.spender?.toLowerCase() &&
        fresh.planId === original.planId;
      const quoteDriftBps = snapshot.quoteDriftBps ?? 0;
      if (!sameIntent || quoteDriftBps > (original.intent.maxSlippageBps ?? 0) && snapshot.quoteAcceptedAt === undefined) {
        throw new Error("The refreshed wallet request does not match the same plan, or an adverse quote move was not explicitly accepted");
      }
      const { expected } = buildWalletSubmissionRequest(fresh);
      if (original.estimatedFees?.gasBudgetSource === "user_provided" && original.intent.maxGasCostBnb &&
        BigInt(expected.maxGasCostWei) > parseTokenAmount(original.intent.maxGasCostBnb, 18)) {
        throw new Error("The refreshed wallet transaction exceeds the original user-reviewed gas cap");
      }
      if (!stored.beforeBalances) {
        return textResult(outcome({
          snapshot,
          transactionHash: snapshot.txHash,
          summary: "The wallet returned a transaction hash, but Ariadne could not capture the before-purchase balances. The transaction can be inspected, but this run cannot be reported as a reconciled purchase."
        }, "warning", "Do not submit again. Review this same hash and record a pre-purchase balance snapshot if available.", { sideEffects: "none" }));
      }
      const hashRecord: { txHash?: string } = {};
      const reconciliation = await settlement.reconcile({
        txHash: bindSettlementTransactionHash(hashRecord, snapshot.txHash),
        before: stored.beforeBalances,
        expectedInputSpent: parseTokenAmount(fresh.intent.amount, fresh.intent.amountDecimals).toString(),
        minimumOutputReceived: fresh.minimumOutput,
        expectedTransaction: expected,
        maxPollAttempts: 1,
        pollIntervalMs: 0
      });
      if (reconciliation.status === "pending") {
        return textResult(outcome({ snapshot, reconciliation, summary: "The same refreshed transaction is still awaiting BSC finality or balance read-back." },
          "warning", "Continue checking this same transaction hash; do not submit again", { warnings: reconciliation.mismatches }));
      }
      snapshot = await relay.setVerification(handoffId, {
        state: reconciliation.success ? "confirmed" : "failed",
        reconciliation: reconciliation as unknown as Record<string, unknown>,
        resultSummary: reconciliation.success
          ? "BSC finalized the purchase and the wallet's USDT debit and stock-token credit match the refreshed request, within the original plan boundary."
          : `BSC returned a terminal result, but the purchase did not reconcile as successful: ${reconciliation.mismatches.join("; ")}`
      });
      return textResult(outcome({ snapshot, reconciliation, summary: snapshot.resultSummary }, reconciliation.success ? "success" : "blocked",
        reconciliation.success ? "Report the confirmed purchase and balance changes to the user" : "Report the terminal failure or mismatch; do not call this a successful purchase",
        { warnings: reconciliation.mismatches }));
    }
    const trusted = plans.requireBroadcasted(snapshot.planId);
    const record = settlementRecords.get(snapshot.planId);
    if (!record?.expectedTransaction || !record.before) throw new Error("The session no longer has its verified before-purchase balance snapshot");
    const transaction = await transactions.transactionByHash(trusted.intent.toAsset.chainId, snapshot.txHash);
    const mismatches = transaction ? walletTransactionMismatches(record.expectedTransaction, transaction, snapshot.txHash) : [];
    if (mismatches.length) {
      snapshot = await relay.setVerification(handoffId, {
        state: "failed",
        reconciliation: { status: "balance_mismatch", success: false, txHash: snapshot.txHash, mismatches },
        resultSummary: `The returned hash does not match the reviewed transaction: ${mismatches.join("; ")}`
      });
      return textResult(outcome({ snapshot, summary: snapshot.resultSummary }, "blocked", "Do not retry. Inspect the transaction and wallet activity.", { warnings: mismatches }));
    }
    if (!record.walletHashRegistered) {
      bindSettlementTransactionHash(record, snapshot.txHash);
      record.walletHashRegistered = true;
    }
    const reconciliation = await settlement.reconcile({
      txHash: bindSettlementTransactionHash(record, snapshot.txHash), before: record.before,
      expectedInputSpent: parseTokenAmount(trusted.intent.amount, trusted.intent.amountDecimals).toString(),
      minimumOutputReceived: trusted.minimumOutput!, expectedTransaction: record.expectedTransaction,
      maxPollAttempts: 1, pollIntervalMs: 0
    });
    if (reconciliation.status === "pending") {
      return textResult(outcome({ snapshot, reconciliation, summary: "The same transaction is still pending finality or balance read-back." },
        "warning", "Continue monitoring the same transaction hash; do not submit another transaction", { warnings: reconciliation.mismatches }));
    }
    snapshot = await relay.setVerification(handoffId, {
      state: reconciliation.success ? "confirmed" : "failed",
      reconciliation: reconciliation as unknown as Record<string, unknown>,
      resultSummary: reconciliation.success
        ? "BSC finalized the purchase and the wallet's USDT debit and stock-token credit match the reviewed plan."
        : `BSC returned a terminal result, but the purchase did not reconcile as successful: ${reconciliation.mismatches.join("; ")}`
    });
    return textResult(outcome({ snapshot, reconciliation, summary: snapshot.resultSummary }, reconciliation.success ? "success" : "blocked",
      reconciliation.success ? "Report the confirmed purchase and balance changes to the user" : "Report the terminal failure or mismatch; do not call this a successful purchase",
      { warnings: reconciliation.mismatches }));
  } catch (error) {
    return textResult(errorOutcome(error, "Retry only the read-only status check for this same handoff; never submit the wallet transaction again", "external_wallet_reconciliation_failed"));
  }
});

registerAppTool(server, "claim_external_stock_purchase_report", {
  title: "Claim one terminal purchase report",
  description: "App-only. Atomically claims one terminal wallet handoff before the MCP App sends its verified result back to the Agent conversation. The durable claim prevents duplicate reports across App reloads.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: { handoffId: z.string().regex(/^[a-f0-9]{32}$/) }
}, async ({ handoffId }) => {
  try {
    if (!externalHandoffIds.has(handoffId)) throw new Error("This handoff is not attached to the current Ariadne MCP session");
    const claim = await walletHandoffRelay().claimAgentReport(handoffId);
    return textResult(outcome({ ...claim, summary: claim.claimed
      ? "The terminal purchase result is reserved for one Agent report."
      : claim.status === "delivered" ? "This terminal result was already reported to the Agent."
        : "Another active App instance is reporting this terminal result." }, "success",
    claim.claimed ? "Send one verified terminal report, then mark delivery" : "Do not send a duplicate report", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Keep the terminal result visible and retry only the report claim", "agent_report_claim_failed"));
  }
});

registerAppTool(server, "complete_external_stock_purchase_report", {
  title: "Record terminal purchase report delivery",
  description: "App-only. Records whether the host accepted the proactive Agent message. Failed delivery releases the claim so a later App reload can retry without duplicating an accepted report.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: {
    handoffId: z.string().regex(/^[a-f0-9]{32}$/),
    delivered: z.boolean()
  }
}, async ({ handoffId, delivered }) => {
  try {
    if (!externalHandoffIds.has(handoffId)) throw new Error("This handoff is not attached to the current Ariadne MCP session");
    const snapshot = await walletHandoffRelay().finishAgentReport(handoffId, delivered);
    return textResult(outcome({ snapshot, delivered, summary: delivered
      ? "The Agent accepted the proactive terminal purchase report."
      : "The report claim was released because the host did not accept a proactive message." }, "success",
    delivered ? "Do not send this terminal result again" : "A later active App instance may retry the same verified report", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Preserve the verified terminal result and avoid submitting another transaction", "agent_report_completion_failed"));
  }
});

registerAppTool(server, "create_external_stock_allowance_handoff", {
  title: "Open the exact USDT allowance in MetaMask",
  description: "App-only. Called after the user reviews the exact amount, spender and fee cap in Ariadne's allowance panel. Rechecks current allowance and the exact fee cap, then opens a one-time external wallet page. MetaMask decides whether the wallet can process the request; Ariadne does not gate on token or gas balances. This is an allowance only; it does not buy stock.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: { approvalPlanId: z.string().min(1) }
}, async ({ approvalPlanId }) => {
  try {
    if (!(stocks instanceof TokenizedStocksService)) throw new Error("External BSC allowance handoff is available only in Live mode");
      const plan = allowanceApprovalPlans.get(approvalPlanId);
    if (!plan) throw new Error("The exact allowance plan is missing; prepare a fresh allowance review");
    const page = await prepareAllowanceWalletPage(plan);
    return textResult(outcome({
      ...page, status: "wallet_handoff_ready",
      summary: "Ariadne prepared the exact USDT allowance page. Open the single browser link to continue; no wallet request or stock purchase has started."
    }, "success", "Open the prepared wallet page and review the exact token, amount, spender and fee in MetaMask", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Resolve the displayed step before preparing a fresh exact allowance review", "external_allowance_handoff_failed"));
  }
});

registerAppTool(server, "reconcile_external_stock_allowance_handoff", {
  title: "Verify the USDT approval and refresh the quote",
  description: "App-only. Verifies the exact allowance transaction and BSC finality, then checks the confirmed purchase against its original minimum output, market-price movement, token identity, spender and fee cap. If every boundary still holds, it creates a separate one-time purchase prompt for the same external page; otherwise it stops without a purchase.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: { handoffId: z.string().regex(/^[a-f0-9]{32}$/) }
}, async ({ handoffId }) => {
  try {
    if (!(stocks instanceof TokenizedStocksService)) throw new Error("BSC allowance reconciliation is available only in Live mode");
    const approvalPlanId = externalAllowanceHandoffIds.get(handoffId);
    const approvalPlan = approvalPlanId ? allowanceApprovalPlans.get(approvalPlanId) : undefined;
    if (!approvalPlanId || !approvalPlan) throw new Error("This allowance handoff is not attached to the current Ariadne MCP session");
    const relay = walletHandoffRelay();
    let snapshot = await relay.read(handoffId);
    if (snapshot.planId !== approvalPlanId || snapshot.display.operation !== "allowance_approval") throw new Error("Returned wallet result does not match the exact allowance handoff");
    if (snapshot.state !== "submitted" || !snapshot.txHash) {
      return textResult(outcome({ snapshot, summary: snapshot.walletError ?? `Allowance handoff status: ${snapshot.state}` },
        ["wallet_rejected", "wallet_uncertain", "expired", "failed"].includes(snapshot.state) ? "blocked" : "warning",
        "Read the wallet result; never resend this allowance request", { sideEffects: "none" }));
    }
    const result = await stocks.refreshBscPurchaseAfterApproval({ approvalPlan, txHash: snapshot.txHash });
    if (result.status === "pending") {
      return textResult(outcome({ snapshot, approvalStatus: result.status, reason: result.reason,
        summary: "The same USDT approval transaction is still awaiting BSC finality; no fresh purchase quote is reported yet." },
      "warning", "Keep monitoring this same handoff and transaction hash; do not submit again", { warnings: result.reason ? [result.reason] : [] }));
    }
    const allowanceFinalized = result.allowanceFinalized === true || result.status === "ready";
    let continuationPlan: ActionPlan | undefined;
    let followUpHandoffId: string | undefined;
    let continuationReason = result.reason;
    if (result.status === "ready" && result.plan?.status === "awaiting_confirmation" && approvalPlan.confirmedPurchasePlan) {
      try {
        plans.registerPrepared(result.plan);
        const action = result.plan.unsignedActions?.[0] as { payload?: { tx?: Parameters<typeof transactions.simulateEvm>[1] } } | undefined;
        const tx = action?.payload?.tx;
        if (!tx) throw new Error("The fresh quote has no standard EVM transaction to review");
        const simulation = await transactions.simulateEvm("56", tx);
        const simulated = attachSimulation(result.plan, simulation);
        if (simulated.status !== "simulated" && simulated.status !== "wallet_review") {
          throw new Error(simulation.warnings.join("; ") || "The refreshed purchase transaction failed its simulation");
        }
        plans.advance(result.plan, "awaiting_confirmation", simulated, simulated.status);
        const confirmedContinuation = confirmPlan(simulated);
        plans.advance(simulated, simulated.status, confirmedContinuation, "confirmed");
        plans.registerConfirmedContinuation(approvalPlan.confirmedPurchasePlan.planId, confirmedContinuation);
        continuationPlan = confirmedContinuation;
      } catch (error) {
        continuationReason = error instanceof Error ? error.message : "The refreshed purchase could not be prepared within the confirmed plan";
      }
    }
    const success = allowanceFinalized;
    const reconciliation = {
      status: result.status,
      success,
      allowanceFinalized,
      txHash: snapshot.txHash,
      allowance: result.allowance ?? null,
      inputBalance: result.balance ?? null,
      freshPlan: result.plan ?? null,
      purchaseFollowUpStatus: continuationPlan ? "preparing" : success ? "blocked" : "not_started",
      reason: continuationReason ?? null
    };
    snapshot = await relay.setVerification(handoffId, {
      state: success ? "confirmed" : "failed",
      reconciliation,
      resultSummary: success
        ? continuationPlan
          ? "USDT 授权已在链上确认。Ariadne 正在同一页面准备这份已确认计划对应的独立买入请求；只有你在 MetaMask 中确认后才会买入股票。"
          : `USDT 授权已确认，但最新买入条件超出了你确认的计划范围，因此没有买入股票。${continuationReason ? `原因：${continuationReason}` : ""}`
        : `USDT 授权没有按预期完成：${result.reason ?? result.status}。没有发起股票买入。`
    });
    if (continuationPlan) {
      try {
        followUpHandoffId = await createAllowanceContinuationPurchaseHandoff(handoffId, approvalPlan, continuationPlan);
        snapshot = await relay.setContinuationStatus(handoffId, { status: "ready", followUpHandoffId });
        externalAllowanceHandoffCapabilities.delete(handoffId);
      } catch (error) {
        continuationReason = error instanceof Error ? error.message : "The purchase confirmation could not be attached to this wallet page";
        await relay.setContinuationStatus(handoffId, { status: "blocked", reason: continuationReason }).catch(() => undefined);
        snapshot = await relay.read(handoffId);
      }
    }
    if (success) allowanceApprovalPlans.delete(approvalPlanId);
    const finalReconciliation = {
      ...reconciliation,
      purchaseFollowUpStatus: followUpHandoffId ? "ready" : continuationPlan ? "blocked" : reconciliation.purchaseFollowUpStatus,
      ...(followUpHandoffId ? { followUpHandoffId } : {}),
      ...(continuationReason ? { reason: continuationReason } : {})
    };
    return textResult(outcome({ snapshot, freshPlan: result.plan,
      continuationPlan, reconciliation: finalReconciliation,
      summary: snapshot.resultSummary, approvalStatus: result.status,
      nextBoundary: followUpHandoffId ? "同一个浏览器页面已准备好对应这份计划的独立股票买入请求；请在 MetaMask 中检查并确认。" : success ? "USDT 授权已确认，但最新买入条件超出原计划范围，因此没有开始买入。请查看原因并重新制定计划。" : undefined
    }, followUpHandoffId ? "success" : success ? "warning" : "blocked", followUpHandoffId ? "Continue monitoring the purchase handoff until BSC confirms and balances reconcile" : success ? "Report that allowance finalized but no purchase began; explain the specific plan boundary" : "Report the exact allowance failure; do not claim that stock was purchased", { warnings: finalReconciliation.reason ? [String(finalReconciliation.reason)] : [], sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Retry only the read-only status and allowance check for this same handoff; never submit the allowance again", "external_allowance_reconciliation_failed"));
  }
});

registerAppTool(server, "claim_stock_purchase_wallet_submission", {
  title: "Reserve the reviewed wallet submission",
  description: "App-only step called by the visible purchase panel after the user continues. It verifies the exact transaction and current allowance, captures pre-transaction balances for settlement reconciliation, and atomically reserves one wallet-submission attempt. The wallet itself decides whether funds and fees are sufficient; this tool does not gate on balances, sign or broadcast.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: {
    planId: z.string().min(1),
    walletRequest: z.object({ from: z.string(), to: z.string(), value: z.string(), data: z.string(), gas: z.string(), gasPrice: z.string() })
  }
}, async ({ planId, walletRequest }) => {
  try {
    const trusted = plans.requireById(planId, "confirmed");
    if (isPlanExpired(trusted)) throw new Error("The purchase quote has expired; prepare and confirm a fresh plan");
    const { request, expected } = buildWalletSubmissionRequest(trusted);
    if (!walletSubmissionRequestsMatch(request, walletRequest)) throw new Error("The panel transaction request differs from the exact confirmed plan; no wallet attempt was reserved");
    if (!trusted.verifiedTokens || !trusted.minimumOutput) throw new Error("The confirmed plan lacks verified token identities or a reviewed minimum output");
    const allowance = await transactions.erc20Allowance(
      trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender
    );
    assertAllowanceCoversPlan(trusted, allowance);
    const before = await settlement.captureBefore({
      chainId: trusted.intent.toAsset.chainId, walletAddress: trusted.intent.walletAddress,
      inputToken: trusted.verifiedTokens.input, outputToken: trusted.verifiedTokens.output
    });
    plans.reserveBroadcast(trusted);
    settlementRecords.set(trusted.planId, { before, expectedTransaction: expected });
    return textResult(outcome({
      planId: trusted.planId,
      status: "wallet_submission_reserved",
      walletRequest: { method: "eth_sendTransaction", params: [request] },
      requiredWalletContext: { chainId: "0x38", account: trusted.intent.walletAddress },
      summary: "Exact wallet request revalidated; one user-controlled submission attempt is reserved. Ariadne has not signed or broadcast."
    }, "success", "Submit this exact request once through the user's wallet and register the returned transaction hash", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Do not send a different request. Resolve the displayed condition or prepare a fresh quote and plan.", "wallet_submission_reservation_failed"));
  }
});

registerAppTool(server, "register_stock_purchase_wallet_hash", {
  title: "Register the MetaMask transaction hash",
  description: "Bind the transaction hash returned by the user's wallet to the exact reserved purchase plan. This does not send or sign a transaction; reconciliation verifies the on-chain transaction fields, fee cap, receipt and wallet balance deltas.",
  _meta: { ui: { visibility: ["app"] } },
  inputSchema: {
    planId: z.string().min(1),
    txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/)
  }
}, async ({ planId, txHash }) => {
  try {
    const trusted = plans.requireBroadcasted(planId);
    const record = settlementRecords.get(planId);
    if (!record?.expectedTransaction) throw new Error("No external-wallet request is registered for this plan in the current MCP session");
    const transaction = await transactions.transactionByHash(trusted.intent.toAsset.chainId, txHash);
    const mismatches = transaction ? walletTransactionMismatches(record.expectedTransaction, transaction, txHash) : [];
    if (mismatches.length) throw new Error(mismatches.join("; "));
    const boundHash = bindSettlementTransactionHash(record, txHash);
    record.walletHashRegistered = true;
    return textResult(outcome({
      planId, txHash: boundHash,
      status: transaction ? "wallet_transaction_observed" : "awaiting_chain_observation",
      summary: transaction ? "Wallet transaction hash is bound and its fields match the reviewed plan" : "Wallet hash is bound; transaction details are not visible on the configured BSC RPC yet",
      noAdditionalBroadcast: true
    }, transaction ? "success" : "warning", "Reconcile this exact hash; Ariadne will require matching transaction fields, a successful receipt, and reviewed balance changes before reporting purchase success", { sideEffects: "none" }));
  } catch (error) {
    return textResult(errorOutcome(error, "Use the hash returned by the connected wallet for the reserved plan; do not send the transaction again", "wallet_hash_registration_failed"));
  }
});

server.registerTool("reconcile_stock_purchase", {
  description: "Poll a broadcast BSC purchase receipt and reconcile verified input/output token balances against the captured pre-broadcast snapshot. Reports success only when receipt and deltas match.",
  inputSchema: {
    planId: z.string().min(1),
    txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
    maxPollAttempts: z.number().int().min(1).max(120).optional(),
    pollIntervalMs: z.number().int().min(0).max(10_000).optional()
  }
}, async ({ planId, txHash, maxPollAttempts, pollIntervalMs }) => {
  try {
    const trusted = plans.requireBroadcasted(planId);
    const record = settlementRecords.get(planId);
    if (!record) throw new Error("No verified pre-broadcast balance snapshot exists for this plan in the current MCP session");
    if (record.expectedTransaction && !record.walletHashRegistered) {
      throw new Error("Register the hash returned by the wallet before reconciling this external-wallet purchase");
    }
    if (record.expectedTransaction && txHash && record.txHash && txHash.toLowerCase() !== record.txHash.toLowerCase()) {
      throw new Error("Supplied transaction hash does not match the hash registered from the wallet");
    }
    const resolvedHash = bindSettlementTransactionHash(record, txHash);
    if (!trusted.verifiedTokens || !trusted.minimumOutput) throw new Error("The plan lacks verified token precision or a reviewed minimum output");
    const result = await settlement.reconcile({
      txHash: resolvedHash,
      before: record.before,
      expectedInputSpent: parseTokenAmount(trusted.intent.amount, trusted.intent.amountDecimals).toString(),
      minimumOutputReceived: trusted.minimumOutput,
      ...(record.expectedTransaction ? { expectedTransaction: record.expectedTransaction } : {}),
      maxPollAttempts,
      pollIntervalMs
    });
    return textResult(outcome({
      summary: result.success ? "Transaction receipt and wallet balance changes reconcile" : `Settlement is ${result.status}; do not mark the purchase complete`,
      reconciliation: result
    }, result.success ? "success" : result.status === "pending" ? "warning" : "blocked", result.success ? "Review the confirmed receipt and reconciled balances" : result.status === "pending" ? "Wait for confirmation and poll again" : "Investigate the receipt or balance mismatch before any further action", { warnings: result.mismatches }));
  } catch (error) {
    return textResult(errorOutcome(error, "Use a plan that was broadcast in this MCP session and reconcile its exact transaction hash", "settlement_reconciliation_failed"));
  }
});

server.registerTool("get_broadcast_order_status", {
  description: "Read broadcast order status for a wallet and chain. Read-only.",
  inputSchema: { address: z.string().min(1), chainId: z.string().min(1), orderId: z.string().optional(), txStatus: z.string().optional() }
}, async ({ address, chainId, orderId, txStatus }) => {
  const result = await transactions.broadcastOrders(address, chainId, { orderId, txStatus });
  return textResult(outcome({ address, chainId, result, summary: "Broadcast order status retrieved" }, "success", "Use the order status to determine whether the transaction settled"));
});

return server;
}

if (process.env.ARIADNE_TRANSPORT !== "http") {
  const relayReadiness = await ensureWalletHandoffRelayReady();
  if (relayReadiness.status === "ready") {
    console.error(`Ariadne wallet handoff relay ready (${relayReadiness.mode}) at ${relayReadiness.origin}`);
    if (relayReadiness.server) {
      const stopRelay = () => relayReadiness.server?.close();
      process.once("SIGINT", stopRelay);
      process.once("SIGTERM", stopRelay);
    }
  } else {
    console.error(`Ariadne wallet handoff relay unavailable: ${relayReadiness.reason}. Read-only research remains available.`);
  }
  serveStdio(() => buildMcpServer(), {
    onerror: (error) => console.error(`Ariadne MCP transport error: ${error.name}`)
  });
}
