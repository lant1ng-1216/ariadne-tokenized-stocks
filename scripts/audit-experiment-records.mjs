import { readFileSync, writeFileSync } from "node:fs";

const readJsonl = (path) => readFileSync(path, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${path}:${index + 1} invalid JSON: ${error.message}`); }
});
const matrix = readFileSync("research/experiments/test-matrix.csv", "utf8").trim().split(/\r?\n/).slice(1).map((line) => line.split(","));
const planned = new Map(matrix.map((row) => [row[0], Number(row[4])]));
const readonly = readJsonl("research/experiments/records/readonly.jsonl");
const safetyRecords = readJsonl("research/experiments/records/safety.jsonl");
const snapshots = readJsonl("research/experiments/records/readonly-results.jsonl");
const safety = JSON.parse(readFileSync("research/experiments/records/safety-results.json", "utf8"));
const failures = [];
const allowedResponseClasses = new Set(["success", "retryable_rate_limit", "upstream_error", "network_error", "http_error"]);
const allowedDecisions = new Set(["return_normalized", "retry", "preserve_error", "block", "external_signature"]);
const ids = new Set();
const allRecords = [...readonly, ...safetyRecords];
for (const record of allRecords) {
  for (const field of ["record_id", "observed_at", "scenario_id", "endpoint", "request_variant", "response_class", "handling_decision", "warning_count", "broadcasted", "source_ref"]) {
    if (!(field in record) || record[field] === "") failures.push(`${record.record_id ?? "unknown"}: missing ${field}`);
  }
  if (ids.has(record.record_id)) failures.push(`duplicate record_id: ${record.record_id}`);
  ids.add(record.record_id);
  if (!planned.has(record.scenario_id)) failures.push(`${record.record_id}: unknown scenario ${record.scenario_id}`);
  if (!allowedResponseClasses.has(record.response_class)) failures.push(`${record.record_id}: invalid response_class`);
  if (!allowedDecisions.has(record.handling_decision)) failures.push(`${record.record_id}: invalid handling_decision`);
  if (!Number.isFinite(record.latency_ms) || record.latency_ms < 0) failures.push(`${record.record_id}: invalid latency_ms`);
  if (!Number.isInteger(record.attempt) || record.attempt < 0) failures.push(`${record.record_id}: invalid attempt`);
  if (record.broadcasted !== false) failures.push(`${record.record_id}: broadcasted is not false`);
}
for (const record of snapshots) if (record.scenario_id === "" || (!record.result && !record.error)) failures.push("result snapshot missing result/error");
for (const result of safety.results) if (result.broadcasted !== false) failures.push(`${result.scenarioId}: safety result is marked broadcasted`);

const observedCounts = Object.fromEntries([...new Set(allRecords.map((record) => record.scenario_id))].map((scenario) => [scenario, allRecords.filter((record) => record.scenario_id === scenario).length]));
const coverageGaps = [...planned.entries()].filter(([scenario, target]) => (observedCounts[scenario] ?? 0) < target).map(([scenario, target]) => ({ scenario, target, observed: observedCounts[scenario] ?? 0 }));
const report = {
  status: failures.length ? "FAIL" : coverageGaps.length ? "PASS_WITH_GAPS" : "PASS",
  auditedFiles: ["readonly.jsonl", "safety.jsonl", "readonly-results.jsonl", "safety-results.json"],
  requestRecords: allRecords.length,
  resultSnapshots: snapshots.length,
  safetyResults: safety.results.length,
  uniqueRecordIds: ids.size,
  broadcastedRecords: allRecords.filter((record) => record.broadcasted).length,
  observedCounts,
  coverageGaps,
  failures
};
writeFileSync("research/experiments/audit-results.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
