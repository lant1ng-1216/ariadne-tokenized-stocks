import type { ActionPlan, SimulationResult } from "./types.js";
import { evaluateSafety } from "./safety.js";

const requiredPreflightChecks = ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance"];

function hasPassedChecks(plan: ActionPlan, names: string[]): boolean {
  return Boolean(plan.safetyReport?.passed && names.every((name) => plan.safetyReport?.checks.some((check) => check.name === name && check.passed)));
}

function hasReviewableSimulationEvidence(plan: ActionPlan): boolean {
  const simulation = plan.simulation as SimulationResult | undefined;
  const check = plan.safetyReport?.checks.find((entry) => entry.name === "simulation");
  if (simulation?.success === true) return check?.passed === true;
  return simulation?.walletFundsOnlyFailure === true && check?.passed === false && check.severity === "warning";
}

export function isPlanExpired(plan: ActionPlan, now = Date.now()): boolean {
  return plan.expiresAt !== undefined && now >= plan.expiresAt;
}

export function attachSimulation(plan: ActionPlan, simulation: SimulationResult, now = Date.now()): ActionPlan {
  if (isPlanExpired(plan, now)) {
    return { ...plan, status: "failed", simulation, safetyReport: { passed: false, checks: [], blockingReasons: ["The action plan or quote has expired"] } };
  }
  if (!["draft", "awaiting_confirmation"].includes(plan.status)) {
    return { ...plan, status: "failed", simulation, safetyReport: { passed: false, checks: [], blockingReasons: [`Cannot attach a simulation from ${plan.status} state`] } };
  }
  const prior = plan.safetyReport;
  if (!prior || !hasPassedChecks(plan, requiredPreflightChecks)) {
    return { ...plan, status: "failed", simulation, safetyReport: { passed: false, checks: prior?.checks ?? [], blockingReasons: ["Plan is missing successful pre-simulation quote and authorization checks"] } };
  }
  const simulationReport = evaluateSafety({ plan, market: plan.assetContext, simulation });
  const refreshedNames = new Set(simulationReport.checks.map((check) => check.name));
  const checks = [...prior.checks.filter((check) => !refreshedNames.has(check.name)), ...simulationReport.checks];
  const safetyReport = { passed: checks.every((check) => check.passed || check.severity !== "blocking"), checks, blockingReasons: [...prior.blockingReasons, ...simulationReport.blockingReasons] };
  const status = !safetyReport.passed
    ? "failed"
    : simulation.success ? "simulated"
      : simulation.walletFundsOnlyFailure ? "wallet_review" : "failed";
  return { ...plan, simulation, safetyReport, status };
}

export function confirmPlan(plan: ActionPlan, now = Date.now()): ActionPlan {
  if (isPlanExpired(plan, now)) throw new Error("Cannot confirm an expired plan");
  if (!hasPassedChecks(plan, requiredPreflightChecks) || !hasReviewableSimulationEvidence(plan) || !plan.safetyReport?.passed || !["simulated", "wallet_review"].includes(plan.status)) {
    throw new Error("Plan must pass transaction checks or carry an explicit wallet-only funds warning before confirmation");
  }
  return { ...plan, status: "confirmed", requiresUserConfirmation: false };
}

export function assertExecutable(plan: ActionPlan, now = Date.now()): void {
  if (isPlanExpired(plan, now)) throw new Error("Cannot execute an expired plan");
  if (plan.status !== "confirmed" || plan.requiresUserConfirmation) throw new Error("Execution requires explicit confirmation");
  if (!hasPassedChecks(plan, requiredPreflightChecks) || !plan.safetyReport?.passed) throw new Error("Execution blocked by incomplete safety report");
  if (!hasReviewableSimulationEvidence(plan)) throw new Error("Execution requires a successful simulation or an explicit wallet-only funds warning");
}
