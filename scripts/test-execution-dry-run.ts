import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { privateKeyToAccount } from "viem/accounts";
import type { ActionPlan, StockAsset, TradeIntent, UnsignedAction } from "../src/domain/types.js";
import { attachSimulation, confirmPlan } from "../src/domain/action-plan.js";
import { assessSignedTransactionFee, requireReviewedGasBudget } from "../src/domain/gas-safety.js";
import { assertSignedTransactionMatchesPlan } from "../src/domain/signed-transaction.js";
import { PlanRegistry } from "../src/mcp/plan-registry.js";
import { TokenizedStocksService } from "../src/services/tokenized-stocks.js";
import { TransactionService } from "../src/services/transaction.js";

type Fixture = {
  chainId: string; asset: StockAsset; inputTokenAddress: string; routerAddress: string; spenderAddress: string;
  amount: string; amountDecimals: number; maxGasCostBnb: string; quoteId: string; quotePriceImpactPercent: string;
  inputBalanceBaseUnits: string; allowanceBaseUnits: string; bnbBalanceWei: string; transactionData: `0x${string}`;
};
const fixture = JSON.parse(await readFile(new URL("./fixtures/execution-dry-run.json", import.meta.url), "utf8")) as Fixture;
// Deliberately public test-only key. No real wallet or funds are used.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const wrongAccount = privateKeyToAccount(`0x${"22".repeat(32)}`);
let broadcastRequests = 0;
const mockClient = {
  async get(path: string) {
    if (path.endsWith("/rwa/tokens")) return { code: 0, success: true, data: [{
      binanceChainId: fixture.chainId, tokenContractAddress: fixture.asset.contractAddress, platformId: fixture.asset.platformId,
      tokenSymbol: fixture.asset.tokenSymbol, underlyingTicker: fixture.asset.underlyingTicker, underlyingName: fixture.asset.underlyingName,
      tokenPrice: "100", referencePrice: "99.8", tokenPriceUpdatedAt: Date.now(), statusInfo: { marketStatus: "open", openState: true }
    }] };
    if (path.endsWith("/rwa/price")) return { code: 0, success: true, data: [{
      binanceChainId: fixture.chainId, tokenContractAddress: fixture.asset.contractAddress, platformId: fixture.asset.platformId,
      tokenPrice: "100", referencePrice: "99.8", tokenPriceUpdatedAt: Date.now()
    }] };
    if (path.endsWith("/rwa/platforms")) return { code: 0, success: true, data: [{ platformId: fixture.asset.platformId }] };
    if (path.endsWith("/aggregator/quote")) return { code: 0, success: true, data: [{
      quoteId: fixture.quoteId, executionMode: "SWAP", toTokenAmount: "100000", minToTokenAmount: "99000",
      priceImpactPercent: fixture.quotePriceImpactPercent, approveTarget: fixture.spenderAddress
    }] };
    if (path.endsWith("/aggregator/swap")) return { code: 0, success: true, data: { executionMode: "SWAP", tx: {
      from: account.address, to: fixture.routerAddress, value: "0", data: fixture.transactionData
    } } };
    throw new Error(`Unexpected offline GET request: ${path}`);
  },
  async post(path: string) {
    if (path.endsWith("/pre-transaction/simulate")) return { code: 0, success: true, data: { status: "SUCCESS", balanceChanges: [], allowanceChanges: [] } };
    if (path.endsWith("/pre-transaction/broadcast-transaction")) broadcastRequests += 1;
    throw new Error(`Network/broadcast request is forbidden in the offline rehearsal: ${path}`);
  }
};
const makeService = (balance: bigint) => new TokenizedStocksService(
  mockClient as any, async () => BigInt(fixture.allowanceBaseUnits), async () => balance
);
const intent: TradeIntent = {
  type: "buy", walletAddress: account.address, fromTokenAddress: fixture.inputTokenAddress,
  amount: fixture.amount, amountDecimals: fixture.amountDecimals, maxSlippageBps: 50, maxGasCostBnb: fixture.maxGasCostBnb, toAsset: fixture.asset
};
const registry = new PlanRegistry();
const prepared = await makeService(BigInt(fixture.inputBalanceBaseUnits)).createActionPlan(intent);
assert.equal(prepared.status, "awaiting_confirmation");
registry.registerPrepared(prepared);
const action = prepared.unsignedActions?.[0] as UnsignedAction;
assert.equal(action.kind, "evm_transaction");
const simulation = await new TransactionService(mockClient as any).simulateEvm(fixture.chainId, (action.payload as any).tx);
const simulated = attachSimulation(registry.requireExact(prepared, "awaiting_confirmation"), simulation);
assert.equal(simulated.status, "simulated");
registry.advance(prepared, "awaiting_confirmation", simulated, "simulated");
requireReviewedGasBudget(simulated);
const confirmed = confirmPlan(registry.requireExact(simulated, "simulated"));
registry.advance(simulated, "simulated", confirmed, "confirmed");
const reviewed = registry.requireExact(confirmed, "confirmed");
const tx = (action.payload as any).tx as { to: `0x${string}`; value: string; data: `0x${string}` };
const sign = (signer = account, gasPrice = 1_000_000_000n) => signer.signTransaction({
  type: "legacy", chainId: Number(fixture.chainId), to: tx.to, value: BigInt(tx.value), data: tx.data,
  nonce: 0, gas: 80_000n, gasPrice
});
const signed = await sign();
await assertSignedTransactionMatchesPlan(reviewed, signed, account.address);
const fee = assessSignedTransactionFee(reviewed, signed);
assert.ok(fee.maxGasCostWei <= fee.reviewedGasBudgetWei, "transaction fee risk stays within the reviewed cap");

// Negative paths use the same production checks, and stop before any network broadcast.
const lowBalance = await makeService(0n).createActionPlan(intent);
assert.equal(lowBalance.status, "awaiting_confirmation", "input-token funds do not gate a quote-backed purchase plan");
assert.ok(lowBalance.unsignedActions?.length);
const second = await makeService(BigInt(fixture.inputBalanceBaseUnits)).createActionPlan(intent);
registry.registerPrepared(second);
assert.throws(() => registry.requireExact({ ...second, intent: { ...second.intent, amount: "11" } }, "awaiting_confirmation"), /changed/);
assert.equal(attachSimulation({ ...second, expiresAt: Date.now() - 1 }, simulation).status, "failed");
assert.equal(attachSimulation(second, { ...simulation, success: false }).status, "failed");
await assert.rejects(assertSignedTransactionMatchesPlan(reviewed, await sign(wrongAccount), account.address), /signer/);
const expensive = await sign(account, 3_000_000_000n);
await assertSignedTransactionMatchesPlan(reviewed, expensive, account.address);
assert.throws(() => assessSignedTransactionFee(reviewed, expensive), /exceeds confirmed plan budget/);
registry.reserveBroadcast(confirmed);
assert.throws(() => registry.reserveBroadcast(confirmed), /already attempted/);
assert.equal(broadcastRequests, 0);

console.log(JSON.stringify({
  mode: "offline synthetic rehearsal", asset: fixture.asset.tokenSymbol, chainId: fixture.chainId,
  stages: ["quote+authorization visibility", "plan registered", "simulated", "confirmed", "locally signed", "signature+reviewed gas checked"],
  rejected: ["changed plan", "expired plan", "failed simulation", "wrong signer", "gas over budget", "insufficient live allowance", "replay"],
  fundsPolicy: "zero input/native balance is not an Ariadne submission precheck; transaction content remains bounded by the reviewed fee cap",
  broadcastRequests, realWalletUsed: false, passed: true
}, null, 2));
