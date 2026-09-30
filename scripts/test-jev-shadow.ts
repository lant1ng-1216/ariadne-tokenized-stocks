import assert from "node:assert/strict";
import { evaluateBaseline } from "../src/jev/baseline.js";
import { buildJevQuestions, criterionQuestionId, makeDecisionFromChoices, selectedChoiceConfidence } from "../src/jev/jev-client.js";
import { isLowRiskContinuation, runShadowGate } from "../src/jev/shadow-gate.js";
import { assertSafeReviewText, confidenceThreshold, MIN_JEV_CONFIDENCE, validateAcceptanceCriteria } from "../src/jev/evidence-validation.js";
import { writeShadowDecisionRecord } from "../src/jev/record.js";
import { advancePhaseState } from "../src/jev/phase-state.js";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const safe = {
  phase: "test-phase",
  objective: "Validate a safe read-only phase",
  checks: [{ name: "typecheck", passed: true, evidence: "pass" }],
  acceptanceCriteria: [{
    id: "typecheck-clean",
    requirement: "The TypeScript project passes typecheck.",
    checkNames: ["typecheck"],
    evidenceSummary: "The selected typecheck command exits successfully.",
  }],
  deferredItems: [],
  blockedItems: [],
  externalWriteRequested: false,
  highRiskActionRequested: false,
};
const unsafe = { ...safe, highRiskActionRequested: true };
const deferred = { ...safe, deferredItems: ["UI polish remains a later phase"] };
const criteria = [{
  id: "replay-protection",
  requirement: "A signed execution plan cannot be replayed.",
  checkNames: ["test:execution-dry-run", "test:plan-registry"],
  evidenceSummary: "The dry-run rejects replay; the registry records a plan as consumed before broadcast.",
}];
const criterionEvidence = {
  ...safe,
  checks: [
    { name: "test:execution-dry-run", passed: true, evidence: "pass" },
    { name: "test:plan-registry", passed: true, evidence: "pass" },
  ],
  acceptanceCriteria: criteria,
};

assert.equal(evaluateBaseline(safe).status, "passed");
assert.equal(evaluateBaseline(unsafe).nextAction, "ask_user");
assert.equal(evaluateBaseline(deferred).status, "passed_with_deferred_items");
assert.equal(isLowRiskContinuation(evaluateBaseline(deferred)), true);
assert.equal(MIN_JEV_CONFIDENCE, 0.85);
const originalThreshold = process.env.JEV_MIN_CONFIDENCE;
delete process.env.JEV_MIN_CONFIDENCE;
assert.equal(confidenceThreshold(), 0.85);
if (originalThreshold === undefined) delete process.env.JEV_MIN_CONFIDENCE;
else process.env.JEV_MIN_CONFIDENCE = originalThreshold;
assert.equal(confidenceThreshold("0.6"), 0.85, "configuration cannot lower the review threshold");
assert.equal(confidenceThreshold("not-a-number"), 0.85, "invalid configuration fails to the minimum threshold");
assert.equal(confidenceThreshold("0.9"), 0.9, "a stricter configured threshold remains supported");
assert.equal(selectedChoiceConfidence("selected", { selected: 0.91, other: 0.99 }), 0.91);
assert.equal(selectedChoiceConfidence("selected", { other: 0.99 }), 0, "another class probability cannot inflate selected-answer confidence");
assert.equal(selectedChoiceConfidence("selected", { selected: Number.NaN }), 0);
assert.equal(selectedChoiceConfidence("selected", { selected: 2 }), 0, "out-of-range confidence is invalid rather than clamped into approval");
validateAcceptanceCriteria(criteria, new Set(["test:execution-dry-run", "test:plan-registry"]));
assert.throws(() => validateAcceptanceCriteria([], new Set(["typecheck"])), /At least one --criterion/);
assert.throws(() => validateAcceptanceCriteria([...criteria, ...criteria], new Set(["test:execution-dry-run", "test:plan-registry"])), /Duplicate acceptance criterion ID/);
assert.throws(() => validateAcceptanceCriteria(criteria, new Set(["typecheck"])), /not selected/);
assert.throws(() => assertSafeReviewText("summary", "line one\nline two", 200), /multiline/);
assert.throws(() => assertSafeReviewText("summary", `0x${"ab".repeat(32)}`, 200), /secret-like/);
const questions = buildJevQuestions({ ...criterionEvidence, deferredItems: ["Funded settlement remains out of scope."] });
const riskQuestion = JSON.stringify(questions.riskLevel);
assert.match(riskQuestion, /explicitly approved read-only requests/);
assert.match(riskQuestion, /configured credentials/);
assert.match(riskQuestion, /paid services/);
assert.match(riskQuestion, /external write/);
const nextActionQuestion = JSON.stringify(questions.nextAction);
assert.match(nextActionQuestion, /user-approved phase plan/);
assert.match(nextActionQuestion, /continue automatically/);
assert.match(nextActionQuestion, /routine phase-by-phase reapproval/);
const replayQuestion = JSON.stringify(questions[criterionQuestionId("replay-protection")]);
assert.match(replayQuestion, /cannot be replayed/);
assert.match(replayQuestion, /test:execution-dry-run/);
assert.ok(questions.deferredScope);
assert.throws(() => buildJevQuestions({ ...criterionEvidence, acceptanceCriteria: [...criteria, ...criteria] }), /Duplicate acceptance criterion ID/);
const mockAnswers: Record<string, { choice: string; confidence: number }> = {
  status: { choice: "passed", confidence: 0.99 },
  nextAction: { choice: "continue", confidence: 0.98 },
  riskLevel: { choice: "low", confidence: 1 },
  [criterionQuestionId("replay-protection")]: { choice: "met", confidence: 0.97 },
};
const parsedMockDecision = makeDecisionFromChoices(criterionEvidence, (questionId) => {
  const answer = mockAnswers[questionId];
  if (!answer) throw new Error(`Missing mock answer: ${questionId}`);
  return answer;
});
assert.equal(parsedMockDecision.criterionReviews?.["replay-protection"].verdict, "met");
assert.equal(parsedMockDecision.confidence, 0.97);
assert.throws(() => makeDecisionFromChoices(criterionEvidence, () => ({ choice: "continue", confidence: 0.99 })), /invalid phase-gate decision/);
const record = await runShadowGate(safe, async () => undefined);
assert.equal(record.mode, "shadow");
assert.equal(record.actionTaken, "none");
assert.equal(record.phaseTransition, "pause");
assert.equal(record.baseline.automaticExecutionAllowed, false);
const approved = await runShadowGate(safe, async () => ({
  ...evaluateBaseline(safe),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "typecheck-clean": { verdict: "met", confidence: 0.99 } },
}));
assert.equal(approved.phaseTransition, "advance");
const omittedCriteria = await runShadowGate({ ...safe, acceptanceCriteria: [] }, async () => ({
  ...evaluateBaseline(safe),
  source: "jev",
  confidence: 0.99,
}));
assert.equal(omittedCriteria.phaseTransition, "pause", "a phase cannot advance with no explicit acceptance criteria");
assert.match(omittedCriteria.transitionReason, /No explicit acceptance criteria/);
const incompleteReview = await runShadowGate(criterionEvidence, async () => ({
  ...evaluateBaseline(criterionEvidence),
  source: "jev",
  confidence: 0.99,
}));
assert.equal(incompleteReview.phaseTransition, "pause", "missing criterion verdict cannot vacuously pass");
assert.match(incompleteReview.transitionReason, /no verdict for criterion replay-protection/);
const duplicateReviewCriteria = await runShadowGate({ ...criterionEvidence, acceptanceCriteria: [...criteria, ...criteria] }, async () => ({
  ...evaluateBaseline(criterionEvidence),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "replay-protection": { verdict: "met", confidence: 0.99 } },
}));
assert.equal(duplicateReviewCriteria.phaseTransition, "pause");
assert.match(duplicateReviewCriteria.transitionReason, /duplicate IDs/);
const lowConfidence = await runShadowGate(safe, async () => ({
  ...evaluateBaseline(safe),
  source: "jev",
  confidence: 0.1,
  criterionReviews: { "typecheck-clean": { verdict: "met", confidence: 0.99 } },
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.1 },
}));
assert.equal(lowConfidence.phaseTransition, "pause");
assert.match(lowConfidence.transitionReason, /riskLevel \(0\.100\)/);
const insufficientEvidence = await runShadowGate(criterionEvidence, async () => ({
  ...evaluateBaseline(criterionEvidence),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "replay-protection": { verdict: "insufficient_evidence", confidence: 0.99 } },
}));
assert.equal(insufficientEvidence.phaseTransition, "pause");
assert.match(insufficientEvidence.transitionReason, /replay-protection: insufficient_evidence/);
assert.match(insufficientEvidence.transitionReason, /cannot be replayed/);
const verifiedCriteria = await runShadowGate({ ...criterionEvidence, deferredItems: ["Funded settlement remains out of scope."] }, async () => ({
  ...evaluateBaseline({ ...criterionEvidence, deferredItems: ["Funded settlement remains out of scope."] }),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "replay-protection": { verdict: "met", confidence: 0.99 } },
  deferredAssessment: "non_blocking",
}));
assert.equal(verifiedCriteria.phaseTransition, "advance");
const currentPhaseDeferral = await runShadowGate({ ...criterionEvidence, deferredItems: ["Replay protection is incomplete."] }, async () => ({
  ...evaluateBaseline({ ...criterionEvidence, deferredItems: ["Replay protection is incomplete."] }),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "replay-protection": { verdict: "met", confidence: 0.99 } },
  deferredAssessment: "current_phase_gap",
}));
assert.equal(currentPhaseDeferral.phaseTransition, "pause");
assert.match(currentPhaseDeferral.transitionReason, /current_phase_gap/);
const highRisk = await runShadowGate(unsafe, async () => ({
  ...evaluateBaseline(safe),
  source: "jev",
  confidence: 0.99,
  criterionReviews: { "typecheck-clean": { verdict: "met", confidence: 0.99 } },
}));
assert.equal(highRisk.phaseTransition, "pause");

const phaseAcceptanceCriteria = [
  { id: "host-rendering", requirement: "The user confirms the research card is visible, live MCP tools link the native UI resource, and the bundled app renders host-delivered structured and text-only results.", checkNames: ["test:mcp-app-ui", "test:mcp-natural-language"], evidenceSummary: "The user confirmed visibility; live tool metadata links discovery and research to one UI resource, and the simulated protocol host renders both result forms." },
  { id: "live-data-parity", requirement: "Live SDK and MCP research/discovery preserve exact NVDA identities, text and structured parity, timestamped provenance and no-side-effect behavior.", checkNames: ["test:mcp-natural-language"], evidenceSummary: "The live integration asserts SDK/MCP identity parity and exact parsed-text/structuredContent equality for both research and discovery, with times, sources and sideEffects none." },
  { id: "local-regression", requirement: "Selected compile/build, no-trade safety, phase-plan and phase-gate state regression checks pass.", checkNames: ["typecheck", "build", "test:demo-mode", "test:core-product-phase-plan", "test:jev-shadow"], evidenceSummary: "Each linked check exits successfully; outputs cover type/build, read-only behavior, the approved phase plan, and terminal advance versus failed-check hold." },
];
const phaseGateEvidence = {
  ...safe,
  phase: "mcp-agent-host-rendering-parity",
  nextPhase: "delivery-complete",
  objective: "Close Phase 13 only after its approved acceptance criteria and selected local checks pass.",
  checks: ["typecheck", "build", "test:mcp-app-ui", "test:mcp-natural-language", "test:demo-mode", "test:core-product-phase-plan", "test:jev-shadow"].map((name) => ({ name, passed: true, evidence: "pass" })),
  acceptanceCriteria: phaseAcceptanceCriteria,
};
const phaseApproved = await runShadowGate(phaseGateEvidence, async () => ({
  ...evaluateBaseline(phaseGateEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: Object.fromEntries(phaseAcceptanceCriteria.map(({ id }) => [id, { verdict: "met" as const, confidence: 0.99 }])),
}));
assert.equal(phaseApproved.phaseTransition, "advance", "all passing phase checks and reviewed criteria allow the named in-scope terminal transition");
const phaseTempDir = await mkdtemp(join(tmpdir(), "ariadne-phase-transition-"));
const phaseStatePath = join(phaseTempDir, "phase-state.json");
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "mcp-agent-host-rendering-parity" }, null, 2)}\n`, "utf8");
const terminalState = await advancePhaseState(phaseStatePath, phaseApproved);
assert.equal(terminalState.currentPhase, "delivery-complete");
assert.equal(terminalState.lastTransition, "advance");

const failedPhaseEvidence = {
  ...phaseGateEvidence,
  checks: phaseGateEvidence.checks.map((check) => check.name === "test:mcp-app-ui" ? { ...check, passed: false } : check),
};
const failedPhase = await runShadowGate(failedPhaseEvidence, async () => ({
  ...evaluateBaseline(phaseGateEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: Object.fromEntries(phaseAcceptanceCriteria.map(({ id }) => [id, { verdict: "met" as const, confidence: 0.99 }])),
}));
assert.equal(failedPhase.phaseTransition, "pause", "the independent baseline must hold the phase even if a mock reviewer says continue");
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "mcp-agent-host-rendering-parity" }, null, 2)}\n`, "utf8");
const heldState = await advancePhaseState(phaseStatePath, failedPhase);
assert.equal(heldState.currentPhase, "mcp-agent-host-rendering-parity", "a paused phase gate must not advance the persisted phase ledger");

const newlyStartedPhase = {
  ...failedPhase,
  evidence: { ...failedPhase.evidence, phase: "mcp-research-observability", nextPhase: "delivery-complete" },
};
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "delivery-complete" }, null, 2)}\n`, "utf8");
const newlyHeldState = await advancePhaseState(phaseStatePath, newlyStartedPhase);
assert.equal(newlyHeldState.currentPhase, "mcp-research-observability", "a paused review must identify the active phase even if the previous ledger was terminal");
assert.equal(newlyHeldState.nextPhase, "delivery-complete", "a pause records the planned next phase without advancing to it");

const tempDir = await mkdtemp(join(tmpdir(), "ariadne-jev-shadow-"));
const recordPath = join(tempDir, "shadow.jsonl");
await writeShadowDecisionRecord(recordPath, record);
const persisted = JSON.parse((await readFile(recordPath, "utf8")).trim()) as typeof record;
assert.equal(persisted.actionTaken, "none");
assert.equal(persisted.evidence.phase, "test-phase");
assert.equal(typeof persisted.durationMs, "number");

console.log(JSON.stringify({
  mode: record.mode,
  baselineStatus: record.baseline.status,
  jevAvailable: Boolean(record.jev),
  mockedGateDecisions: true,
  criterionLinkedReview: true,
  terminalPhaseAdvancesOnlyAfterApproval: true,
  failedPhaseGateRemainsActive: true,
  requiredCriteriaAndCompleteCoverage: true,
  thresholdFloorAndChoiceConfidence: true,
  actionTaken: record.actionTaken,
  passed: true,
}, null, 2));
