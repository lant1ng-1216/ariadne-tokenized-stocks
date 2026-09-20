import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendExperimentRecord, classifyObservation, recordFromObservation } from "../src/observability/experiment-recorder.js";

const retry = { method: "GET", path: "/api/v1/test", durationMs: 12, status: 429, code: 42900, success: false, attempt: 0, rateLimitHeaders: { "Retry-After": "0.01" } };
const success = { method: "GET", path: "/api/v1/test?q=NVDA", durationMs: 8, status: 200, code: 0, success: true, attempt: 1 };
assert.deepEqual(classifyObservation(retry), { response_class: "retryable_rate_limit", handling_decision: "retry" });
assert.deepEqual(classifyObservation(success), { response_class: "success", handling_decision: "return_normalized" });

const record = recordFromObservation({ scenarioId: "retry_policy", requestVariant: "deterministic-42900", observation: retry, sourceRef: "scripts/test-experiment-recorder.ts", recordId: "test-record-1" });
assert.equal(record.endpoint, "/api/v1/test");
assert.equal(record.broadcasted, false);
assert.equal(record.retry_after_honored, true);

const directory = await mkdtemp(join(tmpdir(), "ariadne-experiment-"));
const path = join(directory, "records.jsonl");
await appendExperimentRecord(path, record);
await appendExperimentRecord(path, recordFromObservation({ scenarioId: "retry_policy", requestVariant: "deterministic-42900", observation: success, sourceRef: "scripts/test-experiment-recorder.ts", recordId: "test-record-2" }));
const lines = (await readFile(path, "utf8")).trim().split("\n");
assert.equal(lines.length, 2);
assert.equal(JSON.parse(lines[0]).record_id, "test-record-1");
assert.equal(JSON.parse(lines[1]).handling_decision, "return_normalized");
console.log(JSON.stringify({ status: "PASS", recordsWritten: lines.length, broadcasted: false }, null, 2));
