import assert from "node:assert/strict";
import { WalletHandoffStore, WalletHandoffRelayClient, type ExternalWalletAllowancePreparation, type ExternalWalletHandoffCreate, type ExternalWalletPurchaseRefresh } from "../src/services/wallet-handoff-relay.js";
import type { ActionPlan, AllowanceApprovalPlan } from "../src/domain/types.js";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";

const wallet = "0x1111111111111111111111111111111111111111";
const input = "0x2222222222222222222222222222222222222222";
const target = "0x3333333333333333333333333333333333333333";
const stock = "0x4444444444444444444444444444444444444444";
const spender = "0x5555555555555555555555555555555555555555";
const secret = "local-purchase-plan-handoff-test-secret-32-chars";

function makePlan(now: number, options: { expected?: string; minimum?: string; status?: ActionPlan["status"]; maxSlippageBps?: number; planId?: string } = {}): ActionPlan {
  const asset = { assetId: `56:${stock}`, chainId: "56", platformId: "bstock", contractAddress: stock, tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "NVIDIA" };
  return {
    planId: options.planId ?? "plan-original-1",
    status: options.status ?? "awaiting_confirmation",
    intent: { type: "buy", walletAddress: wallet, fromTokenAddress: input, amount: "10", amountDecimals: 18, maxSlippageBps: options.maxSlippageBps ?? 200, toAsset: asset },
    assetContext: { asset, tokenPrice: "237.00", referencePrice: "236.90", tokenPriceUpdatedAt: now - 1_000, marketStatus: "unknown", dataWarnings: [] },
    quoteId: options.status === "confirmed" ? "quote-fresh" : "quote-original",
    expectedOutput: options.expected ?? "100000000",
    minimumOutput: options.minimum ?? "98000000",
    executionMode: "SWAP",
    verifiedTokens: {
      input: { chainId: "56", contractAddress: input, symbol: "USDT", decimals: 18, verifiedAt: now, verificationSource: "bsc-eth-call" },
      output: { chainId: "56", contractAddress: stock, symbol: "NVDAB", decimals: 6, verifiedAt: now, verificationSource: "bsc-eth-call" }
    },
    estimatedFees: { estimatedMaxGasCostBnb: "0.0001", gasBudgetSource: "provider_high_tier_estimate", networkGasLimit: "100000", highGasPriceWei: "100000000" },
    authorizationCheck: { required: true, tokenAddress: input, spender, requiredAmount: "10000000000000000000", reviewedAllowance: "10000000000000000000", allowanceReadStatus: "verified" },
    expiresAt: now + 60_000,
    requiresUserConfirmation: options.status !== "confirmed"
  };
}

function makeRefresh(now: number, options: { expected: string; minimum: string; plan?: ActionPlan; fee?: string; planId?: string } ): ExternalWalletPurchaseRefresh {
  const plan = options.plan ?? makePlan(now, { status: "confirmed", expected: options.expected, minimum: options.minimum, planId: options.planId });
  plan.estimatedFees = { ...plan.estimatedFees, estimatedMaxGasCostBnb: options.fee ?? "0.00012" };
  return {
    plan,
    request: { from: wallet, to: target, value: "0x0", data: "0x1234", gas: "0x186a0", gasPrice: "0x5f5e100" },
    display: {
      operation: "purchase", issuer: "bStocks", ticker: "NVDA", inputAmount: "10", inputSymbol: "USDT", inputContract: input,
      expectedOutput: String(Number(options.expected) / 1_000_000), outputSymbol: "NVDAB", outputContract: stock,
      minimumOutput: String(Number(options.minimum) / 1_000_000), spender, slippageBps: 200, maxGasCostBnb: options.fee ?? "0.00012",
      estimatedNetworkFeeBnb: options.fee ?? "0.00012",
      marketStatus: "unknown", marketReference: { chainId: "56", platformId: "bstock", contractAddress: stock },
      purchaseBaseline: { expectedOutput: "100000000", minimumOutput: "98000000", outputDecimals: 6, slippageBps: 200, estimatedNetworkFeeBnb: "0.0001" },
      continuationOfPlanId: plan.planId
    }
  };
}

function makeAllowance(now: number, plan: ActionPlan): ExternalWalletAllowancePreparation {
  const approvalPlan: AllowanceApprovalPlan = {
    approvalPlanId: `approval-${plan.planId}`,
    status: "ready_for_wallet_review",
    walletAddress: wallet,
    inputToken: plan.verifiedTokens!.input,
    outputToken: plan.verifiedTokens!.output,
    marketReview: { status: "open", providerOpenState: true, warnings: [] },
    spender,
    amountBaseUnits: "10000000000000000000",
    amountDisplay: "10 USDT",
    unsignedTransaction: { from: wallet, to: input, value: "0", data: "0x095ea7b3", gas: "0x11170", gasPrice: "0x5f5e100" },
    simulation: { success: true, warnings: [], balanceChanges: [], allowanceChanges: [] },
    quoteId: "allowance-quote",
    expiresAt: now + 60_000,
    maxGasCostBnb: "0.0001",
    estimatedMaxGasCostBnb: "0.00007",
    gasBudgetSource: "provider_high_tier_estimate",
    purchase: { amount: "10", maxSlippageBps: 200, asset: plan.intent.toAsset },
    requiresUserConfirmation: true
  };
  return {
    approvalPlan,
    request: { from: wallet, to: input, value: "0x0", data: "0x095ea7b3", gas: "0x11170", gasPrice: "0x5f5e100" },
    display: {
      operation: "allowance_approval", issuer: "bStocks", ticker: "NVDA", inputAmount: "10", inputSymbol: "USDT", inputContract: input,
      expectedOutput: "100", outputSymbol: "NVDAB", outputContract: stock, minimumOutput: "98", spender,
      allowanceCurrent: "3", allowanceRequired: "10", allowanceStatus: "insufficient", estimatedNetworkFeeBnb: "0.00007",
      slippageBps: 200, maxGasCostBnb: "0.0001", marketStatus: "open",
      marketReference: { chainId: "56", platformId: "bstock", contractAddress: stock },
      purchaseBaseline: { expectedOutput: "100000000", minimumOutput: "98000000", outputDecimals: 6, slippageBps: 200, estimatedNetworkFeeBnb: "0.0001" },
      continuationOfPlanId: plan.planId
    }
  };
}

const start = 1_800_000_000_000;
let now = start;
const store = new WalletHandoffStore({ portalOrigin: "http://127.0.0.1:8791", now: () => now });
const original = makePlan(now);
const initialDisplay: ExternalWalletHandoffCreate["display"] = {
  operation: "purchase", issuer: "bStocks", ticker: "NVDA", inputAmount: "10", inputSymbol: "USDT", inputContract: input,
  expectedOutput: "100", outputSymbol: "NVDAB", outputContract: stock, minimumOutput: "98", spender,
  slippageBps: 200, maxGasCostBnb: "0.0001", estimatedNetworkFeeBnb: "0.0001", marketStatus: "unknown",
  marketReference: { chainId: "56", platformId: "bstock", contractAddress: stock },
  marketBaseline: { tokenPrice: "237.00", referencePrice: "236.90", tokenPriceUpdatedAt: now - 1_000 },
  purchaseBaseline: { expectedOutput: "100000000", minimumOutput: "98000000", outputDecimals: 6, slippageBps: 200, estimatedNetworkFeeBnb: "0.0001" }
};
const created = store.createPurchasePlanReview(original, initialDisplay);
assert.equal(store.readInternal(created.id).request, undefined, "creating a plan link stores no wallet transaction request");
assert.equal(store.readPublic(created.id, created.capability).walletAttemptClaimedAt, undefined, "creating and opening a plan link does not reserve a wallet attempt");
assert.equal(store.portalUrlForExternalOpen(created.id, created.capability), created.url, "the link resolves to this exact plan session");
assert.throws(() => store.claimWalletAttempt(created.id, created.capability, "11111111-1111-4111-8111-111111111111"), /fresh executable wallet request/i,
  "the initial plan link cannot claim an attempt before obtaining the current quote");
const ondoPlan = structuredClone(original);
ondoPlan.planId = "plan-ondo-apple";
ondoPlan.intent.toAsset = {
  ...ondoPlan.intent.toAsset,
  platformId: "ondo",
  tokenSymbol: "AAPLon",
  underlyingTicker: "AAPL",
  underlyingName: "Apple Inc."
};
ondoPlan.assetContext = ondoPlan.assetContext ? { ...ondoPlan.assetContext, asset: ondoPlan.intent.toAsset } : ondoPlan.assetContext;
const ondoDisplay = {
  ...initialDisplay,
  issuer: "Ondo",
  ticker: "AAPL",
  outputSymbol: "AAPLon",
  marketReference: { chainId: "56" as const, platformId: "ondo", contractAddress: stock }
};
const ondoCreated = store.createPurchasePlanReview(ondoPlan, ondoDisplay);
assert.equal(store.readPublic(ondoCreated.id, ondoCreated.capability).display.marketReference?.platformId, "ondo",
  "the same purchase page contract accepts an exact Ondo BSC asset identity without issuer-specific code");
now += 61_000;
assert.ok(now > original.expiresAt!, "fixture advances past the original short-lived quote");
const withinLimit = store.preparePurchaseReview(created.id, created.capability, makeRefresh(now, { expected: "99000000", minimum: "97020000" }));
assert.equal(withinLimit.planId, original.planId, "refresh preserves the original plan identity");
assert.equal(withinLimit.request?.to, target, "the expired baseline quote is replaced by a fresh executable request");
assert.equal(withinLimit.quoteDriftBps, 100, "the new expected output is measured against the saved plan baseline");
assert.equal(withinLimit.requiresQuoteAcceptance, false, "a price movement within the original slippage limit can proceed to the wallet's own confirmation");
assert.equal(withinLimit.display.purchaseBaseline?.expectedOutput, "100000000", "the original expected output remains visible after refresh");
assert.equal(store.readInternal(created.id).latestExecutionPlan?.planId, original.planId, "the refreshed request retains the same plan identity");
assert.equal(withinLimit.display.estimatedNetworkFeeBnb, "0.00012", "the latest gas estimate is retained for comparison with the original plan");
store.claimWalletAttempt(created.id, created.capability, "11111111-1111-4111-8111-111111111111");

const dynamicGasOriginal = makePlan(now, { planId: "plan-dynamic-gas" });
dynamicGasOriginal.intent.maxGasCostBnb = "0.0001";
dynamicGasOriginal.estimatedFees = { ...dynamicGasOriginal.estimatedFees, gasBudgetSource: "provider_high_tier_estimate" };
const dynamicGas = store.createPurchasePlanReview(dynamicGasOriginal, initialDisplay);
const dynamicGasFresh = makePlan(now, { status: "confirmed", planId: "plan-dynamic-gas" });
dynamicGasFresh.intent.maxGasCostBnb = "0.00012";
dynamicGasFresh.estimatedFees = { ...dynamicGasFresh.estimatedFees, gasBudgetSource: "provider_high_tier_estimate", estimatedMaxGasCostBnb: "0.00012" };
const dynamicGasResult = store.preparePurchaseReview(dynamicGas.id, dynamicGas.capability, makeRefresh(now, {
  expected: "99500000", minimum: "97510000", plan: dynamicGasFresh, fee: "0.00012"
}));
assert.equal(dynamicGasResult.request?.to, target, "a refreshed provider-derived gas estimate is displayed but does not rewrite the user's purchase intent");

const changedSlippagePlan = makePlan(now, { status: "confirmed", planId: "plan-precise-diagnostic", maxSlippageBps: 250 });
const precise = store.createPurchasePlanReview(makePlan(now, { planId: "plan-precise-diagnostic" }), initialDisplay);
assert.throws(() => store.preparePurchaseReview(precise.id, precise.capability, makeRefresh(now, {
  expected: "99500000", minimum: "97000000", plan: changedSlippagePlan
})), /slippage limit/, "refresh mismatch errors identify the exact changed boundary");

const adverse = store.createPurchasePlanReview(makePlan(now, { planId: "plan-adverse-2" }), initialDisplay);
store.readPublic(adverse.id, adverse.capability);
const reviewNeeded = store.preparePurchaseReview(adverse.id, adverse.capability, makeRefresh(now, { expected: "97000000", minimum: "95060000", planId: "plan-adverse-2" }));
assert.equal(reviewNeeded.requiresQuoteAcceptance, true, "an adverse move beyond the slippage limit is shown for explicit owner review");
assert.equal(reviewNeeded.request, undefined, "the wallet request is withheld until the owner accepts the shown quote");
assert.equal(reviewNeeded.quoteDriftBps, 300);
assert.throws(() => store.claimWalletAttempt(adverse.id, adverse.capability, "22222222-2222-4222-8222-222222222222"), /accept the displayed/i);
assert.throws(() => store.acceptLatestPurchaseQuote(adverse.id, adverse.capability, "stale-quote-id"), /not the current quote/i);
const accepted = store.acceptLatestPurchaseQuote(adverse.id, adverse.capability, "quote-fresh");
assert.equal(accepted.request?.to, target, "the wallet request appears only after explicit acceptance of the displayed quote");
store.claimWalletAttempt(adverse.id, adverse.capability, "22222222-2222-4222-8222-222222222222");
assert.throws(() => store.claimWalletAttempt(adverse.id, adverse.capability, "33333333-3333-4333-8333-333333333333"), /already started/i, "one plan link cannot start multiple wallet attempts");

const cappedOriginal = makePlan(now, { planId: "plan-gas-cap-3" });
cappedOriginal.intent.maxGasCostBnb = "0.0002";
cappedOriginal.estimatedFees = { ...cappedOriginal.estimatedFees, gasBudgetSource: "user_provided" };
const capped = store.createPurchasePlanReview(cappedOriginal, { ...initialDisplay, purchaseMaxGasCostBnb: "0.0002" });
store.readPublic(capped.id, capped.capability);
const cappedFresh = makePlan(now, { status: "confirmed", planId: "plan-gas-cap-3" });
cappedFresh.intent.maxGasCostBnb = "0.0002";
assert.throws(() => store.preparePurchaseReview(capped.id, capped.capability, makeRefresh(now, { expected: "100000000", minimum: "98000000", plan: cappedFresh, fee: "0.0003" })), /above the original .* cap/i,
  "refresh cannot silently exceed a user-supplied gas cap");
assert.equal(store.readInternal(capped.id).request, undefined, "a gas-cap breach creates no wallet request");

const allowanceFinalizeAttempts = new Map<string, number>();
const server = await createWalletHandoffRelayServer({
  host: "127.0.0.1", port: 0, portalOrigin: "http://127.0.0.1:0", serviceSecret: secret,
  preparePurchaseRefresh: async (plan) => {
    if (plan.planId === "plan-refresh-failure") throw new Error("USDT allowance is not verified as sufficient. No purchase wallet request was prepared.");
    if (plan.planId.startsWith("plan-allowance-")) return makeAllowance(Date.now(), plan);
    return makeRefresh(Date.now(), { expected: "97000000", minimum: "95060000" });
  },
  finalizeAllowancePurchase: async ({ originalPlan }) => {
    if (originalPlan.planId === "plan-allowance-reverted") {
      return { status: "reverted", reason: "Approval transaction reverted on BSC" };
    }
    if (originalPlan.planId === "plan-allowance-boundary") {
      return { status: "blocked", allowanceFinalized: true, reason: "The refreshed quote reduced the original minimum output" };
    }
    const attempts = (allowanceFinalizeAttempts.get(originalPlan.planId) ?? 0) + 1;
    allowanceFinalizeAttempts.set(originalPlan.planId, attempts);
    if (attempts === 1) return { status: "pending", reason: "Approval receipt is not finalized yet" };
    return {
      status: "ready",
      allowance: "10000000000000000000",
      balance: "25000000000000000000",
      refresh: makeRefresh(Date.now(), { expected: "100000000", minimum: "98000000", planId: originalPlan.planId })
    };
  }
});
try {
  const address = server.server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const client = new WalletHandoffRelayClient({ baseUrl, secret });
  const approvalPageHtml = await fetch(`${baseUrl}/approve`).then((response) => response.text());
  const approvalPageText = approvalPageHtml.replace(/\\u([0-9a-f]{4})/gi, (_match, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
  assert.match(approvalPageText, /原计划预计到账/);
  assert.match(approvalPageText, /预计到账变化/);
  assert.match(approvalPageText, /原计划预估网络费/);
  assert.match(approvalPageText, /本次预估网络费/);
  assert.match(approvalPageText, /我已看过变化，继续用此报价打开 MetaMask/);
  assert.match(approvalPageText, /refresh-purchase/);
  const apiCreated = await client.createPurchasePlanReview(makePlan(Date.now()), initialDisplay);
  const publicBeforeOpen = await fetch(`${baseUrl}/api/handoffs/${apiCreated.id}`, { headers: { authorization: `Bearer ${apiCreated.capability}` } });
  assert.equal(publicBeforeOpen.status, 200, "the public plan URL is available before any wallet action");
  const json = await publicBeforeOpen.json() as Record<string, unknown>;
  assert.equal(json.request, undefined, "the link's first read contains no transaction request");
  assert.equal(json.walletAttemptClaimedAt, undefined, "the link's first read did not claim wallet activity");
  const refreshed = await client.preparePurchaseReview(apiCreated.id, apiCreated.capability);
  assert.equal(refreshed.requiresQuoteAcceptance, true, "the relay reports quote movement beyond the plan limit to the page");
  assert.equal(refreshed.request, undefined, "the relay withholds the wallet request while the owner reviews the quote movement");
  const acceptedByOwner = await client.acceptLatestPurchaseQuote(apiCreated.id, apiCreated.capability, "quote-fresh");
  assert.equal(acceptedByOwner.request?.to, target, "the relay exposes the exact displayed request only after the owner accepts the current quote");
  assert.equal(acceptedByOwner.request?.from.toLowerCase(), wallet);
  const allowanceNeededPlan = makePlan(Date.now(), { planId: "plan-allowance-needed" });
  allowanceNeededPlan.authorizationCheck = {
    ...allowanceNeededPlan.authorizationCheck!, reviewedAllowance: "3000000000000000000", requiredAmount: "10000000000000000000"
  };
  allowanceNeededPlan.approvalRequired = {
    tokenAddress: input, spender, currentAllowance: "3000000000000000000", requiredAmount: "10000000000000000000"
  };
  const allowanceReview = await client.createPurchasePlanReview(allowanceNeededPlan, initialDisplay);
  const allowancePrepared = await client.preparePurchaseReview(allowanceReview.id, allowanceReview.capability);
  assert.equal(allowancePrepared.state, "active", "insufficient allowance keeps the same plan active instead of terminalizing it");
  assert.equal(allowancePrepared.display.operation, "allowance_approval");
  assert.equal(allowancePrepared.request?.to.toLowerCase(), input, "the first wallet request is the exact input-token allowance");
  server.store.claimWalletAttempt(allowanceReview.id, allowanceReview.capability, "44444444-4444-4444-8444-444444444444");
  server.store.submitFromWallet(allowanceReview.id, allowanceReview.capability, {
    account: wallet, chainId: "0x38", txHash: `0x${"66".repeat(32)}`
  });
  const pendingAllowance = await client.finalizeAllowancePurchase(allowanceReview.id, allowanceReview.capability);
  assert.equal(pendingAllowance.state, "submitted", "a non-final receipt remains pending without creating a purchase request");
  assert.equal(pendingAllowance.followUp, undefined);
  const finalizedAllowance = await client.finalizeAllowancePurchase(allowanceReview.id, allowanceReview.capability);
  assert.equal(finalizedAllowance.state, "confirmed", "the exact allowance receives a terminal chain-verification state");
  assert.equal(finalizedAllowance.reconciliation?.purchaseFollowUpStatus, "ready");
  assert.ok(finalizedAllowance.followUp, "one separate purchase confirmation is prepared after allowance finality");
  const child = await client.read(finalizedAllowance.followUp!.id);
  assert.equal(child.state, "active");
  assert.equal(child.display.operation, "purchase");
  assert.equal(child.request?.to, target);
  const finalizedAgain = await client.finalizeAllowancePurchase(allowanceReview.id, allowanceReview.capability);
  assert.equal(finalizedAgain.followUp?.id, finalizedAllowance.followUp!.id, "rechecking finality cannot create a second purchase request");
  for (const [planId, expectedState, finalized] of [
    ["plan-allowance-reverted", "failed", false],
    ["plan-allowance-boundary", "confirmed", true]
  ] as const) {
    const plan = makePlan(Date.now(), { planId });
    const review = await client.createPurchasePlanReview(plan, initialDisplay);
    await client.preparePurchaseReview(review.id, review.capability);
    server.store.claimWalletAttempt(review.id, review.capability, planId.endsWith("reverted")
      ? "55555555-5555-4555-8555-555555555555"
      : "66666666-6666-4666-8666-666666666666");
    server.store.submitFromWallet(review.id, review.capability, { account: wallet, chainId: "0x38", txHash: `0x${(finalized ? "77" : "88").repeat(32)}` });
    const outcome = await client.finalizeAllowancePurchase(review.id, review.capability);
    assert.equal(outcome.state, expectedState);
    assert.equal(outcome.reconciliation?.allowanceFinalized, finalized);
    assert.equal(outcome.followUpHandoffId, undefined, "a reverted or boundary-blocked allowance never creates a purchase request");
  }
  const failedPlan = makePlan(Date.now(), { planId: "plan-refresh-failure" });
  const failedReview = await client.createPurchasePlanReview(failedPlan, initialDisplay);
  await assert.rejects(() => client.preparePurchaseReview(failedReview.id, failedReview.capability), /allowance is not verified/i);
  const failedSnapshot = await client.read(failedReview.id);
  assert.equal(failedSnapshot.state, "failed", "quote-refresh failure becomes a durable terminal state instead of remaining invisible in an active page");
  assert.equal(failedSnapshot.txHash, undefined);
  assert.equal(failedSnapshot.reconciliation?.status, "not_submitted");
  assert.equal(failedSnapshot.reconciliation?.fundsChanged, false);
  assert.equal((await client.claimAgentReport(failedReview.id)).claimed, true, "a quote-refresh failure can trigger exactly one proactive Agent report");
  await client.finishAgentReport(failedReview.id, true);
} finally {
  await new Promise<void>((resolve, reject) => server.server.close((error) => error ? reject(error) : resolve()));
}

console.log("Purchase-plan handoff passed: direct link creation without wallet effects, provider-derived gas refresh, precise mismatch diagnostics, visible baseline drift, explicit adverse-quote acceptance, user gas-cap enforcement and relay API behavior.");
