import { isDeepStrictEqual } from "node:util";
import type { ActionPlan } from "../domain/types.js";
import { isPlanExpired } from "../domain/action-plan.js";
import { assertPlanAuthorizationMatches } from "../domain/balance-safety.js";
import { jsonDataSnapshot } from "../domain/json-snapshot.js";
import { parseTokenAmount } from "../domain/amount.js";

type PlanStage = "awaiting_confirmation" | "simulated" | "wallet_review" | "confirmed";
type PlanRecord = { stage: PlanStage; plan: ActionPlan; broadcastAttempted: boolean };
const requiredPreflightChecks = ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance"];

function snapshot(plan: ActionPlan): ActionPlan {
  // Use a hook-free plain-data clone so a stateful toJSON/getter cannot alter
  // security-relevant fields between validation and registry storage.
  return jsonDataSnapshot(plan);
}

/** Process-local, fail-closed binding between an MCP plan and its reviewed stages. */
export class PlanRegistry {
  private readonly records = new Map<string, PlanRecord>();
  private readonly continuationAuthorizations = new Map<string, ActionPlan>();

  registerPrepared(plan: ActionPlan): void {
    const prepared = snapshot(plan);
    const checksPassed = requiredPreflightChecks.every((name) => prepared.safetyReport?.checks.some((check) => check.name === name && check.passed));
    if (prepared.status !== "awaiting_confirmation" || !prepared.safetyReport?.passed || !checksPassed || !prepared.unsignedActions?.length || !prepared.expiresAt || isPlanExpired(prepared)) {
      throw new Error("Only a non-expired, safety-checked prepared plan can be registered");
    }
    assertPlanAuthorizationMatches(prepared);
    if (this.records.has(prepared.planId)) throw new Error("Plan ID has already been registered");
    for (const [id, record] of this.records) if (isPlanExpired(record.plan)) this.records.delete(id);
    if (this.records.size >= 1000) throw new Error("Too many active plans; wait for plans to expire");
    this.records.set(prepared.planId, { stage: "awaiting_confirmation", plan: prepared, broadcastAttempted: false });
  }

  requireExact(submitted: ActionPlan, stage: PlanStage): ActionPlan {
    const candidate = snapshot(submitted);
    const record = this.records.get(candidate?.planId);
    if (!record) throw new Error("Plan was not created in this MCP session; prepare a new plan");
    if (isPlanExpired(record.plan)) {
      this.records.delete(candidate.planId);
      throw new Error("Plan has expired; prepare a new quote and plan");
    }
    if (record.stage !== stage || !isDeepStrictEqual(candidate, record.plan)) {
      throw new Error("Plan was changed or is not at the required stage; prepare a new plan");
    }
    return snapshot(record.plan);
  }

  requireById(planId: string, stage: PlanStage): ActionPlan {
    const record = this.records.get(planId);
    if (!record) throw new Error("Plan was not created in this MCP session; prepare a new plan");
    return this.requireExact(record.plan, stage);
  }

  /** Read the original intent/baseline for status reconciliation even after its short quote TTL. */
  readStoredPlan(planId: string): ActionPlan | undefined {
    const record = this.records.get(planId);
    return record ? snapshot(record.plan) : undefined;
  }

  captureConfirmedContinuation(planId: string): ActionPlan {
    const confirmed = this.requireById(planId, "confirmed");
    if (confirmed.intent.maxSlippageBps === undefined || !confirmed.intent.maxGasCostBnb || !confirmed.minimumOutput ||
      !confirmed.verifiedTokens || !confirmed.authorizationCheck?.spender || confirmed.executionMode !== "SWAP") {
      throw new Error("The confirmed plan lacks the explicit minimum output, token identities, spender, slippage or gas cap needed for same-plan continuation");
    }
    if (this.continuationAuthorizations.size >= 1_000) throw new Error("Too many active purchase continuations; wait for older reviews to expire");
    const copy = snapshot(confirmed);
    this.continuationAuthorizations.set(planId, copy);
    return snapshot(copy);
  }

  registerConfirmedContinuation(parentPlanId: string, submitted: ActionPlan): ActionPlan {
    const parent = this.continuationAuthorizations.get(parentPlanId);
    if (!parent) throw new Error("This purchase continuation was not authorized by a confirmed plan in the current MCP session");
    const child = this.requireExact(submitted, "confirmed");
    const sameIntent = child.intent.walletAddress.toLowerCase() === parent.intent.walletAddress.toLowerCase() &&
      child.intent.fromTokenAddress.toLowerCase() === parent.intent.fromTokenAddress.toLowerCase() &&
      child.intent.amount === parent.intent.amount && child.intent.amountDecimals === parent.intent.amountDecimals &&
      child.intent.toAsset.chainId === parent.intent.toAsset.chainId && child.intent.toAsset.platformId === parent.intent.toAsset.platformId &&
      child.intent.toAsset.contractAddress.toLowerCase() === parent.intent.toAsset.contractAddress.toLowerCase() &&
      child.intent.maxSlippageBps === parent.intent.maxSlippageBps &&
      child.authorizationCheck?.spender.toLowerCase() === parent.authorizationCheck?.spender.toLowerCase() &&
      child.verifiedTokens?.input.contractAddress.toLowerCase() === parent.verifiedTokens?.input.contractAddress.toLowerCase() &&
      child.verifiedTokens?.output.contractAddress.toLowerCase() === parent.verifiedTokens?.output.contractAddress.toLowerCase();
    const gasWithinOriginalCap = Boolean(parent.intent.maxGasCostBnb && child.intent.maxGasCostBnb &&
      parseTokenAmount(child.intent.maxGasCostBnb, 18) <= parseTokenAmount(parent.intent.maxGasCostBnb, 18));
    if (!sameIntent || !gasWithinOriginalCap || !parent.minimumOutput || !child.minimumOutput || BigInt(child.minimumOutput) < BigInt(parent.minimumOutput)) {
      throw new Error("The refreshed purchase changed a confirmed identity or exceeded its original minimum-output or gas boundary");
    }
    this.continuationAuthorizations.delete(parentPlanId);
    return snapshot(child);
  }

  advance(submitted: ActionPlan, from: PlanStage, next: ActionPlan, to: PlanStage): void {
    const allowedTransition = (from === "awaiting_confirmation" && (to === "simulated" || to === "wallet_review")) ||
      ((from === "simulated" || from === "wallet_review") && to === "confirmed");
    if (!allowedTransition) throw new Error(`Invalid plan stage transition: ${from} -> ${to}`);
    const trusted = this.requireExact(submitted, from);
    const transition = snapshot(next);
    if (transition.planId !== trusted.planId || transition.status !== to || !isDeepStrictEqual(transition.intent, trusted.intent) ||
      !isDeepStrictEqual(transition.unsignedActions, trusted.unsignedActions) || transition.quoteId !== trusted.quoteId ||
      transition.expectedOutput !== trusted.expectedOutput || transition.minimumOutput !== trusted.minimumOutput || transition.executionMode !== trusted.executionMode ||
      !isDeepStrictEqual(transition.verifiedTokens, trusted.verifiedTokens) || !isDeepStrictEqual(transition.estimatedFees, trusted.estimatedFees) ||
      transition.expiresAt !== trusted.expiresAt || !isDeepStrictEqual(transition.approvalRequired, trusted.approvalRequired) ||
      !isDeepStrictEqual(transition.authorizationCheck, trusted.authorizationCheck)) {
      throw new Error("Plan identity, quote, amount or authorization changed during a stage transition");
    }
    const preflightChecks = ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance"];
    const checksPassed = preflightChecks.every((name) => transition.safetyReport?.checks.some((check) => check.name === name && check.passed));
    const simulationCheck = transition.safetyReport?.checks.find((check) => check.name === "simulation");
    const simulation = transition.simulation as { success?: boolean; walletFundsOnlyFailure?: boolean } | undefined;
    const simulationEvidenceValid = simulation?.success === true
      ? simulationCheck?.passed === true
      : simulation?.walletFundsOnlyFailure === true && simulationCheck?.passed === false && simulationCheck.severity === "warning";
    if (!transition.safetyReport?.passed || !checksPassed ||
      (to === "simulated" && (simulation?.success !== true || !simulationEvidenceValid)) ||
      (to === "wallet_review" && (simulation?.success === true || !simulationEvidenceValid)) ||
      (to === "confirmed" && (transition.requiresUserConfirmation || !simulationEvidenceValid))) {
      throw new Error("Plan transition is missing successful safety checks or explicit confirmation");
    }
    if (to === "confirmed") {
      if (isPlanExpired(transition)) throw new Error("Cannot confirm an expired plan");
    }
    this.records.set(trusted.planId, { stage: to, plan: transition, broadcastAttempted: false });
  }

  reserveBroadcast(submitted: ActionPlan): ActionPlan {
    const trusted = this.requireExact(submitted, "confirmed");
    const record = this.records.get(trusted.planId)!;
    if (record.broadcastAttempted) throw new Error("Broadcast already attempted; check chain or order status before any retry");
    record.broadcastAttempted = true;
    return trusted;
  }

  reserveBroadcastById(planId: string): ActionPlan {
    return this.reserveBroadcast(this.requireById(planId, "confirmed"));
  }

  requireBroadcasted(planId: string): ActionPlan {
    const record = this.records.get(planId);
    if (!record || record.stage !== "confirmed" || !record.broadcastAttempted) throw new Error("No broadcast attempt is registered for this plan in the current MCP session");
    return snapshot(record.plan);
  }
}
