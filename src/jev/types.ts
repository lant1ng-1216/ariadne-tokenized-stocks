export type GateStatus = "passed" | "passed_with_deferred_items" | "needs_rework" | "blocked";
export type NextAction = "continue" | "repair" | "ask_user" | "stop";
export type RiskLevel = "low" | "medium" | "high";
export type CriterionVerdict = "met" | "gap" | "insufficient_evidence" | "blocked";

export type GateCriterion = {
  id: string;
  requirement: string;
  checkNames: string[];
  evidenceSummary: string;
};

export type CriterionReview = {
  verdict: CriterionVerdict;
  confidence: number;
};
export type DeferredAssessment = "non_blocking" | "current_phase_gap" | "unclear";

export type GateEvidence = {
  phase: string;
  nextPhase?: string;
  objective: string;
  checks: Array<{ name: string; passed: boolean; evidence?: string }>;
  acceptanceCriteria?: GateCriterion[];
  deferredItems: string[];
  blockedItems: string[];
  externalWriteRequested: boolean;
  highRiskActionRequested: boolean;
};

export type GateDecision = {
  status: GateStatus;
  nextAction: NextAction;
  riskLevel: RiskLevel;
  confidence: number;
  questionConfidence?: Record<string, number>;
  criterionReviews?: Record<string, CriterionReview>;
  deferredAssessment?: DeferredAssessment;
  reasons: string[];
  automaticExecutionAllowed: false;
  source: "deterministic-baseline" | "jev";
};

export type ShadowDecisionRecord = {
  recordedAt: string;
  mode: "shadow";
  evidence: GateEvidence;
  baseline: GateDecision;
  jev?: GateDecision;
  agreement?: boolean;
  durationMs: number;
  phaseTransition: "advance" | "pause";
  transitionReason: string;
  provider: "native-jev" | "vercel-ai-gateway" | "deterministic-fallback";
  actionTaken: "none";
};
