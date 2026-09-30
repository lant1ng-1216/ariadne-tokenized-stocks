import type { GateCriterion } from "./types.js";

export const MIN_JEV_CONFIDENCE = 0.85;

export function confidenceThreshold(raw = process.env.JEV_MIN_CONFIDENCE): number {
  if (raw === undefined) return MIN_JEV_CONFIDENCE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_JEV_CONFIDENCE || parsed > 1) return MIN_JEV_CONFIDENCE;
  return parsed;
}

export function validateAcceptanceCriteria(criteria: GateCriterion[], selectedChecks: ReadonlySet<string>): void {
  if (criteria.length === 0) throw new Error("At least one --criterion is required before a phase gate can run");
  if (criteria.length > 12) throw new Error("At most 12 acceptance criteria may be submitted in one review");

  const ids = new Set<string>();
  for (const criterion of criteria) {
    if (ids.has(criterion.id)) throw new Error(`Duplicate acceptance criterion ID: ${criterion.id}`);
    ids.add(criterion.id);
    assertSafeReviewText(`criterion ${criterion.id} requirement`, criterion.requirement, 320);
    assertSafeReviewText(`criterion ${criterion.id} evidence summary`, criterion.evidenceSummary, 600);
    if (criterion.checkNames.length === 0) throw new Error(`Criterion ${criterion.id} needs one or more linked check names`);
    if (criterion.checkNames.length > 12) throw new Error(`Criterion ${criterion.id} may link at most 12 checks`);
    if (new Set(criterion.checkNames).size !== criterion.checkNames.length) throw new Error(`Criterion ${criterion.id} contains duplicate check names`);
    for (const name of criterion.checkNames) {
      if (!selectedChecks.has(name)) throw new Error(`Criterion ${criterion.id} references a check that is not selected for this gate`);
    }
  }
}

export function assertSafeReviewText(label: string, text: string, maxLength: number): void {
  if (!text.trim() || text.length > maxLength) throw new Error(`${label} must contain 1–${maxLength} characters`);
  if (text.includes("\n") || text.includes("\r") || looksLikeSecret(text)) {
    throw new Error(`${label} contains disallowed multiline or secret-like material`);
  }
}

function looksLikeSecret(text: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|pk|api)[_-][A-Za-z0-9_-]{16,}\b|\b0x[a-f0-9]{64}\b/i.test(text);
}
