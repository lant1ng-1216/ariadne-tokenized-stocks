import { appendFile, readFile, writeFile } from "node:fs/promises";
import type { PhaseState } from "./phase-state.js";
import type { ShadowDecisionRecord } from "./types.js";

const summaryStart = "<!-- JEV-LATEST-GATE-SUMMARY:START -->";
const summaryEnd = "<!-- JEV-LATEST-GATE-SUMMARY:END -->";

export async function appendGateReportEntry(
  record: ShadowDecisionRecord,
  technicalReportPath: string,
  productReportPath: string,
): Promise<void> {
  const entry = [
    "",
    `### Jev phase-gate record — ${record.recordedAt}`,
    `- Phase: \`${record.evidence.phase}\``,
    `- Jev provider: \`${record.provider}\``,
    `- Baseline: \`${record.baseline.status}\` / \`${record.baseline.nextAction}\` / risk \`${record.baseline.riskLevel}\``,
    `- Jev: ${record.jev ? `\`${record.jev.status}\` / \`${record.jev.nextAction}\` / risk \`${record.jev.riskLevel}\` / confidence \`${record.jev.confidence.toFixed(3)}\`` : "unavailable"}`,
    `- Agreement: \`${record.agreement ?? "unknown"}\``,
    `- Latency: \`${record.durationMs} ms\``,
    `- Phase transition: \`${record.phaseTransition}\``,
    `- Transition reason: ${record.transitionReason}`,
    ...(record.evidence.checks.length
      ? ["- Selected checks:", ...record.evidence.checks.map((check) => `  - \`${check.name}\`: ${check.passed ? "passed" : "failed"} (${check.evidence})`)]
      : []),
    ...(record.evidence.deferredItems.length
      ? [
          `- Deferred assessment: \`${record.jev?.deferredAssessment ?? "not_assessed"}\``,
          "- Deferred items:",
          ...record.evidence.deferredItems.map((item) => `  - ${item}`),
        ]
      : []),
    ...(record.evidence.acceptanceCriteria?.length
      ? ["- Acceptance criteria and supplied evidence:", ...record.evidence.acceptanceCriteria.map((criterion) => `  - ${criterion.id} (${criterion.checkNames.join(", ")}): ${criterion.requirement} Evidence: ${criterion.evidenceSummary}`)]
      : []),
    ...(record.jev?.questionConfidence
      ? [`- Jev confidence by review item: ${Object.entries(record.jev.questionConfidence).map(([question, confidence]) => `${question}=${confidence.toFixed(3)}`).join(", ")}`]
      : []),
    ...(record.jev?.reasons?.length ? [`- Jev criterion findings: ${record.jev.reasons.join("; ")}`] : []),
    `- Action taken: \`${record.actionTaken}\``,
    "- Safety note: Jev does not control Codex. This gate did not request or perform an external write; authorization for any separate action is assessed independently.",
    "",
  ].join("\n");
  await appendFile(technicalReportPath, entry, "utf8");
  await appendFile(productReportPath, entry, "utf8");
}

export function renderLatestGateSummary(record: ShadowDecisionRecord, state: PhaseState): string {
  const checks = record.evidence.checks;
  const passedChecks = checks.filter((check) => check.passed).length;
  const reviews = Object.entries(record.jev?.criterionReviews ?? {});
  const metReviews = reviews.filter(([, review]) => review.verdict === "met").length;
  const belowThreshold = reviews
    .filter(([, review]) => review.confidence < 0.85)
    .map(([id, review]) => `${id}=${review.confidence.toFixed(3)}`);
  const criteria = reviews.map(([id, review]) => `${id}=${review.confidence.toFixed(3)} (${review.verdict})`);
  const reason = (state.lastReason ?? "not recorded").replace(/[\r\n]+/g, " ");
  return [
    summaryStart,
    "#### Latest Jev gate snapshot (automatically synchronized)",
    `- Canonical record: \`${record.recordedAt}\`; phase \`${record.evidence.phase}\`; Jev confidence \`${record.jev?.confidence.toFixed(3) ?? "unavailable"}\` (required floor: \`0.850\`).`,
    `- Result: \`${record.phaseTransition}\`; selected checks \`${passedChecks}/${checks.length}\` passed; criteria \`${metReviews}/${reviews.length}\` met; deferred assessment \`${record.jev?.deferredAssessment ?? "not_assessed"}\` (${record.evidence.deferredItems.length} items; exact text is retained in both gate appendices).`,
    `- Criterion scores: ${criteria.length ? criteria.join("; ") : "none recorded"}.`,
    `- Criterion scores below \`0.850\`: ${belowThreshold.length ? belowThreshold.join("; ") : "none"}.`,
    `- Phase ledger: \`currentPhase=${state.currentPhase}\`, \`nextPhase=${state.nextPhase ?? "not recorded"}\`, \`lastTransition=${state.lastTransition ?? "not recorded"}\`, \`lastDecisionAt=${state.lastDecisionAt ?? "not recorded"}\`; reason: ${reason}`,
    summaryEnd,
  ].join("\n");
}

export async function syncLatestGateSummary(
  record: ShadowDecisionRecord,
  state: PhaseState,
  paths: string[],
): Promise<void> {
  const summary = renderLatestGateSummary(record, state);
  const markerPattern = new RegExp(`${escapeRegExp(summaryStart)}[\\s\\S]*?${escapeRegExp(summaryEnd)}`);
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    if (markerPattern.test(source)) {
      await writeFile(path, source.replace(markerPattern, summary), "utf8");
      continue;
    }
    const firstHeading = /^(# .+)(\r?\n)/.exec(source);
    if (!firstHeading) throw new Error(`Cannot add the latest Jev summary: no top-level heading in ${path}`);
    const insertionPoint = firstHeading[0].length;
    await writeFile(path, `${source.slice(0, insertionPoint)}\n${summary}\n${source.slice(insertionPoint)}`, "utf8");
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
