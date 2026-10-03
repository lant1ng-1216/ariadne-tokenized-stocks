import { appendFile } from "node:fs/promises";
import type { ShadowDecisionRecord } from "./types.js";

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
