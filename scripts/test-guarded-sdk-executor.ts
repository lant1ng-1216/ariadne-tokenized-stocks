import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import type { ActionPlan } from "../src/domain/types.js";
import { GuardedEvmExecutionService } from "../src/services/guarded-evm-executor.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";

// Public deterministic fixture key only; no user wallet, network signing or chain broadcast.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const wrongAccount = privateKeyToAccount(`0x${"22".repeat(32)}`);
const target = "0x3333333333333333333333333333333333333333" as const;
const inputToken = "0x5555555555555555555555555555555555555555";
const stockToken = "0x6666666666666666666666666666666666666666";

const preparedClient = {
  async get(path: string) {
    if (path.endsWith("/rwa/platforms")) return { data: [{ platformId: "bstock", name: "bStocks", website: "https://example.invalid" }] };
    if (path.endsWith("/rwa/tokens")) return { data: [{
      binanceChainId: "56", tokenContractAddress: stockToken, platformId: "bstock", tokenSymbol: "TESTB",
      underlyingTicker: "TEST", underlyingName: "Synthetic Test", tokenPrice: "1", tokenPriceUpdatedAt: Date.now(),
      statusInfo: { marketStatus: "open", openState: true }
    }] };
    if (path.endsWith("/rwa/price")) return { data: [{
      binanceChainId: "56", tokenContractAddress: stockToken, platformId: "bstock", tokenPrice: "1",
      referencePrice: "1", tokenPriceUpdatedAt: Date.now()
    }] };
    if (path.endsWith("/aggregator/quote")) return { code: 0, success: true, data: [{
      quoteId: "synthetic-quote", executionMode: "SWAP", toTokenAmount: "1000000", minToTokenAmount: "990000",
      priceImpactPercent: "0.1", approveTarget: target
    }] };
    if (path.endsWith("/aggregator/swap")) return { code: 0, success: true, data: { executionMode: "SWAP", tx: { from: account.address, to: target, value: "0", data: "0x1234" } } };
    throw new Error(`Unexpected guarded SDK fixture GET: ${path}`);
  }
};

async function preparedPlan(): Promise<ActionPlan> {
  const plan = await new TokenizedStocksService(preparedClient as any, async () => 2_000_000n, async () => 2_000_000n).createActionPlan({
    type: "buy", walletAddress: account.address, fromTokenAddress: inputToken,
    amount: "1", amountDecimals: 6, maxGasCostBnb: "0.0002",
    toAsset: { assetId: `56:${stockToken}`, chainId: "56", platformId: "bstock", contractAddress: stockToken,
      tokenSymbol: "TESTB", underlyingTicker: "TEST", underlyingName: "Synthetic Test" }
  });
  assert.equal(plan.status, "awaiting_confirmation", `fixture plan must come from the actual SDK preparation flow: ${JSON.stringify(plan.safetyReport)}`);
  return plan;
}

function createService(balances: { native?: bigint; input?: bigint; allowance?: bigint } = {}) {
  const calls = { simulate: 0, nativeBalance: 0, inputBalance: 0, allowance: 0, mockedBroadcast: 0, networkBroadcasts: 0 };
  const service = new GuardedEvmExecutionService({
    async simulateEvm() {
      calls.simulate += 1;
      return { success: true, status: "SUCCESS", balanceChanges: [], allowanceChanges: [], warnings: [] };
    },
    async nativeBalance() { calls.nativeBalance += 1; return balances.native ?? 1_000_000_000_000_000n; },
    async erc20Balance() { calls.inputBalance += 1; return balances.input ?? 2_000_000n; },
    async erc20Allowance() { calls.allowance += 1; return balances.allowance ?? 2_000_000n; },
    async broadcastSigned() { calls.mockedBroadcast += 1; return { txHash: "0xsynthetic-only" }; }
  } as any);
  return { service, calls };
}

async function signTestTransaction(
  overrides: { chainId?: number; to?: `0x${string}`; value?: bigint; data?: `0x${string}`; gasPrice?: bigint } = {},
  signer = account,
) {
  return signer.signTransaction({
    type: "legacy",
    chainId: overrides.chainId ?? 56,
    to: overrides.to ?? target,
    value: overrides.value ?? 0n,
    data: overrides.data ?? "0x1234",
    nonce: 0,
    gas: 80_000n,
    gasPrice: overrides.gasPrice ?? 1_000_000_000n,
  });
}

async function prepareAndConfirm(service: GuardedEvmExecutionService, plan: ActionPlan): Promise<ActionPlan> {
  service.registerPrepared(plan);
  const simulated = await service.simulate(plan);
  assert.equal(simulated.status, "simulated");
  return service.confirm(simulated);
}

const { service, calls } = createService();
const plan = await preparedPlan();
const confirmed = await prepareAndConfirm(service, plan);
const signedTransaction = await signTestTransaction();
await assert.rejects(service.broadcastSigned({ ...confirmed, quoteId: "changed-quote" }, signedTransaction), /changed or is not at the required stage/);
const result = await service.broadcastSigned(confirmed, signedTransaction);
assert.deepEqual(result, { txHash: "0xsynthetic-only" });
assert.deepEqual(calls, { simulate: 1, nativeBalance: 1, inputBalance: 1, allowance: 1, mockedBroadcast: 1, networkBroadcasts: 0 });
await assert.rejects(service.broadcastSigned(confirmed, signedTransaction), /already attempted/);
assert.equal(calls.mockedBroadcast, 1, "the same plan cannot call the broadcaster twice");

for (const [label, overrides, expectedError] of [
  ["chainId", { chainId: 1 }, /chain ID/],
  ["target", { to: "0x7777777777777777777777777777777777777777" }, /target/],
  ["value", { value: 1n }, /value/],
  ["calldata", { data: "0xabcd" }, /calldata/],
] as const) {
  const attempt = createService();
  const confirmedPlan = await prepareAndConfirm(attempt.service, await preparedPlan());
  await assert.rejects(attempt.service.broadcastSigned(confirmedPlan, await signTestTransaction(overrides)), expectedError, label);
  assert.equal(attempt.calls.mockedBroadcast, 0, `${label} mismatch must be rejected before the broadcaster`);
}

const insufficient = createService({ input: 0n });
const insufficientPlan = await prepareAndConfirm(insufficient.service, await preparedPlan());
await assert.rejects(insufficient.service.broadcastSigned(insufficientPlan, signedTransaction), /input-token balance is now insufficient/i);
assert.equal(insufficient.calls.mockedBroadcast, 0);

const revokedAllowance = createService({ allowance: 0n });
const revokedAllowancePlan = await prepareAndConfirm(revokedAllowance.service, await preparedPlan());
await assert.rejects(revokedAllowance.service.broadcastSigned(revokedAllowancePlan, signedTransaction), /allowance is now insufficient/i);
assert.equal(revokedAllowance.calls.allowance, 1, "allowance is re-read immediately before broadcast");
assert.equal(revokedAllowance.calls.mockedBroadcast, 0, "a revoked allowance must not reach the broadcaster");

const wrongSigner = createService();
const wrongSignerPlan = await prepareAndConfirm(wrongSigner.service, await preparedPlan());
const wrongSignedTransaction = await signTestTransaction({}, wrongAccount);
await assert.rejects(wrongSigner.service.broadcastSigned(wrongSignerPlan, wrongSignedTransaction), /signer/);
assert.equal(wrongSigner.calls.mockedBroadcast, 0);

const overBudget = createService();
const overBudgetPlan = await prepareAndConfirm(overBudget.service, await preparedPlan());
const expensiveSignedTransaction = await signTestTransaction({ gasPrice: 3_000_000_000n });
await assert.rejects(overBudget.service.broadcastSigned(overBudgetPlan, expensiveSignedTransaction), /exceeds confirmed plan budget/);
assert.equal(overBudget.calls.mockedBroadcast, 0);

const forgedRegistration = createService();
const issuedPlan = await preparedPlan();
assert.throws(() => forgedRegistration.service.registerPrepared(structuredClone(issuedPlan)), /unchanged plan object returned by SDK preparation/i);
const alteredIssuedPlan = await preparedPlan();
alteredIssuedPlan.authorizationCheck!.spender = "0x4444444444444444444444444444444444444444";
assert.throws(() => forgedRegistration.service.registerPrepared(alteredIssuedPlan), /unchanged plan object returned by SDK preparation/i);
const hookedPlan = await preparedPlan();
let toJsonCalls = 0;
Object.defineProperty(hookedPlan, "toJSON", { value() { toJsonCalls += 1; return hookedPlan; }, enumerable: false });
assert.throws(() => forgedRegistration.service.registerPrepared(hookedPlan), /plain JSON data/i);
assert.equal(toJsonCalls, 0, "validation must reject serialization hooks without executing them");
const proxiedPlan = await preparedPlan();
let proxyTrapCalls = 0;
proxiedPlan.authorizationCheck = new Proxy(proxiedPlan.authorizationCheck!, {
  getPrototypeOf(targetObject) { proxyTrapCalls += 1; return Reflect.getPrototypeOf(targetObject); },
  ownKeys(targetObject) { proxyTrapCalls += 1; return Reflect.ownKeys(targetObject); },
  getOwnPropertyDescriptor(targetObject, property) { proxyTrapCalls += 1; return Reflect.getOwnPropertyDescriptor(targetObject, property); }
});
assert.throws(() => forgedRegistration.service.registerPrepared(proxiedPlan), /plain JSON data/i);
assert.equal(proxyTrapCalls, 0, "proxy traps must not execute during plan validation");

console.log(JSON.stringify({
  explicitSimulationAndConfirmation: true,
  externalTestKeyOnly: true,
  signatureAndGasValidationBeforeBroadcast: true,
  transactionFieldMismatchesRejectedBeforeBroadcast: ["chainId", "target", "value", "calldata"],
  latestBalancesChecked: true,
  allowanceRecheckedBeforeBroadcast: true,
  handBuiltOrModifiedPlanRejected: true,
  serializationHooksRejectedWithoutExecution: true,
  proxyObjectsRejectedWithoutTraps: true,
  alteredPlanWrongSignerAndOverBudgetRejected: true,
  duplicateBroadcastRejected: true,
  networkBroadcasts: 0,
  mockedBroadcastCallbacks: calls.mockedBroadcast,
  passed: true
}, null, 2));
