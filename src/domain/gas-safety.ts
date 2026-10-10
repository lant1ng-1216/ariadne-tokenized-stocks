import { parseTransaction } from "viem";
import type { Hex } from "viem";
import type { ActionPlan } from "./types.js";
import { parseTokenAmount } from "./amount.js";

export type SignedTransactionFee = {
  gasLimit: bigint;
  maxFeePerGasWei: bigint;
  maxGasCostWei: bigint;
  nativeValueWei: bigint;
  reviewedGasBudgetWei: bigint;
};

export function requireReviewedGasBudget(plan: ActionPlan): bigint {
  if (!plan.intent.maxGasCostBnb) throw new Error("Plan is missing a user-reviewed maxGasCostBnb; prepare a new plan with an explicit gas budget");
  return parseTokenAmount(plan.intent.maxGasCostBnb, 18);
}

/** Check the worst-case signed gas spend against the fee budget bound to a confirmed plan. */
export function assessSignedTransactionFee(plan: ActionPlan, signedTransaction: string): SignedTransactionFee {
  const reviewedGasBudgetWei = requireReviewedGasBudget(plan);
  let signed;
  try {
    signed = parseTransaction(signedTransaction as Hex);
  } catch {
    throw new Error("Signed transaction could not be decoded for gas review");
  }
  if (!signed.type || !["legacy", "eip2930", "eip1559"].includes(signed.type)) throw new Error("Unsupported signed transaction type for gas review");
  const gasLimit = signed.gas;
  const maxFeePerGasWei = signed.type === "eip1559" ? signed.maxFeePerGas : signed.gasPrice;
  if (gasLimit === undefined || gasLimit <= 0n || maxFeePerGasWei === undefined || maxFeePerGasWei <= 0n) {
    throw new Error("Signed transaction gas limit or fee cap is missing or invalid");
  }
  if (signed.type === "eip1559" && signed.maxPriorityFeePerGas !== undefined && signed.maxPriorityFeePerGas > maxFeePerGasWei) {
    throw new Error("Signed transaction priority fee exceeds its maximum fee");
  }
  const maxGasCostWei = gasLimit * maxFeePerGasWei;
  if (maxGasCostWei > reviewedGasBudgetWei) throw new Error(`Signed transaction maximum gas cost exceeds confirmed plan budget: ${maxGasCostWei} > ${reviewedGasBudgetWei} wei`);
  const nativeValueWei = signed.value ?? 0n;
  return { gasLimit, maxFeePerGasWei, maxGasCostWei, nativeValueWei, reviewedGasBudgetWei };
}
