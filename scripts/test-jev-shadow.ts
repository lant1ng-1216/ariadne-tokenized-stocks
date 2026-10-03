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
const warningMessages: string[] = [];
const originalWarn = console.warn;
console.warn = (...values: unknown[]) => warningMessages.push(values.map(String).join(" "));
try {
  await runShadowGate(safe, async () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("sensitive proxy detail"), { code: "UND_ERR_CONNECT_TIMEOUT" }),
    });
    throw error;
  });
  await runShadowGate(safe, async () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("sensitive authentication detail"), { code: "SECRET_VALUE" }),
    });
    throw error;
  });
} finally {
  console.warn = originalWarn;
}
assert.match(warningMessages[0] ?? "", /fetch failed \(UND_ERR_CONNECT_TIMEOUT\)/);
assert.match(warningMessages[1] ?? "", /fetch failed$/);
assert.doesNotMatch(warningMessages.join(" "), /sensitive|SECRET_VALUE/);
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

const agentNativeUiCriteria = [
  { id: "inline-host-native-ui", requirement: "The MCP Apps result uses compact host-adaptive Agent-native presentation.", checkNames: ["test:mcp-app-ui"], evidenceSummary: "The executable UI harness checks inline hierarchy, host theme adaptation and progressive disclosures." },
  { id: "research-data-fidelity", requirement: "The MCP Apps view preserves exact research evidence and text/structured parity.", checkNames: ["test:mcp-app-ui", "test:presentation"], evidenceSummary: "UI and presentation tests cover identities, values, provenance, caveats and no-fabrication wording." },
  { id: "read-only-ui-safety", requirement: "The MCP App remains read-only and the related Demo, build and phase-plan checks pass.", checkNames: ["test:mcp-app-ui", "test:demo-mode", "typecheck", "build", "test:core-product-phase-plan"], evidenceSummary: "The view has no wallet/order controls, Demo blocks action paths, and compile/build/phase-ledger regressions pass." },
];
const agentNativeUiPhaseEvidence = {
  ...safe,
  phase: "mcp-agent-native-research-ui",
  nextPhase: "delivery-complete",
  objective: "Advance the approved Agent-native MCP UI phase only after its required checks and Jev criteria pass.",
  checks: ["typecheck", "build", "test:mcp-app-ui", "test:demo-mode", "test:presentation", "test:core-product-phase-plan"].map((name) => ({ name, passed: true, evidence: "pass" })),
  acceptanceCriteria: agentNativeUiCriteria,
};
const agentNativeUiApproved = await runShadowGate(agentNativeUiPhaseEvidence, async () => ({
  ...evaluateBaseline(agentNativeUiPhaseEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: Object.fromEntries(agentNativeUiCriteria.map(({ id }) => [id, { verdict: "met" as const, confidence: 0.99 }])),
}));
assert.equal(agentNativeUiApproved.phaseTransition, "advance", "the approved Agent-native UI phase advances only after complete passing evidence");
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "mcp-agent-native-research-ui" }, null, 2)}\n`, "utf8");
const agentNativeUiTerminalState = await advancePhaseState(phaseStatePath, agentNativeUiApproved);
assert.equal(agentNativeUiTerminalState.currentPhase, "delivery-complete", "an approved Agent-native UI phase records the named terminal next phase");

const failedAgentNativeUiEvidence = {
  ...agentNativeUiPhaseEvidence,
  checks: agentNativeUiPhaseEvidence.checks.map((check) => check.name === "test:mcp-app-ui" ? { ...check, passed: false } : check),
};
const failedAgentNativeUiReview = await runShadowGate(failedAgentNativeUiEvidence, async () => ({
  ...evaluateBaseline(agentNativeUiPhaseEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: Object.fromEntries(agentNativeUiCriteria.map(({ id }) => [id, { verdict: "met" as const, confidence: 0.99 }])),
}));
assert.equal(failedAgentNativeUiReview.phaseTransition, "pause", "an Agent-native UI check failure holds the phase despite a mocked passing Jev review");
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "mcp-agent-native-research-ui" }, null, 2)}\n`, "utf8");
const agentNativeUiHeldState = await advancePhaseState(phaseStatePath, failedAgentNativeUiReview);
assert.equal(agentNativeUiHeldState.currentPhase, "mcp-agent-native-research-ui", "a failing Agent-native UI gate cannot advance the phase ledger");

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

const approvedContinuation = [
  ["mcp-confirmation-host-interop", "sdk-cleanroom-revalidation"],
  ["sdk-cleanroom-revalidation", "demo-mode-journey-coverage"],
  ["demo-mode-journey-coverage", "provider-data-resilience"],
  ["provider-data-resilience", "agent-output-language-quality"],
  ["agent-output-language-quality", "core-local-acceptance"],
  ["core-local-acceptance", "delivery-complete"],
] as const;
for (const [phase, nextPhase] of approvedContinuation) {
  const evidence = {
    ...safe,
    phase,
    nextPhase,
    checks: [{ name: "test:core-product-phase-plan", passed: true, evidence: "approved forward phase and successor are explicitly recorded" }],
    acceptanceCriteria: [{
      id: "approved-transition",
      requirement: "An approved continuation advances only to its explicitly named successor after passing checks and Jev review.",
      checkNames: ["test:core-product-phase-plan"],
      evidenceSummary: "The plan records the approved bounded continuation; this deterministic fixture verifies the phase-state transition implementation.",
    }],
  };
  const decision = await runShadowGate(evidence, async () => ({
    ...evaluateBaseline(evidence),
    source: "jev",
    confidence: 0.99,
    questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
    criterionReviews: { "approved-transition": { verdict: "met" as const, confidence: 0.99 } },
  }));
  assert.equal(decision.phaseTransition, "advance", `${phase} should advance only after its linked evidence and Jev approval pass`);
  await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: phase }, null, 2)}\n`, "utf8");
  const nextState = await advancePhaseState(phaseStatePath, decision);
  assert.equal(nextState.currentPhase, nextPhase, `${phase} advances to its named successor`);
}

const failedFirstForwardEvidence = {
  ...safe,
  phase: "mcp-confirmation-host-interop",
  nextPhase: "sdk-cleanroom-revalidation",
  checks: [{ name: "test:core-product-phase-plan", passed: false, evidence: "simulated failed acceptance check" }],
  acceptanceCriteria: [{
    id: "approved-transition",
    requirement: "A failing deterministic check holds the current phase, even when Jev returns continue.",
    checkNames: ["test:core-product-phase-plan"],
    evidenceSummary: "The check is intentionally marked failed in this offline state-transition regression.",
  }],
};
const failedFirstForwardGate = await runShadowGate(failedFirstForwardEvidence, async () => ({
  ...evaluateBaseline({ ...failedFirstForwardEvidence, checks: [{ ...failedFirstForwardEvidence.checks[0], passed: true }] }),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: { "approved-transition": { verdict: "met" as const, confidence: 0.99 } },
}));
assert.equal(failedFirstForwardGate.phaseTransition, "pause", "a failed Phase 18 check must prevent automatic advancement");
await writeFile(phaseStatePath, `${JSON.stringify({ currentPhase: "delivery-complete" }, null, 2)}\n`, "utf8");
const failedFirstForwardState = await advancePhaseState(phaseStatePath, failedFirstForwardGate);
assert.equal(failedFirstForwardState.currentPhase, "mcp-confirmation-host-interop", "a paused Phase 18 remains the active phase");
assert.equal(failedFirstForwardState.nextPhase, "sdk-cleanroom-revalidation", "a Phase 18 pause preserves its intended successor without advancing");

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
  jevTransportFailureIsSafelyClassified: true,
  mockedGateDecisions: true,
  criterionLinkedReview: true,
  terminalPhaseAdvancesOnlyAfterApproval: true,
  approvedPhases18To23AdvanceInSequence: true,
  failedPhase18CheckRemainsActive: failedFirstForwardState.currentPhase === "mcp-confirmation-host-interop",
  agentNativeUiPhaseAdvancesOnlyAfterApproval: agentNativeUiTerminalState.currentPhase === "delivery-complete",
  failedPhaseGateRemainsActive: true,
  failedAgentNativeUiGateRemainsActive: agentNativeUiHeldState.currentPhase === "mcp-agent-native-research-ui",
  requiredCriteriaAndCompleteCoverage: true,
  thresholdFloorAndChoiceConfidence: true,
  actionTaken: record.actionTaken,
  passed: true,
}, null, 2));
