import assert from "node:assert/strict";
import { serializeTransaction } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ActionPlan, SafetyCheck } from "../src/domain/types.js";
import { assertSignedTransactionMatchesPlan } from "../src/domain/signed-transaction.js";

// Deliberately public, deterministic test key. Never use it for funds.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const otherAccount = privateKeyToAccount(`0x${"22".repeat(32)}`);
const target = "0x3333333333333333333333333333333333333333";
const otherTarget = "0x4444444444444444444444444444444444444444";
const checks: SafetyCheck[] = ["asset_identity", "quote_available", "price_impact", "authorization_visibility", "input_balance", "simulation"]
  .map((name) => ({ name, passed: true, severity: "blocking", message: "offline fixture" }));
const plan: ActionPlan = {
  planId: "signed-transaction-offline-test",
  status: "confirmed",
  intent: {
    type: "buy", walletAddress: account.address, fromTokenAddress: "0x5555555555555555555555555555555555555555",
    amount: "1", amountDecimals: 6,
    toAsset: { assetId: "56:0x6666666666666666666666666666666666666666", chainId: "56", platformId: "bstock",
      contractAddress: "0x6666666666666666666666666666666666666666", tokenSymbol: "TESTB", underlyingTicker: "TEST", underlyingName: "Test" }
  },
  quoteId: "offline-quote",
  unsignedActions: [{ kind: "evm_transaction", chainId: "56", quoteId: "offline-quote", payload: { tx: { from: account.address, to: target, value: "7", data: "0x1234" } } }],
  simulation: { success: true, balanceChanges: [], allowanceChanges: [], warnings: [] },
  safetyReport: { passed: true, checks, blockingReasons: [] },
  expiresAt: Date.now() + 60_000,
  requiresUserConfirmation: false
};

async function sign(overrides: { chainId?: number; to?: `0x${string}`; value?: bigint; data?: `0x${string}` } = {}, signer = account, type: "legacy" | "eip1559" = "legacy") {
  const common = { chainId: 56, to: target as `0x${string}`, value: 7n, data: "0x1234" as `0x${string}`, nonce: 0, gas: 80_000n, ...overrides };
  return type === "legacy"
    ? signer.signTransaction({ ...common, type: "legacy", gasPrice: 1_000_000_000n })
    : signer.signTransaction({ ...common, type: "eip1559", maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n });
}

await assertSignedTransactionMatchesPlan(plan, await sign(), account.address);
await assertSignedTransactionMatchesPlan(plan, await sign({}, account, "eip1559"), account.address);
for (const [label, raw, message] of [
  ["chain", await sign({ chainId: 1 }), /chain ID/],
  ["target", await sign({ to: otherTarget }), /target/],
  ["value", await sign({ value: 8n }), /value/],
  ["calldata", await sign({ data: "0x5678" }), /calldata/],
  ["signer", await sign({}, otherAccount), /signer/]
] as const) {
  await assert.rejects(assertSignedTransactionMatchesPlan(plan, raw, account.address), message, label);
}
await assert.rejects(assertSignedTransactionMatchesPlan(plan, "0xnot-hex", account.address), /hex-encoded/);
const unsigned = serializeTransaction({ type: "legacy", chainId: 56, to: target, value: 7n, data: "0x1234", nonce: 0, gas: 80_000n, gasPrice: 1_000_000_000n });
await assert.rejects(assertSignedTransactionMatchesPlan(plan, unsigned, account.address), /signature/);
await assert.rejects(assertSignedTransactionMatchesPlan(plan, await sign(), otherAccount.address), /Broadcast address/);
await assert.rejects(assertSignedTransactionMatchesPlan({ ...plan, status: "simulated" }, await sign(), account.address), /confirmation/);
console.log(JSON.stringify({
  validTransactionTypes: ["legacy", "eip1559"],
  rejectedMismatches: ["chainId", "target", "value", "calldata", "recoveredSigner", "malformedEncoding", "unsignedTransaction", "expectedAddress", "unconfirmedPlan"],
  broadcasted: false,
  passed: true
}, null, 2));
