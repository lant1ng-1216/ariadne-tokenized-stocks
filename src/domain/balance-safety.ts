import type { ActionPlan } from "./types.js";
import { parseTokenAmount } from "./amount.js";

/** Ensure any reviewed spender/allowance evidence is bound to this exact plan. */
export function assertPlanAuthorizationMatches(plan: ActionPlan): void {
  const allowanceCheck = plan.authorizationCheck;
  if (!allowanceCheck) throw new Error("Plan is missing an explicit ERC-20 authorization assessment");
  if (!allowanceCheck.required) throw new Error("Guarded execution requires an explicit ERC-20 spender");
  const requiredAmount = parseTokenAmount(plan.intent.amount, plan.intent.amountDecimals);
  if (!/^0x[0-9a-fA-F]{40}$/.test(allowanceCheck.tokenAddress) ||
    allowanceCheck.tokenAddress.toLowerCase() !== plan.intent.fromTokenAddress.toLowerCase() ||
    !/^0x[0-9a-fA-F]{40}$/.test(allowanceCheck.spender) ||
    !/^\d+$/.test(allowanceCheck.requiredAmount) || BigInt(allowanceCheck.requiredAmount) !== requiredAmount ||
    (allowanceCheck.reviewedAllowance !== undefined && !/^\d+$/.test(allowanceCheck.reviewedAllowance))) {
    throw new Error("Plan ERC-20 authorization evidence does not match its input token, spender or reviewed amount");
  }
}

/** Fail closed if the allowance changed or was revoked after plan confirmation. */
export function assertAllowanceCoversPlan(plan: ActionPlan, currentAllowance: bigint): void {
  assertPlanAuthorizationMatches(plan);
  const required = BigInt(plan.authorizationCheck!.requiredAmount);
  if (currentAllowance < required) {
    throw new Error(`ERC-20 allowance is now insufficient: ${currentAllowance} < ${required} base units`);
  }
}
