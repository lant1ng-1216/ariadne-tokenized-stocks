import type { ActionPlan } from "./types.js";
import { parseTokenAmount } from "./amount.js";

/** Recheck the exact input-token amount just before the broadcast boundary. */
export function assertInputBalanceCoversPlan(plan: ActionPlan, currentBalance: bigint): void {
  const requiredBalance = parseTokenAmount(plan.intent.amount, plan.intent.amountDecimals);
  if (currentBalance < requiredBalance) {
    throw new Error(`Input-token balance is now insufficient: ${currentBalance} < ${requiredBalance} base units`);
  }
}

/** Ensure any reviewed spender/allowance evidence is bound to this exact plan. */
export function assertPlanAuthorizationMatches(plan: ActionPlan): void {
  const allowanceCheck = plan.authorizationCheck;
  const authorizationMessage = plan.safetyReport?.checks.find((check) => check.name === "authorization_visibility")?.message ?? "";
  if (!allowanceCheck) throw new Error("Plan is missing an explicit ERC-20 authorization assessment");
  if (!allowanceCheck.required) throw new Error("Guarded execution requires an explicit ERC-20 spender");
  const declaredSpender = authorizationMessage.match(/ERC-20 allowance is sufficient, spender=(0x[0-9a-fA-F]{40})/i)?.[1];
  const requiredAmount = parseTokenAmount(plan.intent.amount, plan.intent.amountDecimals);
  if (!/^0x[0-9a-fA-F]{40}$/.test(allowanceCheck.tokenAddress) ||
    allowanceCheck.tokenAddress.toLowerCase() !== plan.intent.fromTokenAddress.toLowerCase() ||
    !/^0x[0-9a-fA-F]{40}$/.test(allowanceCheck.spender) ||
    !declaredSpender || allowanceCheck.spender.toLowerCase() !== declaredSpender.toLowerCase() ||
    !/^\d+$/.test(allowanceCheck.requiredAmount) || BigInt(allowanceCheck.requiredAmount) !== requiredAmount ||
    !/^\d+$/.test(allowanceCheck.reviewedAllowance) || BigInt(allowanceCheck.reviewedAllowance) < requiredAmount) {
    throw new Error("Plan ERC-20 allowance evidence does not match its input, spender or reviewed amount");
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
