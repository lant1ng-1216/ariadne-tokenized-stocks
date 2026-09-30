import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import type { ActionPlan } from "../src/domain/types.js";
import { assessSignedTransactionFee, assertNativeBalanceCoversFee, requireReviewedGasBudget } from "../src/domain/gas-safety.js";

// Public deterministic fixture key; never use with funds.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const target = "0x3333333333333333333333333333333333333333" as const;
const plan: ActionPlan = {
  planId: "gas-budget-test", status: "confirmed", requiresUserConfirmation: false,
  intent: {
    type: "buy", walletAddress: account.address, fromTokenAddress: "0x5555555555555555555555555555555555555555",
    amount: "1", amountDecimals: 6, maxGasCostBnb: "0.0002",
    toAsset: { assetId: "56:test", chainId: "56", platformId: "bstock", contractAddress: "0x6666666666666666666666666666666666666666",
      tokenSymbol: "TESTB", underlyingTicker: "TEST", underlyingName: "Test" }
  }
};
const base = { chainId: 56, to: target, value: 7n, data: "0x1234" as const, nonce: 0, gas: 80_000n };
const legacy = await account.signTransaction({ ...base, type: "legacy", gasPrice: 1_000_000_000n });
const legacyFee = assessSignedTransactionFee(plan, legacy);
assert.equal(legacyFee.maxGasCostWei, 80_000_000_000_000n);
assert.equal(legacyFee.totalNativeCostWei, 80_000_000_000_007n);
assert.doesNotThrow(() => assertNativeBalanceCoversFee(80_000_000_000_007n, legacyFee));
assert.throws(() => assertNativeBalanceCoversFee(80_000_000_000_006n, legacyFee), /BNB balance is insufficient/);

const eip1559 = await account.signTransaction({ ...base, type: "eip1559", maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n });
assert.equal(assessSignedTransactionFee(plan, eip1559).maxGasCostWei, 160_000_000_000_000n);
const eip2930 = await account.signTransaction({ ...base, type: "eip2930", gasPrice: 1_000_000_000n, accessList: [] });
assert.equal(assessSignedTransactionFee(plan, eip2930).maxGasCostWei, 80_000_000_000_000n);
const highFee = await account.signTransaction({ ...base, type: "legacy", gasPrice: 3_000_000_000n });
assert.throws(() => assessSignedTransactionFee(plan, highFee), /exceeds confirmed plan budget/);
assert.throws(() => requireReviewedGasBudget({ ...plan, intent: { ...plan.intent, maxGasCostBnb: undefined } }), /missing a user-reviewed maxGasCostBnb/);
assert.throws(() => assessSignedTransactionFee({ ...plan, intent: { ...plan.intent, maxGasCostBnb: undefined } }, legacy), /missing a user-reviewed maxGasCostBnb/);
assert.throws(() => assessSignedTransactionFee({ ...plan, intent: { ...plan.intent, maxGasCostBnb: "0.0000000000000000001" } }, legacy), /precision/);
console.log(JSON.stringify({ legacyEip2930AndEip1559: true, feeCapAndNativeBalanceRejection: true, broadcasted: false, passed: true }, null, 2));
