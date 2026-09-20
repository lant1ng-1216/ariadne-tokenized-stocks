import assert from "node:assert/strict";
import { normalizeMarketContext, normalizeQuote, normalizeSimulation } from "../src/domain/normalizers.js";
import { evaluateSafety } from "../src/domain/safety.js";
import { attachSimulation, assertExecutable, confirmPlan, isPlanExpired } from "../src/domain/action-plan.js";
import { ExecutionService } from "../src/services/executor.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

const asset = {
  assetId: "56:0xabc",
  chainId: "56",
  platformId: "bstock",
  contractAddress: "0xabc",
  tokenSymbol: "NVDAB",
  underlyingTicker: "NVDA",
  underlyingName: "Nvidia Corp"
};

const market = normalizeMarketContext(asset, {
  tokenPrice: "0.3000000000000000001",
  referencePrice: "0.3",
  tokenPriceUpdatedAt: 1,
  statusInfo: { marketStatus: "offhours", openState: true },
  liquidity: null
});
assert.equal(market.priceGap, "0.0000000000000000001");
assert.equal(market.priceGapPercent, "0.000000000000000033%");
assert.equal(market.marketStatus, "offhours");
assert.match(market.dataWarnings.join(" "), /Liquidity/);
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "regular" } }).marketStatus, "open");
assert.equal(normalizeMarketContext(asset, { statusInfo: { marketStatus: "halted" } }).marketStatus, "closed");

const quote = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q1", toTokenAmount: "10", priceImpactPercent: "0.4", vendorName: "LiquidMesh", approveTarget: "0xapprove" }] });
assert.equal(quote.success, true);
assert.equal(quote.routes[0]?.quoteId, "q1");
assert.equal(quote.routes[0]?.priceImpact, "0.4");
assert.equal(quote.routes[0]?.approvalTarget, "0xapprove");
assert.match(quote.warnings.join(" "), /minToTokenAmount/);
const rfqQuote = normalizeQuote(asset, { code: 0, success: true, data: [{ quoteId: "q-rfq", executionMode: "RFQ", toTokenAmount: "10" }] });
assert.equal(rfqQuote.platformMode, "rfq");
const standardQuote = normalizeQuote({ ...asset, platformId: "regular" }, { code: 0, success: true, data: [{ quoteId: "q-swap", executionMode: "SWAP", toTokenAmount: "10" }] });
assert.equal(standardQuote.platformMode, "standard");
const rfqService = new TokenizedStocksService({} as any);
const rfqSigning = rfqService.prepareRfqSigningRequest({ kind: "rfq_order", chainId: "56", quoteId: "q-rfq", payload: { rfq: { orderId: "order-1", vendor: "PcsXRfq", signingScheme: "EIP712", typedDataToSign: "0x1901" } } });
assert.deepEqual(rfqSigning, { quoteId: "q-rfq", orderId: "order-1", vendor: "PcsXRfq", signingScheme: "EIP712", typedDataToSign: "0x1901" });

const simulation = normalizeSimulation({ code: 0, success: true, data: { balanceChanges: [], allowanceChanges: [] } });
assert.equal(simulation.success, true);

const plan = { planId: "p1", status: "awaiting_confirmation" as const, intent: {
  type: "buy" as const, walletAddress: "0x1", fromTokenAddress: "0x2", toAsset: asset, amount: "1", amountDecimals: 18
}, requiresUserConfirmation: true };
const safety = evaluateSafety({ plan, market, quote, simulation, allowance: 10n ** 18n, requiredAllowance: 1n * (10n ** 18n) });
assert.equal(safety.passed, true);
const closedMarket = normalizeMarketContext(asset, {
  tokenPrice: "0.3",
  tokenPriceUpdatedAt: 1,
  statusInfo: { marketStatus: "halted", openState: false }
});
const closedSafety = evaluateSafety({ plan, market: closedMarket, quote, simulation });
assert.equal(closedSafety.passed, false);
assert.match(closedSafety.blockingReasons.join(" "), /closed|halted/);
const invalidSlippage = evaluateSafety({ plan: { ...plan, intent: { ...plan.intent, maxSlippageBps: 10_001 } }, market, quote, simulation });
assert.equal(invalidSlippage.passed, false);
const simulatedPlan = attachSimulation(plan, simulation);
assert.equal(simulatedPlan.status, "simulated");
assert.throws(() => assertExecutable(simulatedPlan), /confirmation/);
const confirmedPlan = confirmPlan(simulatedPlan, "p1");
assert.equal(confirmedPlan.status, "confirmed");
assert.doesNotThrow(() => assertExecutable(confirmedPlan));
assert.throws(() => confirmPlan(confirmedPlan, "p1"), /simulation and safety/);
const failedSimulationPlan = attachSimulation(plan, { ...simulation, success: false, warnings: ["failed"] });
assert.equal(failedSimulationPlan.status, "failed");
assert.throws(() => confirmPlan(failedSimulationPlan, "p1"), /simulation and safety/);
assert.equal(attachSimulation(confirmedPlan, simulation).status, "failed");
assert.equal(isPlanExpired({ ...confirmedPlan, expiresAt: 1 }, 2), true);
assert.throws(() => confirmPlan({ ...simulatedPlan, expiresAt: 1 }, "p1", 2), /expired/);
const executable = { ...confirmedPlan, unsignedActions: [{ kind: "evm_transaction" }] };
const executor = new ExecutionService(async (action) => ({ action, signature: "test-signature" }));
const signed = await executor.signConfirmed(executable);
assert.equal(signed.length, 1);
await assert.rejects(() => executor.broadcastConfirmed(executable), /Broadcasting is disabled/);
await assert.rejects(() => new ExecutionService(async (action) => ({ action, signature: "sig" })).broadcastConfirmed(executable), /Broadcasting is disabled/);
let broadcastCalls = 0;
const failingExecutor = new ExecutionService(
  async (action) => ({ action, signature: "stable-signature" }),
  async () => { broadcastCalls += 1; throw new Error("broadcast timeout; status must be queried"); }
);
const signedOnce = await failingExecutor.signConfirmed(executable);
await assert.rejects(() => failingExecutor.broadcastSignedActions(signedOnce, executable), /status must be queried/);
assert.equal(broadcastCalls, 1);
console.log("domain tests passed");
