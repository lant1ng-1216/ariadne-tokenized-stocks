import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plan = await readFile("docs/CORE_PRODUCT_PHASE_PLAN.md", "utf8");
const phaseState = JSON.parse(await readFile("records/phase-state.json", "utf8")) as { currentPhase?: string; nextPhase?: string; lastTransition?: string; lastReason?: string };
const gateRows = (await readFile("records/jev-shadow.jsonl", "utf8")).trim().split("\n");
const latestGate = JSON.parse(gateRows.at(-1) ?? "{}") as { phaseTransition?: string; evidence?: { phase?: string } };
const phase10 = plan.split("\n").find((line) => line.startsWith("| 10 | `asset-detail-market-context` |"));
const phase11 = plan.split("\n").find((line) => line.startsWith("| 11 | `sdk-mcp-core-journey` |"));
const phase12 = plan.split("\n").find((line) => line.startsWith("| 12 | `mcp-native-research-view` |"));
const phase13 = plan.split("\n").find((line) => line.startsWith("| 13 | `mcp-agent-host-rendering-parity` |"));
const phase14 = plan.split("\n").find((line) => line.startsWith("| 14 | `mcp-research-observability` |"));

assert.ok(phase10, "the phase plan must retain Phase 10 evidence");
assert.ok(phase11, "the approved phase plan must include Phase 11");
assert.ok(phase12, "the approved continuation must define the MCP-native research view phase");
assert.ok(phase13, "the continuation must separate protocol checks from actual Agent-host rendering");
assert.ok(phase14, "the approved follow-up must specify observability and failure-diagnosis acceptance");
assert.match(phase10, /selected asset's price, history\/chart intervals/);
assert.match(phase10, /Complete \(Jev approved; confidence 0\.900\)/);
assert.match(phase11, /SDK and natural-language MCP agree on exact/);
assert.match(phase11, /partial multi-asset search results do not bypass ambiguity checks/);
const phase11Active = phaseState.currentPhase === "sdk-mcp-core-journey";
const phase12OrLater = ["delivery-complete", "mcp-native-research-view", "mcp-agent-host-rendering-parity", "mcp-research-observability"].includes(phaseState.currentPhase ?? "");
const phase13Complete = ["delivery-complete", "mcp-research-observability"].includes(phaseState.currentPhase ?? "");
const phase13Terminal = phaseState.currentPhase === "delivery-complete";
const phase14Active = phaseState.currentPhase === "mcp-research-observability";
const phase14Complete = phase13Terminal && latestGate.evidence?.phase === "mcp-research-observability" && latestGate.phaseTransition === "advance";
assert.ok(phase11Active || phase12OrLater, `unexpected current phase: ${phaseState.currentPhase}`);
assert.match(phase11, phase11Active
  ? /Active \(approved continuation from Phase 10\)/
  : /(?:Revalidation in progress \(prior Jev approval|Complete \((?:Jev approved|final Jev approval))/);
assert.match(phase12, /MCP Apps standard/);
assert.match(phase12, /text fallback and a matching `structuredContent` payload/);
assert.match(phase12, /Leave `apps\/web` untouched/);
assert.match(phase12, /Complete \(Jev approved; confidence 0\.960\)/);
assert.match(phase13, /Validate the in-conversation research view/);
assert.match(phase13, phase13Complete
  ? /Complete \(Jev approved; confidence 0\.\d{3}\)/
  : /Active \(user-confirmed host visibility; Jev confidence 0\.530\/0\.810\/0\.520\/0\.180\/0\.650 pauses diagnosed and evidence repaired\)/);
assert.match(phase13, /research\/discovery text-to-`structuredContent` equality/);
assert.match(phase13, /the shared served `ui:\/\//);
assert.match(phase13, /The user confirmed seeing the card; this remains user-observed/);
assert.match(phase13, /`test:mcp-app-ui` executed the bundled client handshake, rendered structured and text-only host notifications/);
assert.match(phase13, /`test:jev-shadow` verifies terminal advancement only after passing checks and holds failed checks/);
assert.match(plan, /The first Phase 13 Jev gate passed all five selected checks[\s\S]*confidence was \*\*0\.530\*\*[\s\S]*evidence-depth gap/);
assert.match(plan, /The second Phase 13 Jev review reran all five checks successfully[\s\S]*Overall confidence was \*\*0\.810\*\*[\s\S]*aggregate `status` choice/);
assert.match(plan, /A third review ran six checks successfully[\s\S]*overall confidence \*\*0\.520\*\*[\s\S]*circular acceptance item/);
assert.match(plan, /The fourth Jev review ran six selected checks successfully[\s\S]*overall confidence \*\*0\.180\*\*[\s\S]*linked only `test:mcp-app-ui`/);
assert.match(plan, /The fifth review passed all seven selected checks[\s\S]*overall confidence \*\*0\.650\*\*[\s\S]*absence of website, wallet or execution-scope changes/);
assert.match(plan, /Added exact parsed-text\/`structuredContent` assertions to `test:mcp-natural-language`/);
assert.match(phase13, /Completion means local delivery validation only/);
assert.match(phase14, /service-method invocation counts/);
assert.match(phase14, /safe categories only/);
assert.match(phase14, /No arbitrary latency goal, speedup claim/);
assert.match(plan, phase14Complete
  ? /Phase 14 — MCP research observability and safe failure diagnosis: completed and Jev-approved at confidence 0\.890/
  : /Phase 14 — MCP research observability and safe failure diagnosis: Jev re-review pending after pauses at 0\.580 and 0\.820/);
assert.ok(["mcp-agent-host-rendering-parity", "delivery-complete", "mcp-research-observability"].includes(phaseState.currentPhase ?? ""), `unexpected Phase 13/14 state: ${phaseState.currentPhase}`);
if (phase13Terminal) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "the terminal phase cannot auto-advance beyond its approved boundary");
  assert.equal(phaseState.lastTransition, "advance");
}
if (phase13Complete) {
  assert.match(phase13, /Complete \(Jev approved; confidence 0\.850\)/);
  assert.match(phase13, /7\/7 checks passed; all 3 criteria were `met`/);
  assert.match(plan, /Final Phase 13 Jev review reran all 7 selected checks successfully[\s\S]*overall confidence was \*\*0\.850\*\*[\s\S]*threshold was not changed/);
}
if (phase14Active) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "Phase 14 remains held until its review advances");
  assert.equal(phaseState.lastTransition, "pause");
  assert.match(phaseState.lastReason ?? "", /lacks a sufficiently confident Jev review/);
}
assert.match(phase14, phase14Complete
  ? /Complete \(Jev approved; confidence 0\.890\)/
  : /Active \(Jev re-review pending\)/);
if (phase14Complete) {
  assert.equal(phaseState.nextPhase, "delivery-complete");
  assert.equal(phaseState.lastTransition, "advance");
  assert.match(phase14, /Final Jev review passed all 10 selected checks and all 3 criteria at confidence 0\.890/);
}
assert.match(plan, /Phase 12's first Jev review paused at 0\.740[\s\S]*at 0\.960/);
assert.match(plan, /OpenAI's current \[MCP Apps UI guidance\]/);
assert.match(plan, /Phase 9 — asset directory data quality: complete/);
assert.match(plan, /If deterministic checks pass and Jev returns `advance`, continue automatically/);
assert.match(plan, /website work, and competition submission remain outside the approved Phase 12–14 scope/);

console.log(JSON.stringify({
  currentPhase: phaseState.currentPhase,
  nextPhase: phaseState.nextPhase,
  nextPhaseExplicitlyScoped: true,
  nextPhaseUserApprovedWithinRoadmap: true,
  phase12JevApprovedConfidence: 0.96,
  phase13HostRenderingConfirmedByUser: true,
  phase13BundledAppRuntimeHarness: true,
  phase13LiveTextStructuredParityAutomated: true,
  phase13TerminalTransitionRegression: true,
  phase13JevReviewPending: !phase13Complete,
  phase13TerminalLocallyValidated: phase13Terminal,
  phase14ActiveAndHeld: phase14Active,
  phase14JevApproved: phase14Complete,
  automaticAdvanceRulePresent: true,
  highRiskBoundariesExcluded: true,
  passed: true,
}, null, 2));
