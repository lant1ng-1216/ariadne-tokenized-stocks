import assert from "node:assert/strict";
import { evaluateBaseline } from "../src/jev/baseline.js";
import { buildJevQuestions, criterionQuestionId, makeDecisionFromChoices, selectedChoiceConfidence } from "../src/jev/jev-client.js";
import { isLowRiskContinuation, runShadowGate } from "../src/jev/shadow-gate.js";
import { assertSafeReviewText, confidenceThreshold, MIN_JEV_CONFIDENCE, validateAcceptanceCriteria } from "../src/jev/evidence-validation.js";
import { writeShadowDecisionRecord } from "../src/jev/record.js";
import { advancePhaseState, assertApprovedPhaseSuccessor } from "../src/jev/phase-state.js";
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
  ["official-provider-contract-audit", "source-confirmed-data-fidelity"],
  ["source-confirmed-data-fidelity", "sdk-mcp-final-acceptance"],
  ["sdk-mcp-final-acceptance", "delivery-complete"],
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
assert.doesNotThrow(() => assertApprovedPhaseSuccessor("official-provider-contract-audit", "source-confirmed-data-fidelity"));
assert.doesNotThrow(() => assertApprovedPhaseSuccessor("source-confirmed-data-fidelity", "sdk-mcp-final-acceptance"));
assert.doesNotThrow(() => assertApprovedPhaseSuccessor("sdk-mcp-final-acceptance", "delivery-complete"));
assert.throws(() => assertApprovedPhaseSuccessor("official-provider-contract-audit", "sdk-mcp-final-acceptance"), /may advance only to its approved successor/);
assert.throws(() => assertApprovedPhaseSuccessor("source-confirmed-data-fidelity", "delivery-complete"), /may advance only to its approved successor/);
assert.throws(() => assertApprovedPhaseSuccessor("sdk-mcp-final-acceptance", "website-release"), /may advance only to its approved successor/);

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
const phase27StatePath = join(tempDir, "phase27-state.json");
const phase27LowConfidenceEvidence = {
  ...safe,
  phase: "official-provider-contract-audit",
  nextPhase: "source-confirmed-data-fidelity",
  acceptanceCriteria: [{
    id: "phase27-review-confidence",
    requirement: "Every Phase 27 acceptance criterion is met and the overall Jev confidence is at least 0.85 before transition.",
    checkNames: ["test:jev-shadow"],
    evidenceSummary: "This deterministic regression returns met criteria but Jev confidence 0.84, immediately below the enforced 0.85 floor.",
  }],
};
const phase27LowConfidenceDecision = await runShadowGate(phase27LowConfidenceEvidence, async () => ({
  ...evaluateBaseline(phase27LowConfidenceEvidence),
  source: "jev",
  confidence: 0.84,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99 },
  criterionReviews: { "phase27-review-confidence": { verdict: "met" as const, confidence: 0.99 } },
}));
assert.equal(phase27LowConfidenceDecision.phaseTransition, "pause", "a Phase 27 result below the confidence floor cannot advance despite met criteria");
assert.match(phase27LowConfidenceDecision.transitionReason, /minimum threshold \(0\.85\)/);
await writeFile(phase27StatePath, `${JSON.stringify({ currentPhase: "official-provider-contract-audit" }, null, 2)}\n`, "utf8");
const heldPhase27State = await advancePhaseState(phase27StatePath, phase27LowConfidenceDecision);
assert.equal(heldPhase27State.currentPhase, "official-provider-contract-audit", "a low-confidence Phase 27 gate keeps Phase 27 active");
assert.equal(heldPhase27State.nextPhase, "source-confirmed-data-fidelity", "a pause records but does not enter the approved successor");

const phase28StatePath = join(tempDir, "phase28-state.json");
const phase28ApprovedEvidence = {
  ...safe,
  phase: "source-confirmed-data-fidelity",
  nextPhase: "sdk-mcp-final-acceptance",
  objective: "Advance the user's approved Phase 28 to Phase 29 sequence only after all local checks and review criteria pass.",
  checks: ["test:phase28-fidelity", "test:core-product-phase-plan", "test:jev-shadow"].map((name) => ({ name, passed: true, evidence: "synthetic Phase 28 transition regression passed" })),
  acceptanceCriteria: [{
    id: "phase28-ledger-hold-and-exact-successor",
    requirement: "A failed deterministic check or any Jev criterion below 0.85 keeps Phase 28 active; only a complete passing review can advance the phase ledger to the exact Phase 29 successor.",
    checkNames: ["test:phase28-fidelity", "test:core-product-phase-plan", "test:jev-shadow"],
    evidenceSummary: "The core-plan regression reconciles the latest real Jev decision with records/phase-state.json; state-machine cases prove that a below-threshold real gate remains held, only the exact Phase 29 successor is accepted, and the ledger advances only after all selected checks and criteria pass.",
  }],
  deferredItems: ["The provider catalog-count difference and quote freshness remain unresolved outside Phase 28 scope."],
};
const phase28ApprovedDecision = await runShadowGate(phase28ApprovedEvidence, async () => ({
  ...evaluateBaseline(phase28ApprovedEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99, criterion_phase28_ledger_hold_and_exact_successor: 0.99 },
  criterionReviews: { "phase28-ledger-hold-and-exact-successor": { verdict: "met" as const, confidence: 0.99 } },
  deferredAssessment: "non_blocking" as const,
}));
assert.equal(phase28ApprovedDecision.phaseTransition, "advance", "approved Phase 28 advances only after complete passing evidence");
await writeFile(phase28StatePath, `${JSON.stringify({ currentPhase: "source-confirmed-data-fidelity" }, null, 2)}\n`, "utf8");
const phase28AdvancedState = await advancePhaseState(phase28StatePath, phase28ApprovedDecision);
assert.equal(phase28AdvancedState.currentPhase, "sdk-mcp-final-acceptance", "approved Phase 28 records exactly its named Phase 29 successor");

const phase28LowCriterionDecision = await runShadowGate(phase28ApprovedEvidence, async () => ({
  ...evaluateBaseline(phase28ApprovedEvidence),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99, criterion_phase28_ledger_hold_and_exact_successor: 0.84 },
  criterionReviews: { "phase28-ledger-hold-and-exact-successor": { verdict: "met" as const, confidence: 0.84 } },
  deferredAssessment: "non_blocking" as const,
}));
assert.equal(phase28LowCriterionDecision.phaseTransition, "pause", "a Phase 28 criterion below 0.85 holds the phase even if overall confidence is high");
await writeFile(phase28StatePath, `${JSON.stringify({ currentPhase: "source-confirmed-data-fidelity" }, null, 2)}\n`, "utf8");
const phase28HeldState = await advancePhaseState(phase28StatePath, phase28LowCriterionDecision);
assert.equal(phase28HeldState.currentPhase, "source-confirmed-data-fidelity", "a low-confidence Phase 28 criterion cannot advance the phase ledger");
assert.equal(phase28HeldState.nextPhase, "sdk-mcp-final-acceptance", "a pause records Phase 29 as successor without entering it");
const phase28FailedCheckEvidence = {
  ...phase28ApprovedEvidence,
  checks: [{ name: "test:phase28-fidelity", passed: false, evidence: "synthetic failing Phase 28 acceptance check" }]
};
const phase28FailedCheckDecision = await runShadowGate(phase28FailedCheckEvidence, async () => ({
  ...evaluateBaseline({ ...phase28FailedCheckEvidence, checks: [{ ...phase28FailedCheckEvidence.checks[0], passed: true }] }),
  source: "jev",
  confidence: 0.99,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99, criterion_phase28_ledger_hold_and_exact_successor: 0.99 },
  criterionReviews: { "phase28-ledger-hold-and-exact-successor": { verdict: "met" as const, confidence: 0.99 } },
  deferredAssessment: "non_blocking" as const,
}));
assert.equal(phase28FailedCheckDecision.phaseTransition, "pause", "a failed deterministic Phase 28 check keeps the phase held even if the mocked reviewer approves");
await writeFile(phase28StatePath, `${JSON.stringify({ currentPhase: "source-confirmed-data-fidelity" }, null, 2)}\n`, "utf8");
const phase28FailedCheckState = await advancePhaseState(phase28StatePath, phase28FailedCheckDecision);
assert.equal(phase28FailedCheckState.currentPhase, "source-confirmed-data-fidelity", "a failed Phase 28 check cannot advance the phase ledger");
assert.throws(() => assertApprovedPhaseSuccessor("source-confirmed-data-fidelity", "delivery-complete"), /may advance only to its approved successor/);

const phase29StatePath = join(tempDir, "phase29-state.json");
const phase29ApprovedEvidence = {
  ...safe,
  phase: "sdk-mcp-final-acceptance",
  nextPhase: "delivery-complete",
  objective: "Complete the approved terminal local SDK/MCP acceptance only after every selected check and review criterion passes.",
  checks: ["test:phase29-acceptance-evidence", "test:core-product-phase-plan", "test:jev-shadow"].map((name) => ({ name, passed: true, evidence: "synthetic Phase 29 terminal transition regression passed" })),
  acceptanceCriteria: [{
    id: "phase29-terminal-local-state",
    requirement: "Phase 29 advances only to delivery-complete when all selected checks pass, every linked criterion is met at or above 0.85, and overall Jev confidence is at least 0.85; otherwise Phase 29 stays active.",
    checkNames: ["test:phase29-acceptance-evidence", "test:core-product-phase-plan", "test:jev-shadow"],
    evidenceSummary: "The report reconciliation and phase-plan checks inspect the actual ledger and latest gate; these state-machine cases exercise the exact Phase 29 successor, low-confidence hold, and failed-check hold.",
  }],
  deferredItems: ["Public release, website work, provider re-probe, wallet signing, broadcast and settlement remain outside terminal local acceptance."],
};
const phase29MockReview = (evidence: typeof phase29ApprovedEvidence, confidence = 0.99, criterionConfidence = 0.99) => runShadowGate(evidence, async () => ({
  ...evaluateBaseline(evidence),
  source: "jev",
  confidence,
  questionConfidence: { status: 0.99, nextAction: 0.99, riskLevel: 0.99, criterion_phase29_terminal_local_state: criterionConfidence },
  criterionReviews: { "phase29-terminal-local-state": { verdict: "met" as const, confidence: criterionConfidence } },
  deferredAssessment: "non_blocking" as const,
}));
const phase29ApprovedDecision = await phase29MockReview(phase29ApprovedEvidence);
assert.equal(phase29ApprovedDecision.phaseTransition, "advance", "Phase 29 advances only after its terminal acceptance evidence passes");
await writeFile(phase29StatePath, `${JSON.stringify({ currentPhase: "sdk-mcp-final-acceptance" }, null, 2)}\n`, "utf8");
const phase29AdvancedState = await advancePhaseState(phase29StatePath, phase29ApprovedDecision);
assert.equal(phase29AdvancedState.currentPhase, "delivery-complete", "approved Phase 29 reaches only its named local terminal state");
assert.equal(phase29AdvancedState.nextPhase, "delivery-complete");
assert.equal(phase29AdvancedState.lastTransition, "advance");
assert.equal(phase29AdvancedState.lastDecisionAt, phase29ApprovedDecision.recordedAt);

const phase29LowConfidenceDecision = await phase29MockReview(phase29ApprovedEvidence, 0.99, 0.84);
assert.equal(phase29LowConfidenceDecision.phaseTransition, "pause", "a below-threshold Phase 29 criterion holds despite high overall confidence");
await writeFile(phase29StatePath, `${JSON.stringify({ currentPhase: "sdk-mcp-final-acceptance" }, null, 2)}\n`, "utf8");
const phase29LowConfidenceState = await advancePhaseState(phase29StatePath, phase29LowConfidenceDecision);
assert.equal(phase29LowConfidenceState.currentPhase, "sdk-mcp-final-acceptance");
assert.equal(phase29LowConfidenceState.nextPhase, "delivery-complete");
assert.equal(phase29LowConfidenceState.lastTransition, "pause");
assert.equal(phase29LowConfidenceState.lastDecisionAt, phase29LowConfidenceDecision.recordedAt);
assert.equal(phase29LowConfidenceState.lastReason, phase29LowConfidenceDecision.transitionReason);

const phase29FailedCheckEvidence = {
  ...phase29ApprovedEvidence,
  checks: phase29ApprovedEvidence.checks.map((check) => check.name === "test:phase29-acceptance-evidence" ? { ...check, passed: false, evidence: "synthetic failing Phase 29 acceptance check" } : check),
};
const phase29FailedCheckDecision = await phase29MockReview(phase29FailedCheckEvidence);
assert.equal(phase29FailedCheckDecision.phaseTransition, "pause", "a failed Phase 29 selected check holds even if Jev returns a passing review");
await writeFile(phase29StatePath, `${JSON.stringify({ currentPhase: "sdk-mcp-final-acceptance" }, null, 2)}\n`, "utf8");
const phase29FailedCheckState = await advancePhaseState(phase29StatePath, phase29FailedCheckDecision);
assert.equal(phase29FailedCheckState.currentPhase, "sdk-mcp-final-acceptance");
assert.equal(phase29FailedCheckState.nextPhase, "delivery-complete");
assert.equal(phase29FailedCheckState.lastTransition, "pause");
assert.equal(phase29FailedCheckState.lastDecisionAt, phase29FailedCheckDecision.recordedAt);
assert.equal(phase29FailedCheckState.lastReason, phase29FailedCheckDecision.transitionReason);
assert.throws(() => assertApprovedPhaseSuccessor("sdk-mcp-final-acceptance", "website-release"), /may advance only to its approved successor/);

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
  phases27To29UseEnforcedSuccessorsAndRejectSkips: true,
  phase27LowConfidenceKeepsCurrentPhase: heldPhase27State.currentPhase === "official-provider-contract-audit",
  phase28ApprovalAdvancesOnlyToPhase29: phase28AdvancedState.currentPhase === "sdk-mcp-final-acceptance",
  phase28BelowThresholdCriterionKeepsCurrentPhase: phase28HeldState.currentPhase === "source-confirmed-data-fidelity",
  phase28FailedCheckKeepsCurrentPhase: phase28FailedCheckState.currentPhase === "source-confirmed-data-fidelity",
  phase29ApprovalAdvancesOnlyToDeliveryComplete: phase29AdvancedState.currentPhase === "delivery-complete" && phase29AdvancedState.nextPhase === "delivery-complete",
  phase29BelowThresholdCriterionKeepsCurrentPhase: phase29LowConfidenceState.currentPhase === "sdk-mcp-final-acceptance",
  phase29FailedCheckKeepsCurrentPhase: phase29FailedCheckState.currentPhase === "sdk-mcp-final-acceptance",
  phase29HeldStateMetadataAndExactSuccessorVerified: phase29LowConfidenceState.lastTransition === "pause" && phase29FailedCheckState.lastTransition === "pause" && phase29AdvancedState.lastTransition === "advance",
  phase29WrongSuccessorRejected: true,
  failedPhase18CheckRemainsActive: failedFirstForwardState.currentPhase === "mcp-confirmation-host-interop",
  agentNativeUiPhaseAdvancesOnlyAfterApproval: agentNativeUiTerminalState.currentPhase === "delivery-complete",
  failedPhaseGateRemainsActive: true,
  failedAgentNativeUiGateRemainsActive: agentNativeUiHeldState.currentPhase === "mcp-agent-native-research-ui",
  requiredCriteriaAndCompleteCoverage: true,
  thresholdFloorAndChoiceConfidence: true,
  actionTaken: record.actionTaken,
  passed: true,
}, null, 2));
