import { parseTransaction, recoverTransactionAddress } from "viem";
import type { Hex, TransactionSerialized } from "viem";
import type { ActionPlan, UnsignedAction } from "./types.js";
import { assertExecutable } from "./action-plan.js";

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const hexPattern = /^0x(?:[0-9a-fA-F]{2})*$/;

function sameAddress(left: string, right: string): boolean {
  return addressPattern.test(left) && addressPattern.test(right) && left.toLowerCase() === right.toLowerCase();
}

function plannedValue(value: unknown): bigint {
  if (typeof value !== "string" || !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(value)) {
    throw new Error("Planned transaction value is missing or invalid");
  }
  return BigInt(value);
}

/** Verify an externally signed EVM transaction before a one-time broadcast attempt. */
export async function assertSignedTransactionMatchesPlan(plan: ActionPlan, signedTransaction: string, address: string): Promise<void> {
  assertExecutable(plan);
  if (!sameAddress(address, plan.intent.walletAddress)) throw new Error("Broadcast address does not match the confirmed plan wallet");
  if (!hexPattern.test(signedTransaction) || signedTransaction.length < 20 || signedTransaction.length > 131_072) {
    throw new Error("Signed transaction must be a reasonably sized, complete hex-encoded EVM transaction");
  }
  if (plan.unsignedActions?.length !== 1) throw new Error("Confirmed plan must contain exactly one EVM action");
  const action = plan.unsignedActions[0] as UnsignedAction;
  if (action.kind !== "evm_transaction" || action.quoteId !== plan.quoteId || action.chainId !== plan.intent.toAsset.chainId) {
    throw new Error("Planned action kind, quote or chain does not match the confirmed plan");
  }
  const tx = (action.payload as { tx?: { from?: unknown; to?: unknown; value?: unknown; data?: unknown } })?.tx;
  if (!tx || typeof tx.from !== "string" || typeof tx.to !== "string" || !sameAddress(tx.from, address) || !addressPattern.test(tx.to)) {
    throw new Error("Planned transaction sender or target is invalid");
  }
  const expectedData = tx.data ?? "0x";
  if (typeof expectedData !== "string" || !hexPattern.test(expectedData)) throw new Error("Planned transaction calldata is invalid");
  const expectedValue = plannedValue(tx.value);
  const expectedChainId = Number(plan.intent.toAsset.chainId);
  if (!Number.isSafeInteger(expectedChainId) || expectedChainId <= 0) throw new Error("Planned chain ID is invalid");

  let signed;
  try {
    signed = parseTransaction(signedTransaction as Hex);
  } catch {
    throw new Error("Signed transaction could not be decoded");
  }
  if (!signed.type || !["legacy", "eip2930", "eip1559"].includes(signed.type) || signed.chainId !== expectedChainId) {
    throw new Error("Signed transaction type or chain ID does not match the plan");
  }
  if (!signed.to || !sameAddress(signed.to, tx.to)) throw new Error("Signed transaction target does not match the plan");
  if ((signed.value ?? 0n) !== expectedValue) throw new Error("Signed transaction value does not match the plan");
  if ((signed.data ?? "0x").toLowerCase() !== expectedData.toLowerCase()) throw new Error("Signed transaction calldata does not match the plan");

  let signer: string;
  try {
    signer = await recoverTransactionAddress({ serializedTransaction: signedTransaction as TransactionSerialized });
  } catch {
    throw new Error("Signed transaction signature is missing or invalid");
  }
  if (!sameAddress(signer, address)) throw new Error("Signed transaction signer does not match the confirmed plan wallet");
}
