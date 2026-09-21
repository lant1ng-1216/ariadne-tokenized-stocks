import assert from "node:assert/strict";
import { evaluateBaseline } from "../src/jev/baseline.js";
import { runShadowGate } from "../src/jev/shadow-gate.js";
import { writeShadowDecisionRecord } from "../src/jev/record.js";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const safe = {
  phase: "test-phase",
  objective: "Validate a safe read-only phase",
  checks: [{ name: "typecheck", passed: true, evidence: "pass" }],
  deferredItems: [],
  blockedItems: [],
  externalWriteRequested: false,
  highRiskActionRequested: false,
};
const unsafe = { ...safe, highRiskActionRequested: true };

assert.equal(evaluateBaseline(safe).status, "passed");
assert.equal(evaluateBaseline(unsafe).nextAction, "ask_user");
const record = await runShadowGate(safe);
assert.equal(record.mode, "shadow");
assert.equal(record.actionTaken, "none");
assert.equal(record.phaseTransition, "pause");
assert.equal(record.baseline.automaticExecutionAllowed, false);
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
  mockedJevParsing: false,
  actionTaken: record.actionTaken,
  passed: true,
}, null, 2));
