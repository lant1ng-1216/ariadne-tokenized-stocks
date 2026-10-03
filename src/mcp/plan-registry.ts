import { isDeepStrictEqual } from "node:util";
import type { ActionPlan } from "../domain/types.js";
import { isPlanExpired } from "../domain/action-plan.js";
import { assertPlanAuthorizationMatches } from "../domain/balance-safety.js";
import { jsonDataSnapshot } from "../domain/json-snapshot.js";

type PlanStage = "awaiting_confirmation" | "simulated" | "confirmed";
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

  advance(submitted: ActionPlan, from: PlanStage, next: ActionPlan, to: PlanStage): void {
    const allowedTransition = (from === "awaiting_confirmation" && to === "simulated") || (from === "simulated" && to === "confirmed");
    if (!allowedTransition) throw new Error(`Invalid plan stage transition: ${from} -> ${to}`);
    const trusted = this.requireExact(submitted, from);
    const transition = snapshot(next);
    if (transition.planId !== trusted.planId || transition.status !== to || !isDeepStrictEqual(transition.intent, trusted.intent) ||
      !isDeepStrictEqual(transition.unsignedActions, trusted.unsignedActions) || transition.quoteId !== trusted.quoteId ||
      transition.expiresAt !== trusted.expiresAt || !isDeepStrictEqual(transition.approvalRequired, trusted.approvalRequired) ||
      !isDeepStrictEqual(transition.authorizationCheck, trusted.authorizationCheck)) {
      throw new Error("Plan identity, quote, amount or authorization changed during a stage transition");
    }
    const requiredChecks = to === "simulated"
      ? ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance", "simulation"]
      : ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance", "simulation"];
    const checksPassed = requiredChecks.every((name) => transition.safetyReport?.checks.some((check) => check.name === name && check.passed));
    if (!transition.safetyReport?.passed || !checksPassed ||
      (to === "simulated" && (transition.simulation as { success?: boolean } | undefined)?.success !== true) ||
      (to === "confirmed" && (transition.requiresUserConfirmation || (transition.simulation as { success?: boolean } | undefined)?.success !== true))) {
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
}
