import type { ActionPlan, SimulationResult } from "./types.js";
import { evaluateSafety } from "./safety.js";

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
  const safetyReport = evaluateSafety({ plan, market: plan.assetContext, simulation });
  return { ...plan, simulation, safetyReport, status: safetyReport.passed && simulation.success ? "simulated" : "failed" };
}

export function confirmPlan(plan: ActionPlan, confirmationToken: string, now = Date.now()): ActionPlan {
  if (!confirmationToken || confirmationToken !== plan.planId) throw new Error("Invalid confirmation token");
  if (isPlanExpired(plan, now)) throw new Error("Cannot confirm an expired plan");
  if (!plan.safetyReport?.passed || plan.status !== "simulated") throw new Error("Plan must pass simulation and safety checks before confirmation");
  return { ...plan, status: "confirmed", requiresUserConfirmation: false };
}

export function assertExecutable(plan: ActionPlan, now = Date.now()): void {
  if (isPlanExpired(plan, now)) throw new Error("Cannot execute an expired plan");
  if (plan.status !== "confirmed" || plan.requiresUserConfirmation) throw new Error("Execution requires explicit confirmation");
  if (!plan.safetyReport?.passed) throw new Error("Execution blocked by safety report");
  if (!plan.simulation || (plan.simulation as SimulationResult).success !== true) throw new Error("Execution requires a successful simulation");
}
