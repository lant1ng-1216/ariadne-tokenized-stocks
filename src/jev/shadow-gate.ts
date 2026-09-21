import { evaluateBaseline } from "./baseline.js";
import { evaluateWithJev } from "./jev-client.js";
import type { GateEvidence, ShadowDecisionRecord } from "./types.js";

export async function runShadowGate(evidence: GateEvidence): Promise<ShadowDecisionRecord> {
  const startedAt = Date.now();
  const baseline = evaluateBaseline(evidence);
  let jev;
  try {
    jev = await evaluateWithJev(evidence);
  } catch (error) {
    jev = undefined;
    console.warn(`Jev shadow call unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    recordedAt: new Date().toISOString(),
    mode: "shadow",
    evidence,
    baseline,
    jev,
    agreement: jev ? baseline.status === jev.status && baseline.nextAction === jev.nextAction : undefined,
    durationMs: Date.now() - startedAt,
    phaseTransition: canAdvance(evidence, baseline, jev) ? "advance" : "pause",
    transitionReason: transitionReason(evidence, baseline, jev),
    provider: jev ? (process.env.JEV_AGENT_KEY ? "native-jev" : "vercel-ai-gateway") : "deterministic-fallback",
    actionTaken: "none",
  };
}

function canAdvance(evidence: GateEvidence, baseline: ShadowDecisionRecord["baseline"], jev: ShadowDecisionRecord["jev"]): boolean {
  return Boolean(
    jev &&
    baseline.status === "passed" &&
    baseline.nextAction === "continue" &&
    baseline.riskLevel === "low" &&
    jev.status === "passed" &&
    jev.nextAction === "continue" &&
    jev.riskLevel === "low" &&
    jev.confidence >= Number(process.env.JEV_MIN_CONFIDENCE ?? "0.85") &&
    evidence.externalWriteRequested === false &&
    evidence.highRiskActionRequested === false,
  );
}

function transitionReason(evidence: GateEvidence, baseline: ShadowDecisionRecord["baseline"], jev: ShadowDecisionRecord["jev"]): string {
  if (!jev) return "Jev unavailable; remain paused and use the deterministic result for observation only.";
  if (baseline.status !== "passed" || jev.status !== "passed") return "Both baseline and Jev must return passed.";
  if (baseline.nextAction !== "continue" || jev.nextAction !== "continue") return "Both baseline and Jev must authorize low-risk continuation.";
  if (baseline.riskLevel !== "low" || jev.riskLevel !== "low") return "High or medium risk requires a pause.";
  if (evidence.externalWriteRequested || evidence.highRiskActionRequested) return "External or high-risk action requires a pause.";
  if (jev.confidence < Number(process.env.JEV_MIN_CONFIDENCE ?? "0.85")) return "Jev confidence is below the configured threshold.";
  return "Baseline and Jev agree on a low-risk continuation.";
}
