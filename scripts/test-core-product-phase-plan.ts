import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const plan = await readFile("docs/CORE_PRODUCT_PHASE_PLAN.md", "utf8");
const deferredItems = await readFile("docs/UPGRADE_DEFERRED_ITEMS.md", "utf8");
const developerLog = await readFile("docs/DEVELOPER_EXPERIENCE_LOG.md", "utf8");
const productExperience = await readFile("docs/PRODUCT_EXPERIENCE_REPORT.md", "utf8");
const technicalReport = await readFile("docs/TECHNICAL_RESEARCH_REPORT.md", "utf8");
const technicalReportLatestGate = technicalReport.slice(technicalReport.lastIndexOf("### Jev phase-gate record"));
const productReportLatestGate = productExperience.slice(productExperience.lastIndexOf("### Jev phase-gate record"));
const packageJson = await readFile("package.json", "utf8");
const gateRunner = await readFile("scripts/run-jev-gate.ts", "utf8");
const reportSync = await readFile("src/jev/report-sync.ts", "utf8");
const phase26LimitationsRegression = await readFile("scripts/test-phase26-provider-limitations.ts", "utf8");
const jevShadowRegression = await readFile("scripts/test-jev-shadow.ts", "utf8");
const phase26LiveCatalogRegression = await readFile("scripts/test-mcp-live-catalog-warning.ts", "utf8");
const phase27ContractRegression = await readFile("scripts/test-phase27-api-contract.ts", "utf8");
const phase28FidelityRegression = await readFile("scripts/test-phase28-data-fidelity.ts", "utf8");
const phase29AcceptanceEvidenceRegression = await readFile("scripts/test-phase29-acceptance-evidence.ts", "utf8");
const domainRegression = await readFile("scripts/test-domain.ts", "utf8");
const planRegistryRegression = await readFile("scripts/test-plan-registry.ts", "utf8");
const phase27Contract = JSON.parse(await readFile("records/phase27-binance-rwa-contract.json", "utf8")) as {
  phase: string;
  source: { official: boolean; url: string };
  comparisonWithPhase26Observation: { declaredBscTokenCount: number; returnedUniqueBscRepresentations: number; difference: number; noRepeatProviderRequest: boolean };
};
const phase28Fidelity = JSON.parse(await readFile("records/phase28-source-confirmed-fidelity.json", "utf8")) as {
  phase: string;
  providerRequests: number;
  externalWrites: number;
  walletOrTransactionActions: number;
  syntheticFixtureOnly: boolean;
  safetyAndUnknownValueCases: Record<string, string>;
  checks: string[];
  limitations: string[];
};
const cleanroomScript = await readFile("scripts/test-cleanroom-consumer.mjs", "utf8");
const confirmationTest = await readFile("scripts/test-mcp-human-confirmation.ts", "utf8");
const mcpServer = await readFile("src/mcp/server.ts", "utf8");
const quickstart = await readFile("docs/QUICKSTART.md", "utf8");
const sdkUsage = await readFile("docs/SDK_USAGE.md", "utf8");
const tokenizedStocksService = await readFile("src/services/tokenized-stocks.ts", "utf8");
const demoStocksService = await readFile("src/services/demo-tokenized-stocks.ts", "utf8");
const phaseState = JSON.parse(await readFile("records/phase-state.json", "utf8")) as { currentPhase?: string; nextPhase?: string; lastTransition?: string; lastReason?: string };
const phase26Observation = JSON.parse(await readFile("records/phase26-provider-observation.json", "utf8")) as {
  phase: string;
  observedAt: string;
  requestPolicy: { method: string; serial: boolean; requestCount: number; maxRetries: number; timeoutMs: number };
  methodology: { declaredBscCount: string; uniqueDirectoryRepresentations: string; quoteAgeMs: string; sourceValuesRetained: string };
  requests: Array<{ index: number; endpoint: string; purpose: string; httpStatus: number; queryParameters: Record<string, string> }>;
  observations: {
    platformMetadataDeclaredBscRecords: number;
    directoryUniqueRepresentationsReturned: number;
    declaredMinusReturnedDifference: number;
    representationCountsByPlatform: Record<string, number>;
    directoryRowsWithPerTokenUpdateTimestamp: number;
    directoryRowsWithLiquidity: number;
    rowsWithoutRecognizedMarketStatus: number;
    recognizedMarketStatusRows: number;
    recognizedMarketStatusCounts: { closed: number; offhours: number };
    sampledNvdaQuoteAgeMsAtObservation: number[];
    comparedTabIdentitySetsEqual: boolean;
  };
  limitations: string[];
  rawProviderPayloadIncluded: boolean;
  credentialsIncluded: boolean;
};
const gateRows = (await readFile("records/jev-shadow.jsonl", "utf8")).trim().split("\n");
const gateRecords = gateRows.map((row) => JSON.parse(row) as {
  recordedAt?: string;
  phaseTransition?: string;
  transitionReason?: string;
  evidence?: {
    phase?: string;
    nextPhase?: string;
    checks?: Array<{ name: string; passed: boolean }>;
    externalWriteRequested?: boolean;
    highRiskActionRequested?: boolean;
  };
  jev?: {
    confidence?: number;
    criterionReviews?: Record<string, { verdict?: string; confidence?: number }>;
  };
});
const latestGate = gateRecords.at(-1) ?? {};
const latestGateSummary = plan.split("<!-- JEV-LATEST-GATE-SUMMARY:START -->")[1]?.split("<!-- JEV-LATEST-GATE-SUMMARY:END -->")[0] ?? "";
const gateForPhase = (id: string) => [...gateRecords].reverse().find((record) => record.evidence?.phase === id);
const assertContains = (source: string, pattern: RegExp, description: string) => assert.ok(pattern.test(source), description);
const phase10 = plan.split("\n").find((line) => line.startsWith("| 10 | `asset-detail-market-context` |"));
const phase11 = plan.split("\n").find((line) => line.startsWith("| 11 | `sdk-mcp-core-journey` |"));
const phase12 = plan.split("\n").find((line) => line.startsWith("| 12 | `mcp-native-research-view` |"));
const phase13 = plan.split("\n").find((line) => line.startsWith("| 13 | `mcp-agent-host-rendering-parity` |"));
const phase14 = plan.split("\n").find((line) => line.startsWith("| 14 | `mcp-research-observability` |"));
const phase15 = plan.split("\n").find((line) => line.startsWith("| 15 | `mcp-post-simulation-user-confirmation` |"));
const phase16Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 16 — core-product quality audit/.test(line));
const phase17Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 17 — MCP Agent-native research UI/.test(line));
const phase27Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 27 — official Binance RWA contract audit/.test(line));
const phase27Section = plan.split("## Phase 27 — official-provider-contract-audit")[1]?.split("\n## Phase 28 — source-confirmed-data-fidelity")[0] ?? "";
const phase27Gate = gateForPhase("official-provider-contract-audit");
const phase27Complete = phase27Gate?.phaseTransition === "advance";
const phase28Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 28 — source-confirmed data fidelity/.test(line));
const phase28Section = plan.split("## Phase 28 — source-confirmed-data-fidelity")[1]?.split("\n## Phase 29 — sdk-mcp-final-acceptance")[0] ?? "";
const phase28Gate = gateForPhase("source-confirmed-data-fidelity");
const phase28Complete = phase28Gate?.phaseTransition === "advance";
const phase29Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 29 — SDK\/MCP final acceptance/.test(line));
const phase29Section = plan.split("## Phase 29 — sdk-mcp-final-acceptance")[1]?.split("\n## ")[0] ?? "";
const phase29Gate = gateForPhase("sdk-mcp-final-acceptance");
const phase29Complete = phase29Gate?.phaseTransition === "advance";
const forwardPhases = [
  { number: 18, id: "mcp-confirmation-host-interop" },
  { number: 19, id: "sdk-cleanroom-revalidation" },
  { number: 20, id: "demo-mode-journey-coverage" },
  { number: 21, id: "provider-data-resilience" },
  { number: 22, id: "agent-output-language-quality" },
  { number: 23, id: "core-local-acceptance" },
  { number: 24, id: "developer-path-onboarding" },
  { number: 25, id: "mcp-native-ui-host-review" },
  { number: 26, id: "provider-data-limitations-closure" },
  { number: 27, id: "official-provider-contract-audit" },
  { number: 28, id: "source-confirmed-data-fidelity" },
  { number: 29, id: "sdk-mcp-final-acceptance" },
];
const forwardPhaseIds = forwardPhases.map(({ id }) => id);
const forwardPhaseIndex = forwardPhaseIds.indexOf(phaseState.currentPhase ?? "");
const inForwardContinuation = forwardPhaseIndex >= 0;

assert.ok(phase10, "the phase plan must retain Phase 10 evidence");
assert.ok(phase11, "the approved phase plan must include Phase 11");
assert.ok(phase12, "the approved continuation must define the MCP-native research view phase");
assert.ok(phase13, "the continuation must separate protocol checks from actual Agent-host rendering");
assert.ok(phase14, "the approved follow-up must specify observability and failure-diagnosis acceptance");
assert.ok(phase15, "the approved confirmation-boundary follow-up must be recorded");
assert.ok(phase16Checklist, "the user-approved core-product quality audit must be recorded");
assert.ok(phase17Checklist, "the newly user-approved Agent-native MCP UI phase must be recorded");
for (const { number, id } of forwardPhases) {
  assert.ok(plan.includes("| " + number + " | `" + id + "` |"), `approved automatic continuation must define Phase ${number} (${id})`);
  assert.match(plan, new RegExp(`## Phase ${number} — ${id}`), `Phase ${number} must have a bounded objective and acceptance criteria`);
}
assert.match(plan, /The user approved Phase 18–23 as one bounded continuation[\s\S]*continue to the next phase automatically/);
assert.match(plan, /Continuation authorization \(2026-10-03\)[\s\S]*Phases 24–26 in order[\s\S]*`a781e4f` was pushed to `origin\/main` before Phase 24 began/);
assert.match(plan, /Continuation authorization \(2026-10-03\)[\s\S]*Phases 27–29[\s\S]*does not authorize another provider probe, Git push/);
assert.match(plan, /Observed connected-host outcome \(2026-10-01\)[\s\S]*no form or choice appeared/i);
assert.match(plan, /No user wallet, approval of the synthetic plan, signing, broadcast, or host-configuration mutation/);
assert.match(plan, /Observed connected-host outcome \(2026-10-02\)[\s\S]*`confirmationStatus: declined`[\s\S]*`planStatus: simulated`[\s\S]*No screenshot was captured/i);
assert.match(plan, /Both are protocol evidence, not visual proof of the connected Agent host/i);
assert.match(plan, /Observed connected-host outcome \(2026-10-01\)[\s\S]*returned `confirmationStatus: unavailable`[\s\S]*`planStatus: simulated`/);
assert.match(plan, /MCP server, confirmation handler and hosted Demo transport now use SDK v2[\s\S]*modern client test verifies explicit approval, decline and cancel[\s\S]*legacy client fixture verifies backwards compatibility/);
assert.match(plan, /Historical pre-refresh observation \(2026-10-02\)[\s\S]*fixed plan ID `synthetic_confirmation_host_fixture` with an expired `expiresAt`[\s\S]*superseded by the fresh synthetic-plan result/);
assert.match(plan, /At the time of this observation, Jev review was still required before Phase 19/i);
assert.match(packageJson, /"mcp:confirmation-test": "node --import tsx scripts\/confirmation-test-server\.ts"/);
assert.match(packageJson, /"test:mcp-confirmation-host-fixture": "node --import tsx scripts\/test-mcp-confirmation-host-fixture\.ts"/);
assert.match(packageJson, /"test:phase26-limitations": "node --import tsx scripts\/test-phase26-provider-limitations\.ts"/);
assert.match(packageJson, /"test:phase27-contract": "node --import tsx scripts\/test-phase27-api-contract\.ts"/);
assert.match(packageJson, /"test:phase28-fidelity": "node --import tsx scripts\/test-phase28-data-fidelity\.ts"/);
assert.match(packageJson, /"test:mcp-live-catalog-warning": "node --import tsx scripts\/test-mcp-live-catalog-warning\.ts"/);
assertContains(cleanroomScript, /mkdtemp\(join\(tmpdir\(\), "ariadne-consumer-"\)\)[\s\S]*join\(tempRoot, "npm-cache"\)[\s\S]*180_000/, "Phase 19 clean-room installation must use a fresh per-run cache and a bounded install timeout");
assertContains(cleanroomScript, /fetch-retries=0[\s\S]*fetch-timeout=30000[\s\S]*const inconclusive = timedOut \|\| networkLimited[\s\S]*status: inconclusive \? "inconclusive"[\s\S]*finally \{[\s\S]*rm\(tempRoot/, "Phase 19 must classify timeouts/network failures as inconclusive and clean only its temporary consumer directory");
assertContains(confirmationTest, /exerciseUnsupportedHostFailsClosed[\s\S]*confirmationStatus, "unavailable"[\s\S]*plan\?\.status, "simulated"[\s\S]*connectedHostFormElicitationAdvertised, false/, "Phase 18 regression must prove an unsupported-form host remains unavailable and the synthetic plan stays simulated");
assertContains(confirmationTest, /malformedChoiceRejected: true[\s\S]*tamperedStateRejectedWithoutConsumingValidContinuation: true[\s\S]*changedPlanHasSpecificErrorAndRemainsSimulated: true[\s\S]*exactApprovalAdvancesOnceAndReplayCannotAdvanceAgain: true[\s\S]*replayRejected: true[\s\S]*expiredContinuationRejected: true/, "Phase 18 regression must prove exact one-time approval and fail-closed malformed, forged, changed, replayed, and expired confirmation continuations");
assertContains(confirmationTest, /Input amount: 1\.25 \(decimals: 6\)[\s\S]*Wallet: 0x1111111111111111111111111111111111111111[\s\S]*Representation: TESTB; issuer\/platform: synthetic-test-only[\s\S]*Transaction target: 0x3333333333333333333333333333333333333333[\s\S]*Provider-reported expected output \(raw token units\): 1250000[\s\S]*Plan expiry \(UTC\)/, "Phase 18 regression must validate decision-critical confirmation details are actually in the elicitation form");
assert.match(gateRunner, /"test:mcp-confirmation-host-fixture"/);
assert.match(gateRunner, /"test:phase26-limitations"/);
assert.match(gateRunner, /"test:phase27-contract"/);
assert.match(gateRunner, /"test:phase28-fidelity"/);
assert.match(gateRunner, /"test:phase27-contract"/);
assert.match(gateRunner, /assertApprovedPhaseSuccessor\(options\.phase, options\.next\)/);
assertContains(jevShadowRegression, /assert\.throws\(\(\) => assertApprovedPhaseSuccessor\("official-provider-contract-audit", "sdk-mcp-final-acceptance"\)[\s\S]*phases27To29UseEnforcedSuccessorsAndRejectSkips/, "The Jev regression must allow only P27→P28→P29 and reject phase skips");
assertContains(phase27ContractRegression, /countUnitsSeparated[\s\S]*paginationNotOverclaimed[\s\S]*assetTypePreservedAcrossSearchListAndDomain[\s\S]*detailedMarketStateAndReasonPreservedAcrossResponseAndDomain[\s\S]*syntheticFixtureConfirmsSdkAgentTextStructuredAndNativeUiParity[\s\S]*providerPauseRemainsFailClosedAndRawStatusVisible[\s\S]*localOnlyAuditChecksAndNoProviderRequest/, "Phase 27 source audit regression must retain documented contract evidence and verify its Phase 28 repair path without live calls");
assertContains(phase28FidelityRegression, /searchAndDirectoryAssetTypeParity[\s\S]*unknownAssetTypePreserved[\s\S]*allDocumentedAssetTypesAndUnknownLabeledAcrossCards[\s\S]*marketContextAssetTypeFallbackAndProvenanceParity[\s\S]*marketContextAllFieldsPreservedAcrossAgentAndNativeUi[\s\S]*detailedProviderStatusAndReasonParity[\s\S]*englishChineseAgentTextAndComparison[\s\S]*structuredContentAndNativeUiParity[\s\S]*hostileProviderTextEscapedInUi[\s\S]*hostileMarkdownProviderTextIsolated[\s\S]*invalidProviderTimestampsWithheld[\s\S]*pauseStillBlocksSafety[\s\S]*unknownStatusRemainsUnknownAndBlocksExecution/, "Phase 28 focused regression must cover SDK/domain to Agent/native UI fidelity, documented/unknown types, hostile text, timestamps and fail-closed execution");
assertContains(phase28FidelityRegression, /quoteAndMarketTimestampsRequirePositiveSafeMilliseconds/, "Phase 28 must cover positive safe millisecond timestamp validation");
assertContains(phase28FidelityRegression, /contradictoryMarketFlagsFailClosedAndRenderConservatively[\s\S]*completeMarketContextValuesAndDistinctSourceTimesVerified/, "Phase 28 must reconcile contradictory market flags and verify exact market values/source timestamps end to end");
assertContains(domainRegression, /sdkUnknownMarketStatusFailsClosed[\s\S]*unknownStatusDoesNotBuildAction[\s\S]*invalidCatalogAndPriceSnapshotTimestampsWithheld[\s\S]*malformedAuditTimesNotCountedAsValid[\s\S]*invalidSafetyTimestampNotReportedFresh/, "SDK action-plan preparation blocks unknown market status, and every core market timestamp path fails closed");
assertContains(planRegistryRegression, /failedMarketStatusCheckRejectedAtRegistration[\s\S]*failedMarketStatusCheckRejectedAtSimulationTransition[\s\S]*failedMarketStatusCheckRejectedAtConfirmationTransition/, "MCP plan registry must reject absent or failed market-status checks at registration, simulation and confirmation");
assertContains(jevShadowRegression, /phase28ApprovalAdvancesOnlyToPhase29[\s\S]*phase28BelowThresholdCriterionKeepsCurrentPhase[\s\S]*phase28FailedCheckKeepsCurrentPhase/, "Phase 28 must prove exact-successor advancement and hold on a low-confidence review or failed check");
assert.equal(phase28Fidelity.phase, "source-confirmed-data-fidelity");
assert.equal(phase28Fidelity.providerRequests, 0);
assert.equal(phase28Fidelity.externalWrites, 0);
assert.equal(phase28Fidelity.walletOrTransactionActions, 0);
assert.equal(phase28Fidelity.syntheticFixtureOnly, true);
assert.match(phase28Fidelity.safetyAndUnknownValueCases.providerPause ?? "", /normalized marketStatus remains closed.*blocks execution/);
assert.match(phase28Fidelity.safetyAndUnknownValueCases.unknownProviderMarketStatus ?? "", /remains unknown/);
assert.ok(phase28Fidelity.checks.includes("test:phase28-fidelity"));
assert.ok(phase28Fidelity.checks.includes("test:plan-registry"));
assert.ok(phase28Fidelity.checks.includes("test:mcp-live-catalog-warning"));
assert.ok(phase28Fidelity.limitations.some((limitation) => /545-versus-488.*unexplained/.test(limitation)));
assertContains(await readFile("scripts/test-mcp-live-catalog-warning.ts", "utf8"), /realMcpPipelinePreservesPhase28Fields[\s\S]*bilingualMcpTextAndStructuredContentAgree[\s\S]*allSupportedMarketFieldsAndSourceTimestampSemanticsReachActualMcpAndUi[\s\S]*contradictoryProviderMarketFlagsRenderConservatively/, "Phase 28 must exercise exact supported fields, timestamp meanings and conservative state rendering through the actual loopback MCP pipeline");
assert.equal(phase27Contract.phase, "official-provider-contract-audit");
assert.equal(phase27Contract.source.official, true);
assert.match(phase27Contract.source.url, /^https:\/\/web3\.binance\.com\//);
assert.equal(phase27Contract.comparisonWithPhase26Observation.declaredBscTokenCount - phase27Contract.comparisonWithPhase26Observation.returnedUniqueBscRepresentations, phase27Contract.comparisonWithPhase26Observation.difference);
assert.equal(phase27Contract.comparisonWithPhase26Observation.difference, 57);
assert.equal(phase27Contract.comparisonWithPhase26Observation.noRepeatProviderRequest, true);
assertContains(phase26LimitationsRegression, /inventoryCountAndPaginationUnresolved/ , "Phase 26 must directly assert inventory and pagination uncertainty");
assertContains(phase26LimitationsRegression, /filterSemanticsUnresolved/, "Phase 26 must directly assert tab-filter uncertainty");
assertContains(phase26LimitationsRegression, /missingDirectoryFieldsExplicit/, "Phase 26 must directly assert directory field omissions");
assertContains(phase26LiveCatalogRegression, /ARIADNE_MODE: "live"[\s\S]*127\.0\.0\.1[\s\S]*allThreeLiveToolResultsCarryLocalizedWarning[\s\S]*nativeUiRendersActualLiveWarning/, "Phase 26 must prove actual Live-mode MCP tool results and native UI warnings through a loopback-only provider fixture");
assertContains(phase26LiveCatalogRegression, /discover_tokenized_assets[\s\S]*compare_asset_representations[\s\S]*research_tokenized_stock[\s\S]*returned matches, not a verified complete catalog/, "Phase 26 Live MCP evidence must cover all three research tools and their tool metadata");
assertContains(phase26LimitationsRegression, /freshnessSlaUnresolved/, "Phase 26 must directly assert quote-freshness limitations");
assertContains(phase26LimitationsRegression, /observationBoundedAndSanitized/, "Phase 26 must directly assert the bounded sanitized sample");
assert.match(plan, /commits\/pushes, public release, deployment, paid services, real-wallet signing, transaction broadcast/);
assert.match(phase10, /selected asset's price, history\/chart intervals/);
assert.match(phase10, /Complete \(Jev approved; confidence 0\.900\)/);
assert.match(phase11, /SDK and natural-language MCP agree on exact/);
assert.match(phase11, /partial multi-asset search results do not bypass ambiguity checks/);
const phase11Active = phaseState.currentPhase === "sdk-mcp-core-journey";
const phase12OrLater = ["delivery-complete", "mcp-native-research-view", "mcp-agent-host-rendering-parity", "mcp-research-observability", "mcp-post-simulation-user-confirmation", "core-product-quality-audit", "mcp-agent-native-research-ui", ...forwardPhaseIds].includes(phaseState.currentPhase ?? "");
const phase18Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 18 — MCP confirmation-form host interoperability/.test(line));
const phase18Complete = gateForPhase("mcp-confirmation-host-interop")?.phaseTransition === "advance";
const phase18Active = phaseState.currentPhase === "mcp-confirmation-host-interop";
const phase19Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 19 — repeatable isolated SDK consumption/.test(line));
const phase19Active = phaseState.currentPhase === "sdk-cleanroom-revalidation";
const phase19Complete = gateForPhase("sdk-cleanroom-revalidation")?.phaseTransition === "advance";
const phase20Active = phaseState.currentPhase === "demo-mode-journey-coverage";
const phase20Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 20 — deterministic Demo Mode journey coverage/.test(line));
const phase20Complete = gateForPhase("demo-mode-journey-coverage")?.phaseTransition === "advance";
const phase21Active = phaseState.currentPhase === "provider-data-resilience";
const phase21Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 21 — provider-data and live-read resilience/.test(line));
const phase21Complete = gateForPhase("provider-data-resilience")?.phaseTransition === "advance";
const phase22Active = phaseState.currentPhase === "agent-output-language-quality";
const phase22Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 22 — Chinese\/English Agent-output quality/.test(line));
const phase22Complete = gateForPhase("agent-output-language-quality")?.phaseTransition === "advance";
const phase22Section = plan.split("## Phase 22 — agent-output-language-quality")[1]?.split("\n## Phase 23 — core-local-acceptance")[0] ?? "";
const phase23Active = phaseState.currentPhase === "core-local-acceptance";
const phase23Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 23 — core local acceptance and evidence reconciliation/.test(line));
const phase23Complete = gateForPhase("core-local-acceptance")?.phaseTransition === "advance";
const phase23Gate = gateForPhase("core-local-acceptance");
const phase23Section = plan.split("## Phase 23 — core-local-acceptance")[1]?.split("\n## Gate command pattern")[0] ?? "";
const phase24Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 24 — developer onboarding/.test(line));
const phase24Active = phaseState.currentPhase === "developer-path-onboarding";
const phase24Gate = gateForPhase("developer-path-onboarding");
const phase24Complete = phase24Gate?.phaseTransition === "advance";
const phase24Section = plan.split("## Phase 24 — developer-path-onboarding")[1]?.split("\n## Phase 25 — mcp-native-ui-host-review")[0] ?? "";
const phase25Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 25 — MCP-native UI host review/.test(line));
const phase25Active = phaseState.currentPhase === "mcp-native-ui-host-review";
const phase25Gate = gateForPhase("mcp-native-ui-host-review");
const phase25Complete = phase25Gate?.phaseTransition === "advance";
const phase25Section = plan.split("## Phase 25 — mcp-native-ui-host-review")[1]?.split("\n## Phase 26 — provider-data-limitations-closure")[0] ?? "";
const phase26Checklist = plan.split("\n").find((line) => /^- \[[ x]\] Phase 26 — provider-data limitation closure/.test(line));
const phase26Active = phaseState.currentPhase === "provider-data-limitations-closure";
const phase26Gate = gateForPhase("provider-data-limitations-closure");
const phase26Section = plan.split("## Phase 26 — provider-data-limitations-closure")[1]?.split("\n## Phase 27 — official-provider-contract-audit")[0] ?? "";
const phase26Status = phase26Section.split("\n\n").find((paragraph) => paragraph.includes("**Status:**")) ?? "";
const phase26FollowupPending = /Jev re-review is pending/.test(phase26Status);
const phase26Complete = phase26Gate?.phaseTransition === "advance" && !phase26FollowupPending;
const phase21Section = plan.split("## Phase 21 — provider-data-resilience")[1]?.split("\n## Phase 22 — agent-output-language-quality")[0] ?? "";
const phase13Complete = Boolean(gateForPhase("mcp-agent-host-rendering-parity")?.phaseTransition === "advance");
const phase14Active = phaseState.currentPhase === "mcp-research-observability";
const phase14Complete = gateForPhase("mcp-research-observability")?.phaseTransition === "advance";
const phase15Active = phaseState.currentPhase === "mcp-post-simulation-user-confirmation";
const phase15Complete = gateForPhase("mcp-post-simulation-user-confirmation")?.phaseTransition === "advance";
const phase16Active = phaseState.currentPhase === "core-product-quality-audit";
const phase16Complete = gateForPhase("core-product-quality-audit")?.phaseTransition === "advance";
const phase17Active = phaseState.currentPhase === "mcp-agent-native-research-ui";
const phase17Gate = gateForPhase("mcp-agent-native-research-ui");
const phase17Complete = phase17Gate?.phaseTransition === "advance";
const phase13Terminal = phase14Complete && phase15Complete;
assert.ok(phase11Active || phase12OrLater, `unexpected current phase: ${phaseState.currentPhase}`);
assert.ok(phase18Checklist, "the approved Phase 18 confirmation-host interoperability phase must remain documented");
assert.match(phase18Checklist!, phase18Complete
  ? /completed and Jev-approved at confidence \*\*0\.860\*\*/
  : /Active under the user-approved Phase 18–23 continuation/);
if (phase18Complete) assert.equal(phase18Active, false, "a Jev-approved Phase 18 must advance to its next named phase");
assert.ok(phase19Checklist, "Phase 19 clean-room acceptance and current evidence must remain documented");
assert.match(phase19Checklist!, phase19Complete
  ? /Jev-approved at confidence \*\*0\.910\*\*[\s\S]*fresh per-run cache[\s\S]*no npm publication/
  : /fresh per-run npm cache[\s\S]*inconclusive[\s\S]*ESM runtime imports, TypeScript declarations, package-root exports/);
assert.ok(phase20Checklist, "Phase 20 Demo Mode acceptance must remain documented");
assert.match(phase20Checklist!, /seeded companies[\s\S]*issuer-aware[\s\S]*disabled execution/);
assert.ok(phase21Checklist, "Phase 21 provider resilience must remain documented");
assert.ok(phase22Checklist, "Phase 22 bilingual Agent-output quality must remain documented");
if (phase19Complete) assert.ok(phase20Active || phase20Complete, "a Jev-approved Phase 19 must progress into or beyond Phase 20");
if (phase20Complete) {
  assert.equal(phase20Active, false, "a Jev-approved Phase 20 must advance to Phase 21");
  assert.ok(phase21Active || forwardPhaseIndex > forwardPhaseIds.indexOf("provider-data-resilience") || phaseState.currentPhase === "delivery-complete", "a Jev-approved Phase 20 must enter or pass its named successor");
  assert.match(phase20Checklist!, /Jev-approved at confidence \*\*0\.940\*\*/);
  assert.match(phase20Checklist!, /visibly synthetic/);
  assert.match(plan, /Phase 20 — demo-mode-journey-coverage[\s\S]*\*\*Status:\*\* Complete\.[\s\S]*Phase 21/);
}
assert.match(phase21Checklist!, /freshness, missing fields, inventory\/filter discrepancies, timeout\/retry behavior/);
if (phase21Complete) {
  assert.match(phase21Checklist!, /Complete; Jev approved at confidence \*\*0\.970\*\*/);
  assert.ok(phase22Active || forwardPhaseIndex > forwardPhaseIds.indexOf("agent-output-language-quality") || phaseState.currentPhase === "delivery-complete", "a Jev-approved Phase 21 must enter or pass its named successor");
  assert.match(phase21Section, /\*\*Status:\*\* Complete; Jev approved Phase 21 at confidence \*\*0\.970\*\*/);
  assert.match(phase21Section, /provider-observation-honesty \*\*0\.980\*\*[\s\S]*preapproved-phase22-continuation \*\*0\.980\*\*/);
}
assert.ok(phase22Checklist, "Phase 22 bilingual Agent-output quality must remain documented");
if (phase22Complete) {
  assert.match(phase22Checklist!, /Jev-approved at \*\*0\.930\*\* after 11\/11 selected checks passed/);
  assert.match(phase22Section, /Initial Jev review and repair[\s\S]*\*\*0\.810\*\*[\s\S]*Final Jev review[\s\S]*\*\*0\.930\*\*/);
  assert.match(phase22Section, /bilingual intent\/no-trade \*\*0\.940\*\*[\s\S]*evidence\/uncertainty fidelity \*\*0\.960\*\*[\s\S]*bilingual surface parity \*\*0\.930\*\*/);
  assert.ok(!phase22Active, "a Jev-approved Phase 22 must not remain active");
  assert.ok(phase23Active || phase23Complete || phaseState.currentPhase === "delivery-complete", "a Jev-approved Phase 22 must enter its named successor");
}
assert.ok(phase23Checklist, "Phase 23 local acceptance and evidence reconciliation must remain documented");
assert.match(phase23Checklist!, phase23Complete
  ? /Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /active after Phase 22 approval at confidence \*\*0\.930\*\*/i);
assert.match(phase23Section, /Final evidence matrix under reconciliation[\s\S]*Standalone SDK\/package[\s\S]*MCP research and Agent output[\s\S]*Provider data[\s\S]*Execution safety[\s\S]*External delivery/);
assert.match(phase23Section, /Initial Jev review and diagnosis[\s\S]*24 checks passed[\s\S]*\*\*0\.670\*\*/);
assert.match(phase23Section, /First focused repair and second Jev review[\s\S]*overall confidence \*\*0\.590\*\*[\s\S]*SDK package consumption \*\*0\.590\*\*[\s\S]*terminal scope \*\*0\.830\*\*/);
assert.match(phase23Section, /Second diagnosis and focused repair[\s\S]*loopback-only synthetic HTTP server[\s\S]*24\/24 passed checks/);
assert.match(phase23Section, /website review, public npm install, funded settlement or deployment/);
assert.ok(phase24Checklist, "Phase 24 dual-path onboarding review must be recorded");
assert.ok(phase25Checklist, "Phase 25 MCP-native UI host review must be recorded");
assert.ok(phase26Checklist, "Phase 26 provider limitation closure must be recorded");
assert.match(phase24Section, /standalone SDK[\s\S]*deterministic loopback fixture/);
assert.match(phase24Section, /existing Agent/);
assert.match(phase24Section, /Demo Mode/);
assert.match(phase24Section, /Live Mode/);
assert.match(phase24Section, /test:onboarding[\s\S]*test:mcp-config[\s\S]*test:sdk-example[\s\S]*test:cleanroom/);
assert.match(phase24Section, /test:mcp-human-confirmation[\s\S]*test:guarded-sdk-executor[\s\S]*test:execution-dry-run/);
assert.match(phase24Section, /does not imply that npm[\s\S]*Hosted MCP/);
assert.match(phase25Section, /compact MCP Apps research card[\s\S]*progressive disclosure[\s\S]*host theme\/font\/safe-area adaptation/);
assert.match(phase25Section, /distinguishes the user's earlier confirmation[\s\S]*No screenshot or other visual proof is claimed unless actually captured and inspected/);
assert.match(phase25Section, /test:mcp-app-ui[\s\S]*test:presentation[\s\S]*test:demo-mode/);
assert.match(phase26Section, /six-request\/zero-retry probe[\s\S]*545-declared\/488-returned discrepancy/);
assert.match(phase26Section, /fresh from response timestamps alone/);
assert.match(phase26Section, /2026-10-03T00:27:00\.832Z[\s\S]*545 BSC token records[\s\S]*488 unique representations[\s\S]*57-record difference[\s\S]*46\/488 rows lacked/);
assert.equal(phase26Observation.phase, "provider-data-limitations-closure");
assert.equal(phase26Observation.observedAt, "2026-10-03T00:27:00.832Z");
assert.equal(phase26Observation.requestPolicy.requestCount, 6);
assert.equal(phase26Observation.requestPolicy.maxRetries, 0);
assert.equal(phase26Observation.requests.length, 6);
assert.ok(phase26Observation.methodology.declaredBscCount.includes("Sum platform chainDistribution.tokenCount"));
assert.ok(phase26Observation.methodology.uniqueDirectoryRepresentations.includes("distinct normalized BSC asset identities"));
assert.ok(phase26Observation.methodology.quoteAgeMs.includes("subtract each returned tokenPriceUpdatedAt"));
assert.ok(phase26Observation.methodology.sourceValuesRetained.includes("cannot independently recompute"));
assert.equal(phase26Observation.requestPolicy.timeoutMs, 8000);
assert.ok(phase26Observation.requests.every((request, index) => request.index === index + 1 && request.httpStatus === 200));
assert.equal(phase26Observation.observations.platformMetadataDeclaredBscRecords, 545);
assert.equal(phase26Observation.observations.directoryUniqueRepresentationsReturned, 488);
assert.equal(phase26Observation.observations.declaredMinusReturnedDifference, 57);
assert.deepEqual(phase26Observation.observations.representationCountsByPlatform, { ondo: 442, bstock: 46 });
assert.equal(phase26Observation.observations.directoryRowsWithPerTokenUpdateTimestamp, 0);
assert.equal(phase26Observation.observations.directoryRowsWithLiquidity, 0);
assert.equal(phase26Observation.observations.rowsWithoutRecognizedMarketStatus, 46);
assert.equal(phase26Observation.observations.recognizedMarketStatusRows, 442);
assert.deepEqual(phase26Observation.observations.recognizedMarketStatusCounts, { closed: 411, offhours: 31 });
assert.deepEqual(phase26Observation.observations.sampledNvdaQuoteAgeMsAtObservation, [196, 4426]);
assert.equal(phase26Observation.observations.comparedTabIdentitySetsEqual, true);
assert.equal(phase26Observation.limitations.length, 6);
assert.equal(phase26Observation.rawProviderPayloadIncluded, false);
assert.equal(phase26Observation.credentialsIncluded, false);
assert.match(phase26Section, /Ariadne-owned repair[\s\S]*provider timestamps alone do not guarantee freshness[\s\S]*returned matches rather than a verified complete catalog/);
assert.match(phase26Section, /six requests to the already approved endpoints, no retries and no new provider/);
assert.match(phase26Section, /test:domain[\s\S]*test:asset-intent-query[\s\S]*test:mcp-enrichment[\s\S]*test:presentation[\s\S]*test:demo-mode[\s\S]*test:mcp-app-ui[\s\S]*test:core-product-phase-plan[\s\S]*test:phase26-limitations/);
assert.ok(phase27Checklist, "Phase 27 must remain explicitly visible in the checklist");
assert.match(phase27Checklist!, phase27Complete ? /Complete; Jev approved at \*\*0\.850\*\*/ : /underway/);
assert.match(phase27Section, /Status:\*\* Complete; Jev approved at confidence \*\*0\.850\*\*[\s\S]*no live provider requests were made/);
assert.match(phase27Section, /545-vs-488 difference remains unexplained[\s\S]*not attributed to pagination/);
assert.match(phase27Section, /test:phase27-contract[\s\S]*test:phase26-limitations/);
assert.ok(phase28Checklist, "Phase 28 must remain explicitly visible in the checklist");
assert.ok(phase28Section.includes("first review returned **0.350**") && phase28Section.includes("next review returned **0.690**") && phase28Section.includes("phase-sequence confidence was only **0.730**"), "Phase 28 must preserve both historical pauses and their concrete score diagnosis");
assert.match(phase28Section, phase28Complete
  ? /Status:\*\* Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /Status:\*\* Targeted rework underway; the phase remains active until all criteria clear the unchanged \*\*0\.850\*\* confidence floor/);
assert.match(phase28Section, /test:phase28-fidelity[\s\S]*test:phase27-contract[\s\S]*test:phase26-limitations/);
assert.match(plan, /Phase 29 — sdk-mcp-final-acceptance/);
assert.match(plan, /Phase 28 — source-confirmed-data-fidelity/);
assert.match(plan, /Phase 29 — sdk-mcp-final-acceptance/);
assert.match(mcpServer, /Provider search results are returned matches, not a verified complete catalog; pagination and total-count semantics are unverified/);
assert.match(mcpServer, /Demo Mode uses a limited synthetic sample and is not a complete live asset catalog/);
assert.match(mcpServer, /Results are returned matches, not a verified complete catalog/);
assert.match(quickstart, /545 BSC token records[\s\S]*488 unique representations[\s\S]*57-record difference whose cause is unresolved/);
assert.match(sdkUsage, /MarketContext\.provenance[\s\S]*provider timestamps alone do not guarantee data freshness because no market-data freshness SLA has been verified/);
assert.match(sdkUsage, /listSnapshot\(\).*not a verified complete catalog[\s\S]*545 token records[\s\S]*488 unique representations/);
assert.match(sdkUsage, /`warnings` array carries the same limitation at runtime/);
assert.match(sdkUsage, /`search\(\)` returns query matches[\s\S]*`collectionWarnings`/);
assert.match(tokenizedStocksService, /CATALOG_SCOPE_WARNING[\s\S]*warnings: \[CATALOG_SCOPE_WARNING\]/);
assert.match(tokenizedStocksService, /collectionWarnings: \[CATALOG_SCOPE_WARNING\]/);
assert.match(demoStocksService, /DEMO_CATALOG_SCOPE_WARNING[\s\S]*warnings: \[DEMO_CATALOG_SCOPE_WARNING\]/);
assert.match(demoStocksService, /collectionWarnings: \[DEMO_CATALOG_SCOPE_WARNING\]/);
assert.match(plan, /Phases 24–26 in order/);
assert.match(developerLog, /Phase 22 bilingual Agent-output quality[\s\S]*Jev approved at \*\*0\.930\*\*/);
assert.match(developerLog, /Phase 23 initial Jev review and targeted evidence repair[\s\S]*24 selected checks[\s\S]*\*\*0\.670\*\*/);
assert.match(developerLog, /second gate again passed 24\/24 checks, but Jev paused at \*\*0\.590\*\*[\s\S]*localFixtureSdkSearchAndMarketContext/);
assert.match(developerLog, /third full Phase 23 gate then passed all 24 selected checks and Jev advanced automatically to terminal `delivery-complete` at confidence \*\*0\.900\*\*[\s\S]*terminal local scope \*\*0\.920\*\*/);
assert.match(technicalReport, /Phase 23 is complete as terminal local SDK\/MCP acceptance[\s\S]*Jev paused at \*\*0\.670\*\* and \*\*0\.590\*\*[\s\S]*third full run passed all 24 checks[\s\S]*overall confidence \*\*0\.900\*\*[\s\S]*bounded terminal scope \*\*0\.920\*\*/);
assert.match(productExperience, /Phase 23, the last approved local SDK\/MCP acceptance phase, is complete[\s\S]*reviews paused at \*\*0\.670\*\* and \*\*0\.590\*\*[\s\S]*third full gate passed all 24 checks and Jev approved at \*\*0\.900\*\*/);
for (const [reportName, latestReport, completeReport] of [["technical report", technicalReportLatestGate, technicalReport], ["product experience report", productReportLatestGate, productExperience]] as const) {
  const latestConfidence = latestGate.jev?.confidence?.toFixed(3);
  const latestTransition = latestGate.phaseTransition;
  const latestPhase = latestGate.evidence?.phase;
  assert.ok(latestConfidence && latestTransition && latestPhase, "latest Jev gate must expose its phase, score and transition");
  const latestPattern = new RegExp("Phase: `" + latestPhase + "`[\\s\\S]*confidence `" + latestConfidence + "`[\\s\\S]*Phase transition: `" + latestTransition + "`");
  assert.match(latestReport, latestPattern, `${reportName} must record the latest Jev decision and transition`);
  assert.match(completeReport, /sdk-freshness-contract[\s\S]*agent-facing-freshness-copy[\s\S]*sdk-catalog-scope-warning[\s\S]*live-mcp-catalog-scope-copy[\s\S]*demo-catalog-scope-warning[\s\S]*inventory-and-pagination-uncertainty[\s\S]*tab-filter-semantics-uncertainty[\s\S]*directory-fields-and-status-uncertainty[\s\S]*freshness-sla-uncertainty[\s\S]*missing-data-fidelity[\s\S]*bounded-observation-integrity[\s\S]*terminal-local-scope/, `${reportName} must preserve every historical Phase 26 criterion`);
}
assert.match(deferredItems, /Phase 22 added tested Chinese\/English phrasing[\s\S]*\*\*0\.930\*\*/);
assert.match(deferredItems, /Final local SDK\/MCP acceptance[\s\S]*confidence 0\.900[\s\S]*24 selected local checks/);
if (phase23Active) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "the terminal acceptance phase may only transition to its bounded local-delivery state");
  assert.equal(gateForPhase("agent-output-language-quality")?.phaseTransition, "advance", "Phase 23 must have been entered only after Phase 22 approval");
  if (phase23Gate?.evidence?.checks) {
    assert.equal(phase23Gate.evidence.checks.length, 24, "Phase 23 re-review must retain the complete selected check set");
    assert.ok(phase23Gate.evidence.checks.every((check) => check.passed), "every recorded Phase 23 check must pass before review");
    const phase23CheckNames = new Set(phase23Gate.evidence.checks.map((check) => check.name));
    for (const requiredCheck of ["pack:check", "test:cleanroom", "test:mcp-natural-language", "test:execution-dry-run"]) {
      assert.ok(phase23CheckNames.has(requiredCheck), `Phase 23 review must retain ${requiredCheck} evidence`);
    }
    assert.equal(phase23Gate.evidence.externalWriteRequested, false, "the Phase 23 gate records no external write request");
    assert.equal(phase23Gate.evidence.highRiskActionRequested, false, "the Phase 23 gate records no high-risk action request");
  }
}
if (phase23Complete && latestGate.evidence?.phase === "core-local-acceptance") {
  assert.match(phase23Checklist!, /Complete; Jev approved at confidence \*\*0\.900\*\* after 24\/24 selected checks passed/);
  assert.match(phase23Section, /Final Jev approval and terminal local delivery[\s\S]*all 24 selected checks[\s\S]*confidence \*\*0\.900\*[\s\S]*independent SDK\/package consumption \*\*1\.000\*[\s\S]*bounded terminal delivery scope \*\*0\.920\*/);
  assert.equal(phaseState.currentPhase, "delivery-complete", "Phase 23 Jev approval records the bounded local terminal state");
  assert.equal(phaseState.nextPhase, "delivery-complete", "terminal local acceptance cannot advance into external release work");
  assert.equal(phaseState.lastTransition, "advance");
  assert.equal(phase23Gate?.evidence?.checks?.length, 24, "terminal approval must retain every selected check");
  assert.ok(phase23Gate?.evidence?.checks?.every((check) => check.passed), "terminal approval must retain only passing checks");
  assert.equal(phase23Gate?.evidence?.externalWriteRequested, false);
  assert.equal(phase23Gate?.evidence?.highRiskActionRequested, false);
  assert.equal(phase23Gate?.jev?.confidence, 0.9, "terminal Phase 23 approval score must be retained and surfaced");
  assert.deepEqual(phase23Gate?.jev?.criterionReviews, {
    "independent-sdk-package-consumption": { verdict: "met", confidence: 1 },
    "mcp-research-journey-and-surfaces": { verdict: "met", confidence: 0.93 },
    "execution-safety-regressions": { verdict: "met", confidence: 0.99 },
    "reports-and-phase-ledger-reconciled": { verdict: "met", confidence: 0.9 },
    "bounded-terminal-delivery-scope": { verdict: "met", confidence: 0.92 },
  });
}
assert.match(phase24Checklist!, phase24Complete
  ? /Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /user-approved continuation from the Phase 23 local acceptance state/);
if (phase24Complete) {
  assert.ok(phase25Active || phase25Complete || forwardPhaseIndex > forwardPhaseIds.indexOf("mcp-native-ui-host-review") || phaseState.currentPhase === "delivery-complete", "Phase 24 approval must progress to Phase 25");
}
assert.match(phase25Checklist!, phase25Complete
  ? /Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /inspect the connected Codex research surface and the deterministic host harness/);
if (phase25Complete) {
  assert.ok(phase26Active || phase26Complete || forwardPhaseIndex > forwardPhaseIds.indexOf("provider-data-limitations-closure") || phaseState.currentPhase === "delivery-complete", "Phase 25 approval must progress to Phase 26");
  assert.match(phase25Checklist!, /Complete; Jev approved at confidence \*\*0\.930\*\* after 5\/5 selected checks passed/);
  assert.match(phase25Section, /Final approval[\s\S]*confidence \*\*0\.930\*\*|Jev approved at confidence \*\*0\.930\*\*/);
  assert.match(phase25Section, /shared native research surface 0\.990[\s\S]*host adaptation\/accessibility 1\.000[\s\S]*evidence fidelity\/research safety 1\.000[\s\S]*host-observation honesty\/scope 0\.930/);
  assert.match(phase25Section, /No screenshot or other visual proof is claimed unless actually captured and inspected/);
  assert.equal(phase25Gate?.evidence?.checks?.length, 5, "Phase 25 approval must retain its five selected checks");
  assert.ok(phase25Gate?.evidence?.checks?.every((check) => check.passed), "every recorded Phase 25 check must pass before approval");
  assert.deepEqual(phase25Gate?.jev?.criterionReviews, {
    "shared-native-research-surface": { verdict: "met", confidence: 0.99 },
    "host-adaptation-and-accessibility": { verdict: "met", confidence: 1 },
    "evidence-fidelity-and-research-safety": { verdict: "met", confidence: 1 },
    "host-observation-honesty-and-phase-scope": { verdict: "met", confidence: 0.93 },
  });
}
assert.match(phase26Checklist!, phase26Complete
  ? /Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /Re-review pending after a post-approval consumer-path\/evidence audit[\s\S]*prior 0\.850 approval remains historical[\s\S]*unchanged floor remains 0\.850/);
if (phase26FollowupPending) {
  assert.ok(phaseState.currentPhase === "provider-data-limitations-closure" || phaseState.currentPhase === "delivery-complete", "the Phase 26 re-review remains active or reflects its previous terminal approval");
  assert.match(phase26Status, /previous Jev gate approved Phase 26 at \*\*0\.850\*\*[\s\S]*latest re-review paused at \*\*0\.190\*\*[\s\S]*The unchanged 0\.850 floor is not lowered/);
  assert.match(phase26Section, /Post-approval consumer-path audit and re-review[\s\S]*direct test-to-output traceability/);
  assert.match(phase26Section, /SDK `listSnapshot\(\)` carries a runtime warning/);
  assert.match(phase26Section, /Live SDK `listSnapshot\(\)` carries a runtime warning[\s\S]*Demo SDK snapshots identify/);
  assert.match(phase26Section, /observation JSON's local TypeScript shape omitted four aggregate fields/);
  assert.match(phase26Section, /the caveat remains both when the provider timestamp is absent and when one is present/);
  assert.match(phase26Section, /records\/phase26-provider-observation\.json/);
}
if (phase26Complete) {
  const phase26ForwardIndex = forwardPhaseIds.indexOf("provider-data-limitations-closure");
  assert.ok(phaseState.currentPhase === "delivery-complete" || (inForwardContinuation && forwardPhaseIndex > phase26ForwardIndex), "Phase 26's historical terminal approval must remain valid when an explicitly approved later continuation is active");
  assert.equal(phase26Gate?.evidence?.nextPhase, "delivery-complete", "Phase 26 itself ended at its named terminal local-delivery state");
  if (phaseState.currentPhase === "delivery-complete") {
    assert.equal(phaseState.nextPhase, "delivery-complete");
    assert.equal(phaseState.lastTransition, "advance");
  }
  const selectedCheckCount = phase26Gate?.evidence?.checks?.length ?? 0;
  assert.match(phase26Checklist!, new RegExp(`Complete; Jev approved at confidence \\*\\*0\\.\\d{3}\\*\\* after ${selectedCheckCount}/${selectedCheckCount} selected checks passed`));
  assert.match(phase26Section, new RegExp(`Final Jev approval and terminal local delivery[\\s\\S]*[Aa]ll ${selectedCheckCount} selected checks[\\s\\S]*all 12 criteria`));
  assert.equal(selectedCheckCount, 12, "Phase 26 terminal re-review must retain all 12 selected local checks");
  assert.ok(phase26Gate?.evidence?.checks?.every((check) => check.passed), "all Phase 26 checks must pass before terminal approval");
  const phase26CheckNames = new Set(phase26Gate?.evidence?.checks?.map((check) => check.name));
  for (const requiredCheck of ["typecheck", "test:domain", "test:asset-intent-query", "test:mcp-enrichment", "test:presentation", "test:demo-mode", "test:mcp-app-ui", "test:mcp-live-catalog-warning", "test:core-product-phase-plan", "test:phase26-limitations", "test:onboarding", "test:jev-shadow"]) {
    assert.ok(phase26CheckNames.has(requiredCheck), `Phase 26 review must retain ${requiredCheck} evidence`);
  }
  assert.equal(phase26Gate?.evidence?.externalWriteRequested, false);
  assert.equal(phase26Gate?.evidence?.highRiskActionRequested, false);
  assert.ok((phase26Gate?.jev?.confidence ?? 0) >= 0.85, "Phase 26 must satisfy the unchanged Jev confidence floor");
  assert.ok(Object.values(phase26Gate?.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"), "every Phase 26 acceptance criterion must be met");
  const requiredCriteria = [
    "sdk-freshness-contract", "agent-facing-freshness-copy", "sdk-catalog-scope-warning",
    "live-mcp-catalog-scope-copy", "demo-catalog-scope-warning", "inventory-and-pagination-uncertainty",
    "tab-filter-semantics-uncertainty", "directory-fields-and-status-uncertainty", "freshness-sla-uncertainty",
    "missing-data-fidelity", "bounded-observation-integrity", "terminal-local-scope"
  ];
  assert.deepEqual(Object.keys(phase26Gate?.jev?.criterionReviews ?? {}).sort(), [...requiredCriteria].sort(), "Phase 26 approval must review every material criterion exactly once");
  assert.ok(requiredCriteria.every((id) => phase26Gate?.jev?.criterionReviews?.[id]?.verdict === "met"), "every Phase 26 criterion must be met");
}
assert.match(phase27Checklist!, phase27Complete
  ? /Complete; Jev approved at \*\*0\.850\*\*/
  : /underway/);
if (phase27Complete) {
  const selectedChecks = phase27Gate?.evidence?.checks ?? [];
  assert.equal(selectedChecks.length, 5, "Phase 27 approval must retain all five official-contract and reconciliation checks");
  assert.ok(selectedChecks.every((check) => check.passed), "every Phase 27 deterministic check must pass before advancement");
  assert.equal(phase27Gate?.jev?.confidence, 0.85, "Phase 27's recorded pass must show the unchanged 0.850 floor");
  assert.equal(Object.keys(phase27Gate?.jev?.criterionReviews ?? {}).length, 10);
  assert.ok(Object.values(phase27Gate?.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"), "every Phase 27 criterion must be met");
  assert.match(phase27Section, /Final Jev review[\s\S]*all five selected checks passed[\s\S]*advanced at \*\*0\.850\*\*/);
}
assert.match(phase28Checklist!, phase28Complete
  ? /Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/
  : /targeted rework underway after the first Jev review[\s\S]*remains active until all criteria clear the unchanged confidence floor/);
if (phase28Complete) {
  const selectedChecks = phase28Gate?.evidence?.checks ?? [];
  assert.ok(selectedChecks.length >= 10, "Phase 28 approval must retain its cross-surface regressions");
  assert.ok(selectedChecks.every((check) => check.passed), "every Phase 28 deterministic check must pass before advancement");
  assert.ok((phase28Gate?.jev?.confidence ?? 0) >= 0.85, "Phase 28 must retain the unchanged confidence floor");
  assert.ok(Object.values(phase28Gate?.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"), "every Phase 28 criterion must be met");
  assert.match(phase28Section, /Status:\*\* Complete; Jev approved at confidence \*\*0\.\d{3}\*\*/);
} else {
  assert.match(phase28Section, /Status:\*\* Targeted rework underway; the phase remains active until all criteria clear the unchanged \*\*0\.850\*\* confidence floor/);
}
assert.ok(phase29Checklist, "Phase 29 must remain visible in the approved checklist");
assert.match(phase29Checklist!, /Initial terminal local acceptance was Jev-approved on 2026-10-03[\s\S]*automatically synchronized snapshot near the top is the current status/);
assert.match(phase29Section, /Status:\*\* The initial terminal local acceptance was approved at confidence \*\*0\.850\*\*[\s\S]*automatically synchronized snapshot near the top is the current decision source/);
assert.ok(latestGateSummary.includes(latestGate.recordedAt ?? ""), "the phase-plan snapshot must name the latest canonical gate record");
assert.ok(latestGateSummary.includes("Result: \`" + latestGate.phaseTransition + "\`"), "the phase-plan snapshot must match the latest gate verdict");
assert.ok(latestGateSummary.includes("currentPhase=" + phaseState.currentPhase), "the phase-plan snapshot must match the current phase ledger");
assert.ok(latestGateSummary.includes("nextPhase=" + phaseState.nextPhase), "the phase-plan snapshot must match the named phase successor");
assert.match(phase29Section, /First Jev review \(2026-10-03\)[\s\S]*23 selected checks passed[\s\S]*0\.800[\s\S]*0\.820/);
assert.match(phase29Section, /Second Jev review and targeted diagnosis[\s\S]*25 selected checks passed[\s\S]*phase sequence\/terminal ledger \*\*0\.630\*\*/);
assert.match(phase29Section, /Third Jev review and targeted repair[\s\S]*overall confidence was \*\*0\.560\*\*[\s\S]*status confidence \*\*0\.560\*\*/);
assert.ok(phase29Section.includes("Fifth Jev review and process-boundary diagnosis"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T05:26:46.877Z`"));
assert.ok(phase29Section.includes("Sixth Jev review and targeted terminal-ledger diagnosis"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T05:42:34.487Z`"));
assert.ok(phase29Section.includes("same Jev review judge every criterion at its own 0.850 floor"));
assert.ok(phase29Section.includes("Seventh Jev review and report-ledger diagnosis"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T05:51:16.807Z`"));
assert.ok(phase29Section.includes("Eighth Jev review and automatic-summary synchronization"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T05:59:28.856Z`"));
assert.ok(phase29Section.includes("had no code to synchronize the latest decision into all five top-level current summaries"));
assert.ok(phase29Section.includes("Tenth Jev review and reconciliation-criterion diagnosis"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T06:19:24.670Z`"));
assert.ok(phase29Section.includes("Eleventh Jev review and Phase 29 terminal approval"));
assert.ok(phase29Section.includes("Canonical record: `2026-10-03T06:26:38.003Z`"));
assertContains(reportSync, /Selected checks:[\s\S]*check\.passed \? "passed" : "failed"[\s\S]*Deferred assessment:[\s\S]*Deferred items:/, "Every appended gate report must include each selected check outcome and exact deferred items");
assertContains(reportSync, /renderLatestGateSummary[\s\S]*Latest Jev gate snapshot[\s\S]*Criterion scores below[\s\S]*syncLatestGateSummary/, "The gate must synchronize one exact latest decision snapshot into the five current-summary documents after every review");
assertContains(gateRunner, /await appendGateReportEntry\([\s\S]*await syncLatestGateSummary\(record, phaseState, \[[\s\S]*CORE_PRODUCT_PHASE_PLAN\.md[\s\S]*DEVELOPER_EXPERIENCE_LOG\.md[\s\S]*TECHNICAL_RESEARCH_REPORT\.md[\s\S]*PRODUCT_EXPERIENCE_REPORT\.md[\s\S]*UPGRADE_DEFERRED_ITEMS\.md/, "The gate runner must synchronize all five current summaries after persisting each Jev decision");
assert.match(phase29Section, /Terminal local-acceptance matrix[\s\S]*Standalone SDK[\s\S]*Existing-Agent MCP[\s\S]*Native research UI[\s\S]*Provider data[\s\S]*Execution safety[\s\S]*Public release and website/);
assert.match(phase29Section, /test:agent-model[\s\S]*test:asset-intent-query[\s\S]*test:phase28-fidelity[\s\S]*test:onboarding[\s\S]*test:mcp-config[\s\S]*test:sdk-example[\s\S]*test:distribution[\s\S]*pack:check[\s\S]*test:cleanroom[\s\S]*test:phase29-acceptance-evidence[\s\S]*test:jev-shadow/);
assert.match(phase29Section, /loopback-only synthetic provider[\s\S]*does not claim that every third-party Agent automatically selects a tool/);
assert.ok(phase29AcceptanceEvidenceRegression.includes("phase29Seventh.evidence.checks.map"));
assert.ok(phase29AcceptanceEvidenceRegression.includes("phase29Eighth.evidence.checks.map"));
assert.ok(phase29AcceptanceEvidenceRegression.includes("both report appendices must reproduce every canonical selected check and result"));
assert.ok(phase29AcceptanceEvidenceRegression.includes("latestPriorGateAndPhaseStateExactlyReconciled"));
assert.ok(phase29AcceptanceEvidenceRegression.includes("exact machine-synchronized latest gate snapshot"));
for (const expected of [
  "phase29ApprovalAdvancesOnlyToDeliveryComplete",
  "phase29BelowThresholdCriterionKeepsCurrentPhase",
  "phase29FailedCheckKeepsCurrentPhase",
  "phase29HeldStateMetadataAndExactSuccessorVerified",
  "phase29WrongSuccessorRejected",
]) {
  assert.ok(jevShadowRegression.includes(expected), `Phase 29 state-machine regression is missing ${expected}`);
}
assertContains(phase26LiveCatalogRegression, /searchKeywords[\s\S]*No matching RWA assets found for keyword:[\s\S]*catalogFallbackResolvesChineseAndEnglishQueriesToNvda/, "Phase 29 natural-language evidence must exercise no-match fallback, exact query capture and ticker resolution through the production MCP subprocess");
assert.match(phase29Section, /Stop boundary:\*\* local acceptance only; do not infer permission to push, publish, deploy, edit the website, use a wallet, broadcast a transaction or settle funds/);
if (phase29Complete) {
  const selectedChecks = phase29Gate?.evidence?.checks ?? [];
  assert.ok(selectedChecks.length >= 15, "Phase 29 approval must retain its cross-surface and consumer-path checks");
  assert.ok(selectedChecks.every((check) => check.passed), "every Phase 29 deterministic check must pass before terminal advancement");
  assert.ok((phase29Gate?.jev?.confidence ?? 0) >= 0.85, "Phase 29 must retain the unchanged confidence floor");
  assert.ok(Object.values(phase29Gate?.jev?.criterionReviews ?? {}).every((review) => review.verdict === "met"), "every Phase 29 criterion must be met");
  assert.ok(Object.values(phase29Gate?.jev?.criterionReviews ?? {}).every((review) => (review.confidence ?? 0) >= 0.85), "every Phase 29 criterion must independently meet the unchanged confidence floor");
} else {
  assert.equal(phaseState.currentPhase, "sdk-mcp-final-acceptance", "Phase 29 remains the current phase until its own Jev review advances");
  assert.equal(phaseState.nextPhase, "delivery-complete", "Phase 29 remains held at its only allowed terminal successor");
  assert.equal(phase29Gate?.evidence?.checks?.length, 25, "the current Phase 29 review must preserve its exact selected check set");
  const failedChecks = phase29Gate?.evidence?.checks?.filter((check) => !check.passed) ?? [];
  assert.ok((phase29Gate?.jev?.confidence ?? 1) < 0.85 || failedChecks.length > 0, "a held review must have either a failed selected check or below-threshold confidence");
  assert.equal(Object.keys(phase29Gate?.jev?.criterionReviews ?? {}).length, 12, "the latest Phase 29 review covers all twelve criteria");
}
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
assert.ok(["mcp-agent-host-rendering-parity", "delivery-complete", "mcp-research-observability", "mcp-post-simulation-user-confirmation", "core-product-quality-audit", "mcp-agent-native-research-ui", ...forwardPhaseIds].includes(phaseState.currentPhase ?? ""), `unexpected core-product phase state: ${phaseState.currentPhase}`);
if (inForwardContinuation) {
  const currentGate = gateForPhase(phaseState.currentPhase ?? "");
  if (currentGate) {
    const expectedNext = forwardPhases[forwardPhaseIndex + 1]?.id ?? "delivery-complete";
    assert.equal(phaseState.nextPhase, expectedNext, "a reviewed phase records only its named successor");
    assert.equal(phaseState.lastTransition, currentGate.phaseTransition, "an active forward phase must reflect its latest Jev decision");
    assert.equal(phaseState.lastReason, currentGate.transitionReason, "an active forward phase must retain its latest Jev reason");
  } else {
    assert.equal(phaseState.nextPhase, phaseState.currentPhase, "a newly entered phase waits for its own Jev review");
  }
}
if (phase13Terminal && !phase16Active && !phase17Active && !inForwardContinuation) {
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
  if (latestGate.evidence?.phase === "mcp-research-observability") {
    assert.equal(phaseState.nextPhase, "delivery-complete");
    assert.equal(phaseState.lastTransition, "advance");
  }
  assert.match(phase14, /Final Jev review passed all 10 selected checks and all 3 criteria at confidence 0\.890/);
}
assert.match(phase15!, phase15Complete
  ? /Complete \(Jev approved; confidence 0\.\d{3}\)/
  : /Active \(Jev review pending\)/);
if (phase15Active) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "the confirmation phase remains bounded to its approved continuation");
  assert.equal(phaseState.lastTransition, "pause");
  assert.match(phaseState.lastReason ?? "", /lacks a sufficiently confident Jev review/);
}
if (phase15Complete) {
  if (latestGate.evidence?.phase === "mcp-post-simulation-user-confirmation") {
    assert.equal(phaseState.nextPhase, "delivery-complete");
    assert.equal(phaseState.lastTransition, "advance");
  }
}
assert.match(phase16Checklist!, /Audit only the SDK\/MCP core/);
assert.match(phase16Checklist!, /distinguish deterministic tests, live read-only evidence and actual-host observations/);
assert.match(phase16Checklist!, /Website, publication\/push, real wallet, signature, broadcast and funded settlement are excluded/);
assertContains(plan, /\*\*Stop boundary:\*\* This is a terminal audit phase[\s\S]*requires the user to reconnect the current local server/, "phase 16 must define its terminal action and external host-validation boundary");
assertContains(plan, /In this phase, Jev's `continue` means only to record the terminal `delivery-complete` state and deliver the audit report, then stop/, "terminal Jev continuation must not be mistaken for permission to start another implementation phase");
assertContains(deferredItems, /A read-only MCP Apps research view is implemented/, "deferred register must acknowledge the implemented research UI");
assertContains(deferredItems, /SDK v2[\s\S]*connected synthetic server completed a host-level elicitation round-trip[\s\S]*Jev then approved Phase 18 at confidence 0\.860 after ten checks and four `met` criteria[\s\S]*not a screenshot-based visual-design assessment/i, "deferred register must record connected decline evidence and Jev approval without claiming screenshot-based visual review");
assertContains(deferredItems, /pre-existing Phase 15–23 work was synchronized to public `origin\/main` in commit `a781e4f`[\s\S]*Synchronizing the later phase changes is a separate, explicitly user-authorized Git operation[\s\S]*npm\/MCP Registry publication and Hosted MCP deployment remain separate release actions/i, "deferred register must state the current repository sync and local release boundary");
assertContains(productExperience, /clean-room install did not finish/, "product report must not overstate the current clean-room result");
assertContains(productExperience, /`NETWORK_TIMEOUT`/, "product report must record the unavailable live check");
assertContains(productExperience, /user previously confirmed it was visible in this Codex conversation/, "product report must attribute research-card rendering to the user's observation");
assertContains(productExperience, /connected tool still advertises the old token-based input/, "product report must retain the earlier connected-host schema observation as history");
assertContains(productExperience, /Phase 18 direct connected-host attempt[\s\S]*confirmationStatus: unavailable[\s\S]*No UI form was displayed/i, "product report must record the actual connected-host failure without claiming UI rendering");
assertContains(technicalReport, /The new form's rendering in the connected Agent host remains unverified/i, "technical report must distinguish protocol tests from host rendering");
assertContains(technicalReport, /connected MCP tool schema \(`confirmationToken` required\) and the local Phase 15 registration \(only `plan`/, "technical report must record the observed version discrepancy");
assertContains(technicalReport, /post-reconnect.*`confirm_stock_action_plan\(plan\)`[\s\S]*not actual Agent-host UI evidence/i, "technical report must record the superseding schema observation without overstating UI proof");
assertContains(technicalReport, /price-gap ranking basis/, "technical report must record the output wording repair");
if (phase16Active) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "quality audit remains within its bounded local scope");
  assert.equal(phaseState.lastTransition, "pause");
}
if (phase16Complete && !phase17Active && !inForwardContinuation) {
  assert.equal(phaseState.currentPhase, "delivery-complete");
  assert.equal(phaseState.nextPhase, "delivery-complete");
  assert.match(phase16Checklist!, /completed with Jev approval at confidence \*\*0\.910\*\*/);
}
assert.match(phase17Checklist!, phase17Complete
  ? /completed with Jev approval at confidence \*\*0\.\d{3}\*\*/
  : /locally implemented and regression-checked.*connected MCP host now serves the refreshed compact UI resource.*Final Jev re-review is pending/);
assert.match(plan, /## Phase 17 — mcp-agent-native-research-ui[\s\S]*compact, conversation-sized hierarchy[\s\S]*Do not claim actual-host rendering from the local protocol harness/);
if (phase17Active) {
  assert.equal(phaseState.nextPhase, "delivery-complete", "the Agent-native UI phase is bounded to delivery-complete");
  if (phase17Gate) {
    assert.equal(phaseState.lastTransition, phase17Gate.phaseTransition, "an active Phase 17 state must reflect its latest Jev decision");
    assert.equal(phaseState.lastReason, phase17Gate.transitionReason, "the active phase ledger must preserve the latest Jev pause reason");
  } else {
    assert.match(phaseState.lastReason ?? "", /[Uu]ser-approved MCP Agent-native research UI phase/);
  }
}
if (phase17Complete && !inForwardContinuation) {
  assert.equal(phaseState.currentPhase, "delivery-complete");
  assert.equal(phaseState.nextPhase, "delivery-complete");
  assert.match(phase17Checklist!, /completed with Jev approval at confidence/);
}
assert.match(plan, /Phase 12's first Jev review paused at 0\.740[\s\S]*at 0\.960/);
assert.match(plan, /OpenAI's current \[MCP Apps UI guidance\]/);
assert.match(plan, /Phase 9 — asset directory data quality: complete/);
assert.match(plan, /If deterministic checks pass and Jev returns `advance`, continue automatically/);
assert.match(plan, /website work, and competition submission remain outside the approved Phase 12–17 scope/);

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
  phase15ActiveAndHeld: phase15Active,
  phase15JevApproved: phase15Complete,
  phase16Active,
  phase16JevApproved: phase16Complete,
  phase17Active,
  phase17JevApproved: phase17Complete,
  phase18Active,
  phase18JevApproved: phase18Complete,
  phase18IsolatedStdioFixtureDeclared: true,
  phase18ConnectedDeclineOutcomeRecorded: /`confirmationStatus: declined`[\s\S]*`planStatus: simulated`/.test(plan),
  phase19Active,
  phase19JevApproved: phase19Complete,
  phase20Active,
  phase20JevApproved: phase20Complete,
  phase21Active,
  phase21JevApproved: phase21Complete,
  phase22Active,
  phase22JevApproved: phase22Complete,
  phase23Active,
  phase23JevApproved: phase23Complete,
  phase23EvidenceMatrixPresent: /Final evidence matrix under reconciliation/.test(phase23Section),
  phase23JevApprovedConfidence: phase23Gate?.jev?.confidence ?? null,
  phase24Active,
  phase24JevApproved: phase24Complete,
  phase25Active,
  phase25JevApproved: phase25Complete,
  phase26Active,
  phase26JevApproved: phase26Complete,
  automaticAdvanceRulePresent: true,
  highRiskBoundariesExcluded: true,
  passed: true,
}, null, 2));
