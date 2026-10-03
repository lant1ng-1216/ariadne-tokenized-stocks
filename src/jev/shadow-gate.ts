import { evaluateBaseline } from "./baseline.js";
import { confidenceThreshold, MIN_JEV_CONFIDENCE } from "./evidence-validation.js";
import { evaluateWithJev } from "./jev-client.js";
import type { GateEvidence, ShadowDecisionRecord } from "./types.js";

export async function runShadowGate(
  evidence: GateEvidence,
  evaluator: typeof evaluateWithJev = evaluateWithJev,
): Promise<ShadowDecisionRecord> {
  const startedAt = Date.now();
  const baseline = evaluateBaseline(evidence);
  let jev;
  try {
    jev = await evaluator(evidence);
  } catch (error) {
    jev = undefined;
    console.warn(`Jev shadow call unavailable: ${safeJevFailure(error)}`);
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

function safeJevFailure(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  if (error.message === "fetch failed") {
    const cause = error.cause;
    const code = cause && typeof cause === "object" && "code" in cause
      ? (cause as { code?: unknown }).code
      : undefined;
    const safeCodes = new Set([
      "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH",
      "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_SOCKET", "UND_ERR_ABORTED",
    ]);
    return typeof code === "string" && safeCodes.has(code) ? `fetch failed (${code})` : "fetch failed";
  }
  const httpFailure = /^Native Jev request failed with HTTP (\d{3})$/.exec(error.message);
  if (httpFailure) return `native request returned HTTP ${httpFailure[1]}`;
  return error.name || "unknown error";
}

export function isLowRiskContinuation(decision: ShadowDecisionRecord["baseline"] | undefined): boolean {
  return Boolean(
    decision &&
    (decision.status === "passed" || decision.status === "passed_with_deferred_items") &&
    decision.nextAction === "continue" &&
    decision.riskLevel === "low",
  );
}

function canAdvance(evidence: GateEvidence, baseline: ShadowDecisionRecord["baseline"], jev: ShadowDecisionRecord["jev"]): boolean {
  return Boolean(
    jev &&
    isLowRiskContinuation(baseline) &&
    isLowRiskContinuation(jev) &&
    hasCompleteCriterionReview(evidence, jev) &&
    hasAcceptedDeferredScope(evidence, jev) &&
    jev.confidence >= confidenceThreshold() &&
    evidence.externalWriteRequested === false &&
    evidence.highRiskActionRequested === false,
  );
}

function transitionReason(evidence: GateEvidence, baseline: ShadowDecisionRecord["baseline"], jev: ShadowDecisionRecord["jev"]): string {
  if (!jev) return "Jev unavailable; remain paused and use the deterministic result for observation only.";
  const criteria = evidence.acceptanceCriteria ?? [];
  if (criteria.length === 0) return "No explicit acceptance criteria were supplied; add phase criteria and linked evidence before advancing.";
  const ids = new Set(criteria.map((criterion) => criterion.id));
  if (ids.size !== criteria.length) return "Acceptance criteria contain duplicate IDs; give every criterion a unique ID before reviewing.";
  const missingCriterion = criteria.find((criterion) => !jev.criterionReviews?.[criterion.id]);
  if (missingCriterion) return `Jev returned no verdict for criterion ${missingCriterion.id}: ${missingCriterion.requirement}. Collect criterion-linked review evidence before advancing.`;
  const unresolvedCriterion = Object.entries(jev.criterionReviews ?? {}).find(([, review]) => review.verdict !== "met");
  if (unresolvedCriterion) {
    const [id, review] = unresolvedCriterion;
    const requirement = evidence.acceptanceCriteria?.find((criterion) => criterion.id === id)?.requirement;
    return `Jev did not verify criterion ${id}: ${review.verdict}${requirement ? ` — ${requirement}` : ""}. Diagnose or repair this criterion before advancing.`;
  }
  const malformedCriterionReview = criteria.find((criterion) => {
    const review = jev.criterionReviews?.[criterion.id];
    return !review || !Number.isFinite(review.confidence) || review.confidence < MIN_JEV_CONFIDENCE;
  });
  if (malformedCriterionReview) {
    const confidence = jev.criterionReviews?.[malformedCriterionReview.id]?.confidence;
    return `Criterion ${malformedCriterionReview.id} lacks a sufficiently confident Jev review (${typeof confidence === "number" ? confidence.toFixed(3) : "missing"}); clarify its evidence before advancing.`;
  }
  if (Object.keys(jev.criterionReviews ?? {}).length !== criteria.length) return "Jev criterion verdicts do not exactly cover the submitted acceptance criteria; resolve the mismatch before advancing.";
  if (jev.deferredAssessment && jev.deferredAssessment !== "non_blocking") {
    return `Jev assessed deferred work as ${jev.deferredAssessment}; clarify whether it affects the current phase before advancing.`;
  }
  if (evidence.deferredItems.length > 0 && jev.deferredAssessment === undefined) return "Jev did not assess whether deferred items affect the current phase; clarify deferred scope before advancing.";
  if (!isLowRiskContinuation(baseline) || !isLowRiskContinuation(jev)) return "Both baseline and Jev must authorize low-risk continuation, allowing explicitly recorded deferred items.";
  if (baseline.nextAction !== "continue" || jev.nextAction !== "continue") return "Both baseline and Jev must authorize low-risk continuation.";
  if (baseline.riskLevel !== "low" || jev.riskLevel !== "low") return "High or medium risk requires a pause.";
  if (evidence.externalWriteRequested || evidence.highRiskActionRequested) return "External or high-risk action requires a pause.";
  const threshold = confidenceThreshold();
  if (jev.confidence < threshold) {
    const lowest = Object.entries(jev.questionConfidence ?? {}).sort((a, b) => a[1] - b[1])[0];
    return lowest
      ? `Jev confidence is below the minimum threshold (${threshold.toFixed(2)}); the least-certain review item is ${lowest[0]} (${lowest[1].toFixed(3)}). Add or clarify evidence for that item, then review again.`
      : `Jev confidence is below the minimum threshold (${threshold.toFixed(2)}); add or clarify review evidence before trying again.`;
  }
  return "Baseline and Jev agree on a low-risk continuation.";
}

function hasCompleteCriterionReview(evidence: GateEvidence, jev: NonNullable<ShadowDecisionRecord["jev"]>): boolean {
  const criteria = evidence.acceptanceCriteria ?? [];
  if (criteria.length === 0 || new Set(criteria.map((criterion) => criterion.id)).size !== criteria.length) return false;
  if (Object.keys(jev.criterionReviews ?? {}).length !== criteria.length) return false;
  return criteria.every((criterion) => {
    const review = jev.criterionReviews?.[criterion.id];
    return review?.verdict === "met" && Number.isFinite(review.confidence) && review.confidence >= MIN_JEV_CONFIDENCE;
  });
}

function hasAcceptedDeferredScope(evidence: GateEvidence, jev: NonNullable<ShadowDecisionRecord["jev"]>): boolean {
  return evidence.deferredItems.length === 0
    ? jev.deferredAssessment === undefined || jev.deferredAssessment === "non_blocking"
    : jev.deferredAssessment === "non_blocking";
}
