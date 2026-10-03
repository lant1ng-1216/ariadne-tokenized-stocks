import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderLatestGateSummary, syncLatestGateSummary } from "../src/jev/report-sync.js";
import type { PhaseState } from "../src/jev/phase-state.js";
import type { ShadowDecisionRecord } from "../src/jev/types.js";
import { summarizeQuoteTimestampAges } from "../src/services/asset-coverage-audit.js";

const [plan, developerLog, technicalReport, productReport, deferredRegister, stateSource, gateSource] = await Promise.all([
  readFile("docs/CORE_PRODUCT_PHASE_PLAN.md", "utf8"),
  readFile("docs/DEVELOPER_EXPERIENCE_LOG.md", "utf8"),
  readFile("docs/TECHNICAL_RESEARCH_REPORT.md", "utf8"),
  readFile("docs/PRODUCT_EXPERIENCE_REPORT.md", "utf8"),
  readFile("docs/UPGRADE_DEFERRED_ITEMS.md", "utf8"),
  readFile("records/phase-state.json", "utf8"),
  readFile("records/jev-shadow.jsonl", "utf8"),
]);

const state = JSON.parse(stateSource) as PhaseState;
const gates = gateSource.trim().split("\n").map((line) => JSON.parse(line) as ShadowDecisionRecord);
const latestGate = gates.at(-1);
const phase28Final = [...gates].reverse().find((gate) => gate.evidence.phase === "source-confirmed-data-fidelity" && gate.phaseTransition === "advance");
const phase29History = gates.filter((gate) => gate.evidence.phase === "sdk-mcp-final-acceptance");
const phase29First = phase29History[0];
const phase29Second = phase29History[1];
const phase29Third = phase29History[2];
const phase29Fourth = phase29History[3];
const phase29Fifth = phase29History[4];
const phase29Sixth = phase29History[5];
const phase29Seventh = phase29History[6];
const phase29Eighth = phase29History[7];
const phase29Ninth = phase29History[8];
const phase29Tenth = phase29History[9];
const phase29Eleventh = phase29History[10];
const phase29Latest = [...gates].reverse().find((gate) => gate.evidence.phase === "sdk-mcp-final-acceptance");

assert.deepEqual(summarizeQuoteTimestampAges([950, 1_020, 900, "invalid"], 1_000), {
  validTimestampRows: 3,
  missingOrInvalidTimestampRows: 1,
  ageSampleRows: 2,
  minimumAgeMs: 50,
  medianAgeMs: 75,
  maximumAgeMs: 100,
  futureTimestampRows: 1
}, "future-dated timestamps stay visible but are excluded from quote-age statistics");
assert.deepEqual(summarizeQuoteTimestampAges([1_010], 1_000), {
  validTimestampRows: 1,
  missingOrInvalidTimestampRows: 0,
  ageSampleRows: 0,
  minimumAgeMs: null,
  medianAgeMs: null,
  maximumAgeMs: null,
  futureTimestampRows: 1
}, "a future-only sample has no negative age statistics");

assert.ok(latestGate && phase28Final && phase29First && phase29Second && phase29Third && phase29Fourth && phase29Fifth && phase29Sixth && phase29Seventh && phase29Eighth && phase29Ninth && phase29Tenth && phase29Eleventh && phase29Latest, "the evidence ledger must contain the latest review, Phase 28 approval, and the first eleven Phase 29 reviews");
assert.equal(phase28Final.evidence.nextPhase, "sdk-mcp-final-acceptance");
assert.equal(phase28Final.jev?.confidence, 0.89);
assert.equal(phase28Final.evidence.checks.length, 15);
assert.ok(phase28Final.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase28Final.jev?.criterionReviews ?? {}).length, 9);
assert.ok(Object.values(phase28Final.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met" && review.confidence >= 0.85));
assert.ok(gates.some((gate) => gate.evidence.phase === "source-confirmed-data-fidelity" && gate.phaseTransition === "pause" && gate.jev?.confidence === 0.35));
assert.ok(gates.some((gate) => gate.evidence.phase === "source-confirmed-data-fidelity" && gate.phaseTransition === "pause" && gate.jev?.confidence === 0.69));

const expectedPhase29Checks = [
  "typecheck", "build", "test:agent-model", "test:asset-intent-query", "test:domain", "test:plan-registry",
  "test:execution-dry-run", "test:guarded-sdk-executor", "test:presentation", "test:mcp-enrichment", "test:mcp-app-ui",
  "test:mcp-live-catalog-warning", "test:demo-mode", "test:phase27-contract", "test:phase28-fidelity",
  "test:phase26-limitations", "test:onboarding", "test:mcp-config", "test:sdk-example", "test:distribution",
  "pack:check", "test:cleanroom", "test:phase29-acceptance-evidence", "test:core-product-phase-plan", "test:jev-shadow",
];
assert.ok(phase29History.length >= 11, "preserve all eleven Phase 29 review records through terminal approval");
assert.equal(phase29First.phaseTransition, "pause");
assert.equal(phase29First.jev?.confidence, 0.61);
assert.equal(phase29First.evidence.checks.length, 23);
assert.equal(phase29Second.phaseTransition, "pause");
assert.equal(phase29Second.jev?.confidence, 0.63);
assert.deepEqual(phase29Second.evidence.checks.map((check) => check.name), expectedPhase29Checks, "record the exact 25-check Phase 29 candidate");
assert.ok(phase29Second.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Second.jev?.criterionReviews ?? {}).length, 10);
assert.ok(Object.values(phase29Second.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Third.phaseTransition, "pause");
assert.equal(phase29Third.jev?.confidence, 0.56);
assert.equal(phase29Third.evidence.checks.length, 25);
assert.equal(Object.keys(phase29Third.jev?.criterionReviews ?? {}).length, 12);
assert.ok(phase29Third.evidence.checks.every((check) => check.passed));
assert.ok(Object.values(phase29Third.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Third.jev?.questionConfidence?.status, 0.56);
assert.equal(phase29Third.jev?.questionConfidence?.["criterion_existing-agent-mcp-config-contract"], 0.84);
assert.equal(phase29Third.jev?.questionConfidence?.["criterion_latest-review-report-reconciliation"], 0.78);

assert.equal(phase29Fourth.phaseTransition, "pause");
assert.equal(phase29Fourth.recordedAt, "2026-10-03T05:18:56.713Z");
assert.equal(phase29Fourth.jev?.confidence, 0.81);
assert.deepEqual(phase29Fourth.evidence.checks.map((check) => check.name), expectedPhase29Checks, "the fourth review must retain the exact 25-check acceptance candidate");
assert.ok(phase29Fourth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Fourth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Fourth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Fourth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.81);
assert.equal(phase29Fourth.jev?.questionConfidence?.["criterion_latest-review-report-reconciliation"], 0.81);
assert.equal(phase29Fourth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Fourth.evidence.deferredItems.length, 5);
assert.equal(phase29Fifth.phaseTransition, "pause");
assert.equal(phase29Fifth.recordedAt, "2026-10-03T05:26:46.877Z");
assert.equal(phase29Fifth.jev?.confidence, 0.51);
assert.deepEqual(phase29Fifth.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Fifth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Fifth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Fifth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Fifth.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.81);
assert.equal(phase29Fifth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.66);
assert.equal(phase29Fifth.jev?.questionConfidence?.status, 0.78);
assert.equal(phase29Fifth.jev?.questionConfidence?.nextAction, 0.51);
assert.equal(phase29Fifth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Fifth.evidence.deferredItems.length, 5);
assert.equal(phase29Sixth.phaseTransition, "pause");
assert.equal(phase29Sixth.recordedAt, "2026-10-03T05:42:34.487Z");
assert.equal(phase29Sixth.jev?.confidence, 0.39);
assert.deepEqual(phase29Sixth.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Sixth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Sixth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Sixth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Sixth.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.39);
assert.equal(phase29Sixth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.83);
assert.equal(phase29Sixth.jev?.questionConfidence?.status, 0.87);
assert.equal(phase29Sixth.jev?.questionConfidence?.nextAction, 0.61);
assert.equal(phase29Sixth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Sixth.evidence.deferredItems.length, 5);
assert.equal(phase29Seventh.phaseTransition, "pause");
assert.equal(phase29Seventh.recordedAt, "2026-10-03T05:51:16.807Z");
assert.equal(phase29Seventh.jev?.confidence, 0.54);
assert.deepEqual(phase29Seventh.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Seventh.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Seventh.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Seventh.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Seventh.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.93);
assert.equal(phase29Seventh.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.54);
assert.equal(phase29Seventh.jev?.questionConfidence?.status, 0.93);
assert.equal(phase29Seventh.jev?.questionConfidence?.nextAction, 0.92);
assert.equal(phase29Seventh.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Seventh.evidence.deferredItems.length, 5);
assert.equal(phase29Eighth.phaseTransition, "pause");
assert.equal(phase29Eighth.recordedAt, "2026-10-03T05:59:28.856Z");
assert.equal(phase29Eighth.jev?.confidence, 0.38);
assert.deepEqual(phase29Eighth.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Eighth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Eighth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Eighth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Eighth.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.91);
assert.equal(phase29Eighth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.38);
assert.equal(phase29Eighth.jev?.questionConfidence?.status, 0.92);
assert.equal(phase29Eighth.jev?.questionConfidence?.nextAction, 0.66);
assert.equal(phase29Eighth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Eighth.evidence.deferredItems.length, 5);
assert.equal(phase29Ninth.phaseTransition, "pause");
assert.equal(phase29Ninth.recordedAt, "2026-10-03T06:12:50.236Z");
assert.equal(phase29Ninth.jev?.confidence, 0.65);
assert.deepEqual(phase29Ninth.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Ninth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Ninth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Ninth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Ninth.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.9);
assert.equal(phase29Ninth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.65);
assert.equal(phase29Ninth.jev?.questionConfidence?.status, 0.93);
assert.equal(phase29Ninth.jev?.questionConfidence?.nextAction, 0.86);
assert.equal(phase29Ninth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Ninth.evidence.deferredItems.length, 5);
assert.equal(phase29Tenth.phaseTransition, "pause");
assert.equal(phase29Tenth.recordedAt, "2026-10-03T06:19:24.670Z");
assert.equal(phase29Tenth.jev?.confidence, 0.76);
assert.deepEqual(phase29Tenth.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Tenth.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Tenth.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Tenth.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"));
assert.equal(phase29Tenth.jev?.criterionReviews?.["phase-sequence-and-terminal-ledger"]?.confidence, 0.92);
assert.equal(phase29Tenth.jev?.criterionReviews?.["latest-review-report-reconciliation"]?.confidence, 0.76);
assert.equal(phase29Tenth.jev?.questionConfidence?.status, 0.94);
assert.equal(phase29Tenth.jev?.questionConfidence?.nextAction, 0.88);
assert.equal(phase29Tenth.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Tenth.evidence.deferredItems.length, 5);
assert.equal(phase29Eleventh.phaseTransition, "advance");
assert.equal(phase29Eleventh.recordedAt, "2026-10-03T06:26:38.003Z");
assert.equal(phase29Eleventh.evidence.nextPhase, "delivery-complete");
assert.equal(phase29Eleventh.jev?.confidence, 0.85);
assert.deepEqual(phase29Eleventh.evidence.checks.map((check) => check.name), expectedPhase29Checks);
assert.ok(phase29Eleventh.evidence.checks.every((check) => check.passed));
assert.equal(Object.keys(phase29Eleventh.jev?.criterionReviews ?? {}).length, 12);
assert.ok(Object.values(phase29Eleventh.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met" && review.confidence >= 0.85));
assert.deepEqual(
  Object.fromEntries(Object.entries(phase29Eleventh.jev?.criterionReviews ?? {}).map(([id, review]) => [id, review.confidence])),
  {
    "sdk-consumer-package": 1,
    "provider-field-fidelity": 0.99,
    "mcp-output-native-ui-parity": 0.97,
    "natural-language-catalog-resolution": 0.99,
    "fail-closed-execution-safety": 0.96,
    "standalone-sdk-docs-example-contract": 0.99,
    "agent-mcp-config-snippets": 1,
    "provider-unknowns-remain-explicit": 0.85,
    "phase-sequence-and-terminal-ledger": 0.93,
    "latest-report-appendix-integrity": 0.92,
    "single-current-summary-source": 0.97,
    "terminal-local-scope-only": 0.95,
  },
);
assert.equal(phase29Eleventh.jev?.deferredAssessment, "non_blocking");
assert.equal(phase29Eleventh.evidence.deferredItems.length, 5);
assert.equal(phase29Latest, latestGate);
assert.deepEqual(phase29Latest.evidence.checks.map((check) => check.name), expectedPhase29Checks, "the latest prior gate is the exact candidate baseline for the next review");
assert.equal(phase29Latest.evidence.deferredItems.length, 5);
assert.equal(phase29Latest.jev?.deferredAssessment, "non_blocking");

assert.equal(latestGate.evidence.externalWriteRequested, false);
assert.equal(latestGate.evidence.highRiskActionRequested, false);
assert.match(latestGate.evidence.phase, /^(sdk-mcp-final-acceptance|source-confirmed-data-fidelity)$/);
assert.equal(phase29Latest, latestGate, "the current terminal review must be the latest phase-gate record");
assert.equal(state.currentPhase, phase29Latest.phaseTransition === "advance" ? "delivery-complete" : "sdk-mcp-final-acceptance");
assert.equal(state.nextPhase, "delivery-complete");
assert.equal(state.lastTransition, phase29Latest.phaseTransition);
assert.equal(state.lastDecisionAt, latestGate.recordedAt);
assert.equal(state.lastReason, latestGate.transitionReason);
for (const report of [technicalReport, productReport]) {
  const entry = report.slice(report.lastIndexOf("### Jev phase-gate record"));
  assert.ok(entry.includes(latestGate.recordedAt), "both reports must append the exact latest gate timestamp");
  assert.ok(entry.includes(`Phase: \`${latestGate.evidence.phase}\``));
  assert.ok(entry.includes(`Phase transition: \`${latestGate.phaseTransition}\``));
  if (latestGate.jev) assert.ok(entry.includes(`confidence \`${latestGate.jev.confidence.toFixed(3)}\``));
  const criterionEntries = Object.entries(phase29Latest.jev?.criterionReviews ?? {}) as Array<[string, { verdict: string; confidence: number }]>;
  for (const [criterionId, review] of criterionEntries) {
    assert.ok(entry.includes(`criterion_${criterionId}=${review.confidence.toFixed(3)}`), `the appended gate record must include criterion ${criterionId}'s exact confidence`);
  }
  const selectedChecksBlock = [
    "- Selected checks:",
    ...phase29Latest.evidence.checks.map((check) => `  - \`${check.name}\`: ${check.passed ? "passed" : "failed"} (${check.evidence})`),
  ].join("\n");
  assert.ok(entry.includes(selectedChecksBlock), "both report appendices must reproduce every canonical selected check and result");
  assert.ok(entry.includes(`- Deferred assessment: \`${phase29Latest.jev?.deferredAssessment}\``));
  for (const item of phase29Latest.evidence.deferredItems) {
    assert.ok(entry.includes(`  - ${item}`), "both report appendices must preserve each exact deferred item");
  }
}

const latestGateSummary = renderLatestGateSummary(latestGate, state);
for (const [name, summary] of [
  ["phase plan", plan],
  ["developer log", developerLog],
  ["technical report", technicalReport],
  ["product report", productReport],
  ["deferred register", deferredRegister],
] as const) {
  assert.ok(summary.includes(latestGateSummary), `${name} must contain the exact machine-synchronized latest gate snapshot`);
  assert.equal((summary.match(/JEV-LATEST-GATE-SUMMARY:START/g) ?? []).length, 1, `${name} must have exactly one current-summary block`);
  assert.equal((summary.match(/JEV-LATEST-GATE-SUMMARY:END/g) ?? []).length, 1, `${name} must close exactly one current-summary block`);
}

const phase29PlanCurrentStatus = plan.split("## Phase 29 — sdk-mcp-final-acceptance")[1]?.split("**First Jev review")[0] ?? "";
assert.doesNotMatch(phase29PlanCurrentStatus, /2026-10-03T05:59:28\.856Z|2026-10-03T06:12:50\.236Z|first eight Jev reviews|Review eight's|Review nine's/, "the plan's static Phase 29 status must not duplicate an older gate as current");
const technicalCurrentSummary = technicalReport.split("## 2026-10-03 — Phase 27 official Binance RWA contract audit")[0] ?? "";
const productCurrentSummary = productReport.split("## 2026-10-02 — Bilingual MCP output and final local acceptance approved")[0] ?? "";
const developerSnapshotEnd = developerLog.indexOf("JEV-LATEST-GATE-SUMMARY:END") + "JEV-LATEST-GATE-SUMMARY:END".length;
const developerCurrentProse = developerLog.slice(developerSnapshotEnd, developerLog.indexOf("\n## ", developerSnapshotEnd) < 0 ? undefined : developerLog.indexOf("\n## ", developerSnapshotEnd));
const deferredCurrentStatus = deferredRegister.split("\n").find((line) => line.startsWith("- Current continuation status")) ?? "";
assert.doesNotMatch(technicalCurrentSummary, /2026-10-03T05:59:28\.856Z|2026-10-03T06:12:50\.236Z|Eight Jev reviews have passed|Review eight classified|Review nine classified/, "the technical report's static current prose must not contradict the generated snapshot");
assert.doesNotMatch(productCurrentSummary, /2026-10-03T05:59:28\.856Z|2026-10-03T06:12:50\.236Z|Eight reviews passed their selected checks|Review eight assessed|Review nine assessed/, "the product report's static current prose must not contradict the generated snapshot");
assert.doesNotMatch(developerCurrentProse, /2026-10-03T05:59:28\.856Z|2026-10-03T06:12:50\.236Z|Review eight|Review nine|0\.380|0\.650/, "the developer log must not place an older mutable summary next to the current snapshot");
assert.doesNotMatch(deferredCurrentStatus, /2026-10-03T05:59:28\.856Z|2026-10-03T06:12:50\.236Z|Eight Phase 29 reviews|0\.380|0\.650/, "the deferred-register status must not repeat a superseded gate as current");

const temporaryDirectory = await mkdtemp(join(tmpdir(), "ariadne-jev-summary-test-"));
try {
  const temporarySummaryPath = join(temporaryDirectory, "summary.md");
  await writeFile(temporarySummaryPath, "# Temporary summary\n\nBody\n", "utf8");
  await syncLatestGateSummary(latestGate, state, [temporarySummaryPath]);
  const firstSync = await readFile(temporarySummaryPath, "utf8");
  await syncLatestGateSummary(latestGate, state, [temporarySummaryPath]);
  const secondSync = await readFile(temporarySummaryPath, "utf8");
  assert.equal(secondSync, firstSync, "summary synchronization must be idempotent");
  assert.equal((secondSync.match(/JEV-LATEST-GATE-SUMMARY:START/g) ?? []).length, 1, "summary sync must not duplicate its managed block");
  assert.ok(secondSync.includes(latestGateSummary));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

assert.match(plan, /Phase 28 — source-confirmed data fidelity: Complete; Jev approved at confidence \*\*0\.890\*\*[\s\S]*15\/15 selected checks[\s\S]*9 criteria/);
assert.match(plan, /\*\*Stop boundary:\*\* local acceptance only; do not infer permission to push, publish, deploy, edit the website, use a wallet, broadcast a transaction or settle funds/);
assert.ok(plan.includes("Phase 29 — SDK/MCP final acceptance: Initial terminal local acceptance was Jev-approved on 2026-10-03"));
assert.ok(plan.includes("automatically synchronized snapshot near the top is the current decision source"));
assert.ok(plan.includes("latest *previously recorded* gate"));
assert.ok(plan.includes("same Jev review judge every criterion at its own 0.850 floor"));
assert.match(plan, /test:phase29-acceptance-evidence/);
assert.match(plan, /Do not run `test:mcp-natural-language` in this phase because it performs real provider reads/);
assert.match(developerLog, /Final Phase 28 Jev re-review passed all 15\/15 selected checks[\s\S]*confidence was \*\*0\.890\*\*/);
assert.match(developerLog, /Phase 29 first Jev review and evidence-focused rework/);
assert.match(developerLog, /overall confidence was \*\*0\.610\*\*[\s\S]*natural-language query handling \*\*0\.800\*\*[\s\S]*terminal local scope\/reports \*\*0\.610\*\*/);
assert.match(developerLog, /Phase 29 second Jev review and terminal-state evidence repair[\s\S]*overall confidence was \*\*0\.630\*\*[\s\S]*Phase 29-specific state-machine cases/);
assert.match(developerLog, /Phase 29 third Jev review and acceptance-matrix repair[\s\S]*overall confidence was \*\*0\.560\*\*[\s\S]*MCP config criterion/);
assert.ok(developerLog.includes("Phase 29 fifth Jev review; clarify review/ledger timing"));
assert.ok(developerLog.includes("Phase 29 eleventh Jev review; local SDK/MCP acceptance complete"));
assert.ok(developerLog.includes("2026-10-03T06:26:38.003Z"));
assert.ok(developerLog.includes("Jev confidence was **0.510**"));
assert.ok(developerLog.includes("2026-10-03T05:26:46.877Z"));
assert.ok(developerLog.includes("impossible pre-review requirement"));
assert.ok(developerLog.includes("Phase 29 sixth Jev review; isolate terminal-ledger evidence"));
assert.ok(developerLog.includes("Jev confidence was **0.390**"));
assert.ok(developerLog.includes("2026-10-03T05:42:34.487Z"));
assert.ok(developerLog.includes("creates avoidable self-reference"));
assert.ok(developerLog.includes("Phase 29 seventh Jev review; make gate reports fully auditable"));
assert.ok(developerLog.includes("Jev confidence was **0.540**"));
assert.ok(developerLog.includes("2026-10-03T05:51:16.807Z"));
assert.ok(developerLog.includes("the runner did not synchronize the latest decision into all five current-summary locations"));
assert.match(developerLog, /natural-language query handling/);
assert.match(developerLog, /clean-room installation\/import/);
assert.ok(technicalReport.includes("Detailed review outcomes, exact check results, criterion findings and deferrals remain in the chronological gate entries below"));
assert.ok(technicalReport.includes("### Jev phase-gate record — 2026-10-03T05:59:28.856Z"));
assert.ok(technicalReport.includes("latest previously recorded baseline"));
assert.ok(productReport.includes("chronological gate appendices preserve each review"));
assert.ok(productReport.includes("### Jev phase-gate record — 2026-10-03T05:59:28.856Z"));
assert.match(deferredRegister, /545 BSC token records[\s\S]*488 unique directory representations[\s\S]*57 difference/);
assert.match(deferredRegister, /pagination\/completeness marker[\s\S]*no freshness SLA/);
assert.match(deferredRegister, /npm publication/);
assert.match(deferredRegister, /wallet/);
assert.ok(deferredRegister.includes("the initial Phase 29 terminal local SDK/MCP acceptance was approved at **0.850**"));

if (phase29Latest.phaseTransition === "advance") {
  assert.equal(phase29Latest.evidence.nextPhase, "delivery-complete");
  assert.equal(state.currentPhase, "delivery-complete");
  assert.equal(state.nextPhase, "delivery-complete");
  assert.ok((phase29Latest.jev?.confidence ?? 0) >= 0.85);
  assert.ok(phase29Latest.evidence.checks.every((check) => check.passed));
  assert.ok(Object.values(phase29Latest.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met" && review.confidence >= 0.85));
  assert.ok(plan.includes("Phase 29 — SDK/MCP final acceptance: Initial terminal local acceptance was Jev-approved on 2026-10-03"));
} else {
  assert.equal(phase29Latest.phaseTransition, "pause");
  assert.ok(phase29Latest.evidence.nextPhase === "delivery-complete");
  assert.equal(state.currentPhase, "sdk-mcp-final-acceptance");
  assert.equal(state.nextPhase, "delivery-complete");
  assert.ok((phase29Latest.jev?.confidence ?? 1) < 0.85, "a paused terminal review remains below the unchanged confidence floor");
  if (phase29Latest.evidence.checks.some((check) => !check.passed)) {
    assert.equal(state.currentPhase, "sdk-mcp-final-acceptance", "a failed selected check must hold the terminal phase");
  } else {
    assert.ok((phase29Latest.jev?.confidence ?? 1) < 0.85, "a check-passing pause must remain below the unchanged confidence floor");
  }
  assert.ok(plan.includes("Phase 29 — SDK/MCP final acceptance: Initial terminal local acceptance was Jev-approved on 2026-10-03"));
}
assert.equal(phase29First.phaseTransition, "pause");
assert.equal(phase29First.jev?.confidence, 0.61);
assert.equal(phase29First.evidence.checks.length, 23, "preserve the historical first review's exact check count");
assert.equal(phase29Second.phaseTransition, "pause");
assert.equal(phase29Second.jev?.confidence, 0.63);
assert.equal(phase29Second.evidence.checks.length, 25, "preserve the historical second review's exact check count");
assert.equal(phase29Third.phaseTransition, "pause");
assert.equal(phase29Third.jev?.confidence, 0.56);
assert.equal(phase29Fourth.phaseTransition, "pause");
assert.equal(phase29Fourth.jev?.confidence, 0.81);
assert.equal(phase29Fifth.phaseTransition, "pause");
assert.equal(phase29Fifth.jev?.confidence, 0.51);
assert.equal(phase29Sixth.phaseTransition, "pause");
assert.equal(phase29Sixth.jev?.confidence, 0.39);

console.log(JSON.stringify({
  phase28ExactApprovalAndPauseHistory: true,
  phase29FirstSixPauseHistoryPreserved: true,
  latestPriorGateAndPhaseStateExactlyReconciled: {
    recordedAt: latestGate.recordedAt,
    transition: latestGate.phaseTransition,
    checks: `${latestGate.evidence.checks.filter((check) => check.passed).length}/${latestGate.evidence.checks.length}`,
    allCheckOutcomesCopiedToBothReports: latestGate.evidence.checks.length === 25,
    criterionScoresCopiedToBothReports: Object.keys(latestGate.jev?.criterionReviews ?? {}).length,
    exactDeferredItemsCopiedToBothReports: latestGate.evidence.deferredItems.length,
    fiveCurrentSnapshotsMatchCanonicalRecord: true,
    singleSnapshotAndNoStaleDuplicateCurrentProse: true,
    phaseStateMatches: true,
  },
  phase29ExactCheckCandidatesMatchRecords: true,
  phase29ReviewHistoryThroughEleventhPreserved: true,
  latestGateMatchesBothInterimReports: true,
  phase29LedgerAndTerminalBoundaryConsistent: true,
  providerUncertaintiesRemainExplicit: true,
  syncInsertionReplacementAndIdempotency: true,
  userFacingDocumentsReconcile: true,
  externalOrHighRiskActionsNotRequested: true,
  passed: true,
}, null, 2));
