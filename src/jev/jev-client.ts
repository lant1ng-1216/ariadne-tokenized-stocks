import { experimental_evaluate as evaluate, type Experimental_EvaluationQuestion } from "ai";
import { fetch, ProxyAgent } from "undici";
import type { CriterionReview, CriterionVerdict, DeferredAssessment, GateDecision, GateEvidence } from "./types.js";

type ChoiceAnswer = { type?: string; choice?: string; confidence?: number; probabilities?: Record<string, number> };
type ChoiceReader = (questionId: string) => { choice: string; confidence: number };

const criterionVerdicts: Record<CriterionVerdict, string> = {
  met: "The supplied evidence directly supports that this requirement is met.",
  gap: "The supplied evidence indicates this requirement is not met or has a concrete defect.",
  insufficient_evidence: "The checks may pass, but the supplied evidence does not demonstrate this requirement.",
  blocked: "A user-owned decision, external prerequisite, or safety boundary prevents continuing this criterion.",
};

export async function evaluateWithJev(evidence: GateEvidence): Promise<GateDecision | undefined> {
  const nativeKey = process.env.JEV_AGENT_KEY;
  if (nativeKey) return evaluateNativeJev(evidence, nativeKey);

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return undefined;
  void apiKey;

  const questions = buildJevQuestions(evidence);
  const result = await evaluate({ model: "typesafe-ai/jev", state: evidence, questions });
  return makeDecisionFromChoices(evidence, (questionId) => readGatewayChoice(result.answers[questionId], questionId));
}

export function buildJevQuestions(evidence: GateEvidence): Record<string, Experimental_EvaluationQuestion> {
  const criterionIds = new Set<string>();
  const questions: Record<string, Experimental_EvaluationQuestion> = {
    status: {
      type: "choice",
      instructions: "Classify the phase gate using the approved objective, acceptance criteria, check results, and explicit limitations. Do not infer evidence that was not supplied.",
      criteria: {
        passed: "All supplied acceptance criteria are met and all required checks passed.",
        passed_with_deferred_items: "Current-phase criteria are met; explicitly listed deferred items are outside this phase and do not weaken its acceptance.",
        needs_rework: "A current-phase criterion has a repairable implementation or evidence gap.",
        blocked: "A user decision, external prerequisite, or safety boundary prevents a safe continuation.",
      },
    },
    nextAction: {
      type: "choice",
      instructions: "Choose the next workflow state against the user-approved phase plan. If the next phase is explicitly named in the approved roadmap, its scope is bounded and low-risk, all current criteria are met, and no user-only decision or external prerequisite remains, choose continue automatically; do not ask for routine phase-by-phase reapproval. Low confidence alone is not evidence of implementation failure: identify the uncertain criterion and prefer safe in-scope diagnosis or evidence collection.",
      criteria: {
        continue: "All required criteria are supported and the next step remains inside the approved low-risk scope.",
        repair: "A concrete, repairable implementation or evidence issue remains within approved scope.",
        ask_user: "A product decision, changed scope, authorization, or user-only judgment is required.",
        stop: "The work is unsafe or blocked by an external condition that cannot be resolved in scope.",
      },
    },
    riskLevel: {
      type: "choice",
      instructions: "Classify operational risk based on the supplied evidence and explicit boundaries, not on hypothetical actions that were not requested.",
      criteria: {
        low: "The work is limited to local deterministic checks and/or explicitly approved read-only requests to already-in-scope endpoints using configured credentials, without private or wallet data, paid services, or state changes; no wallet transaction signing, broadcast, external write, or deployment is requested.",
        medium: "A recoverable implementation, evidence, or integration uncertainty is present, or an external read/request is not explicitly approved and bounded.",
        high: "External, financial, destructive, or authorization-sensitive action is requested or is necessary to proceed.",
      },
    },
  };

  for (const criterion of evidence.acceptanceCriteria ?? []) {
    if (criterionIds.has(criterion.id)) throw new Error(`Duplicate acceptance criterion ID: ${criterion.id}`);
    criterionIds.add(criterion.id);
    questions[criterionQuestionId(criterion.id)] = {
      type: "choice",
      instructions: JSON.stringify({
        task: "Assess this single approved phase acceptance criterion against only its linked checks and evidence summary.",
        criterion: criterion.requirement,
        linkedChecks: criterion.checkNames,
        evidenceSummary: criterion.evidenceSummary,
        rule: "A passing test name alone is not proof unless the summary connects it to the criterion. Do not invent failures or claim unobserved behavior.",
      }),
      criteria: criterionVerdicts,
    };
  }

  if ((evidence.deferredItems ?? []).length > 0) {
    questions.deferredScope = {
      type: "choice",
      instructions: JSON.stringify({
        task: "Assess whether the explicitly deferred items affect the current phase's approved acceptance criteria.",
        deferredItems: evidence.deferredItems,
      }),
      criteria: {
        non_blocking: "The listed items are explicitly outside the current phase and do not invalidate its criteria.",
        current_phase_gap: "At least one deferred item is actually required to satisfy the current phase.",
        unclear: "The supplied objective and criteria are insufficient to tell whether the deferrals are acceptable.",
      },
    };
  }

  return questions;
}

async function evaluateNativeJev(evidence: GateEvidence, apiKey: string): Promise<GateDecision> {
  const proxyUrl = process.env.JEV_AGENT_PROXY_URL ?? process.env.BINANCE_WEB3_PROXY_URL;
  const questions = buildJevQuestions(evidence);
  const response = await fetch(process.env.JEV_AGENT_BASE_URL ?? "https://jev-agent.com/api/v1/systemone", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.JEV_MODEL ?? "jev-latest", state: evidence, questions }),
    ...(proxyUrl ? { dispatcher: new ProxyAgent(proxyUrl) } : {}),
  });
  if (!response.ok) throw new Error(`Native Jev request failed with HTTP ${response.status}`);
  const payload = (await response.json()) as { answers?: Record<string, ChoiceAnswer> };
  return makeDecisionFromChoices(evidence, (questionId) => readNativeChoice(payload.answers?.[questionId], questionId));
}

export function makeDecisionFromChoices(evidence: GateEvidence, readChoice: ChoiceReader): GateDecision {
  const status = readChoice("status");
  const nextAction = readChoice("nextAction");
  const riskLevel = readChoice("riskLevel");
  if (!isStatus(status.choice) || !isNextAction(nextAction.choice) || !isRiskLevel(riskLevel.choice)) {
    throw new Error("Jev returned an invalid phase-gate decision");
  }

  const questionConfidence: Record<string, number> = {
    status: status.confidence,
    nextAction: nextAction.confidence,
    riskLevel: riskLevel.confidence,
  };
  const criterionReviews: Record<string, CriterionReview> = {};
  const reasons: string[] = [];
  let deferredAssessment: DeferredAssessment | undefined;

  for (const criterion of evidence.acceptanceCriteria ?? []) {
    const questionId = criterionQuestionId(criterion.id);
    const answer = readChoice(questionId);
    if (!isCriterionVerdict(answer.choice)) throw new Error(`Jev returned an invalid assessment for criterion ${criterion.id}`);
    questionConfidence[questionId] = answer.confidence;
    criterionReviews[criterion.id] = { verdict: answer.choice, confidence: answer.confidence };
    reasons.push(`Criterion ${criterion.id}: ${answer.choice} (${answer.confidence.toFixed(3)} confidence) — ${criterion.requirement}`);
  }

  if ((evidence.deferredItems ?? []).length > 0) {
    const deferred = readChoice("deferredScope");
    questionConfidence.deferredScope = deferred.confidence;
    if (!isDeferredVerdict(deferred.choice)) throw new Error("Jev returned an invalid deferred-scope assessment");
    deferredAssessment = deferred.choice;
    if (deferred.choice !== "non_blocking") {
      reasons.push(`Deferred-scope assessment: ${deferred.choice} (${deferred.confidence.toFixed(3)} confidence).`);
    }
  }

  if (reasons.length === 0) reasons.push("Jev returned structured phase-gate classifications; no free-text rationale was provided by the evaluator.");

  return {
    status: status.choice,
    nextAction: nextAction.choice,
    riskLevel: riskLevel.choice,
    confidence: Math.min(...Object.values(questionConfidence)),
    questionConfidence,
    ...(Object.keys(criterionReviews).length ? { criterionReviews } : {}),
    ...(deferredAssessment ? { deferredAssessment } : {}),
    reasons,
    automaticExecutionAllowed: false,
    source: "jev",
  };
}

function readGatewayChoice(answer: unknown, questionId: string): { choice: string; confidence: number } {
  if (!answer || typeof answer !== "object" || !("type" in answer) || answer.type !== "choice" || !("choice" in answer) || typeof answer.choice !== "string") {
    throw new Error(`Jev returned a non-choice answer for ${questionId}`);
  }
  const probabilities = "probabilities" in answer ? answer.probabilities : undefined;
  return { choice: answer.choice, confidence: selectedChoiceConfidence(answer.choice, probabilities) };
}

function readNativeChoice(answer: ChoiceAnswer | undefined, questionId: string): { choice: string; confidence: number } {
  if (answer?.type !== "choice" || typeof answer.choice !== "string") {
    throw new Error(`Native Jev returned an invalid choice answer for ${questionId}`);
  }
  const confidence = typeof answer.confidence === "number"
    ? answer.confidence
    : selectedChoiceConfidence(answer.choice, answer.probabilities);
  return { choice: answer.choice, confidence: clampConfidence(confidence) };
}

export function selectedChoiceConfidence(choice: string, probabilities: unknown): number {
  if (!probabilities || typeof probabilities !== "object") return 0;
  const selected = (probabilities as Record<string, unknown>)[choice];
  if (typeof selected === "number" && Number.isFinite(selected)) return clampConfidence(selected);
  return 0;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) return 0;
  return value;
}

export function criterionQuestionId(id: string): string {
  return `criterion_${id}`;
}

const isStatus = (value: string): value is GateDecision["status"] =>
  value === "passed" || value === "passed_with_deferred_items" || value === "needs_rework" || value === "blocked";
const isNextAction = (value: string): value is GateDecision["nextAction"] =>
  value === "continue" || value === "repair" || value === "ask_user" || value === "stop";
const isRiskLevel = (value: string): value is GateDecision["riskLevel"] =>
  value === "low" || value === "medium" || value === "high";
const isCriterionVerdict = (value: string): value is CriterionVerdict =>
  value === "met" || value === "gap" || value === "insufficient_evidence" || value === "blocked";
const isDeferredVerdict = (value: string): value is DeferredAssessment =>
  value === "non_blocking" || value === "current_phase_gap" || value === "unclear";
