import type { ActionPlan, SimulationResult } from "./types.js";
import { evaluateSafety } from "./safety.js";

const requiredPreflightChecks = ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance"];
const requiredExecutionChecks = [...requiredPreflightChecks, "simulation"];

function hasPassedChecks(plan: ActionPlan, names: string[]): boolean {
  return Boolean(plan.safetyReport?.passed && names.every((name) => plan.safetyReport?.checks.some((check) => check.name === name && check.passed)));
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
  return { ...plan, simulation, safetyReport, status: safetyReport.passed && simulation.success ? "simulated" : "failed" };
}

export function confirmPlan(plan: ActionPlan, now = Date.now()): ActionPlan {
  if (isPlanExpired(plan, now)) throw new Error("Cannot confirm an expired plan");
  if (!hasPassedChecks(plan, requiredExecutionChecks) || plan.status !== "simulated") throw new Error("Plan must pass simulation and safety checks before confirmation");
  return { ...plan, status: "confirmed", requiresUserConfirmation: false };
}

export function assertExecutable(plan: ActionPlan, now = Date.now()): void {
  if (isPlanExpired(plan, now)) throw new Error("Cannot execute an expired plan");
  if (plan.status !== "confirmed" || plan.requiresUserConfirmation) throw new Error("Execution requires explicit confirmation");
  if (!hasPassedChecks(plan, requiredExecutionChecks)) throw new Error("Execution blocked by incomplete safety report");
  if (!plan.simulation || (plan.simulation as SimulationResult).success !== true) throw new Error("Execution requires a successful simulation");
}
