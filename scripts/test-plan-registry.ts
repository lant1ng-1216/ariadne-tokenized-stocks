import assert from "node:assert/strict";
import type { ActionPlan, SafetyCheck } from "../src/domain/types.js";
import { attachSimulation, confirmPlan } from "../src/domain/action-plan.js";
import { PlanRegistry } from "../src/mcp/plan-registry.js";
import { jsonDataFingerprint } from "../src/domain/json-snapshot.js";

const spender = "0x3333333333333333333333333333333333333333";
const checks: SafetyCheck[] = ["asset_identity", "quote_available", "price_impact", "authorization_visibility", "input_balance"].map((name) => ({ name, passed: true, severity: "blocking", message: name === "authorization_visibility" ? `ERC-20 allowance is sufficient, spender=${spender}` : "test preflight" }));
const prepared: ActionPlan = {
  planId: "plan-registry-test",
  status: "awaiting_confirmation",
  intent: { type: "buy", walletAddress: "0x1111111111111111111111111111111111111111", fromTokenAddress: "0x5555555555555555555555555555555555555555", amount: "1.25", amountDecimals: 6, maxGasCostBnb: "0.0002",
    toAsset: { assetId: "56:0x6666666666666666666666666666666666666666", chainId: "56", platformId: "bstock", contractAddress: "0x6666666666666666666666666666666666666666", tokenSymbol: "TESTB", underlyingTicker: "TEST", underlyingName: "Test" } },
  quoteId: "quote-1",
  expectedOutput: "100",
  unsignedActions: [{ kind: "evm_transaction", chainId: "56", quoteId: "quote-1", payload: { tx: { from: "0x1111111111111111111111111111111111111111", to: "0x4444444444444444444444444444444444444444", value: "0", data: "0x1234" } } }],
  safetyReport: { passed: true, checks, blockingReasons: [] },
  authorizationCheck: { required: true, tokenAddress: "0x5555555555555555555555555555555555555555", spender, requiredAmount: "1250000", reviewedAllowance: "2000000" },
  expiresAt: Date.now() + 60_000,
  requiresUserConfirmation: true
};

const registry = new PlanRegistry();
registry.registerPrepared(prepared);
assert.deepEqual(registry.requireExact(structuredClone(prepared), "awaiting_confirmation"), prepared);
assert.throws(() => registry.registerPrepared(prepared), /already been registered/);
assert.throws(() => registry.requireExact({ ...prepared, planId: "invented" }, "awaiting_confirmation"), /not created/);
for (const changed of [
  { ...prepared, intent: { ...prepared.intent, amount: "2" } },
  { ...prepared, intent: { ...prepared.intent, maxGasCostBnb: "2" } },
  { ...prepared, intent: { ...prepared.intent, toAsset: { ...prepared.intent.toAsset, contractAddress: "0xother" } } },
  { ...prepared, quoteId: "quote-2" },
  { ...prepared, safetyReport: { ...prepared.safetyReport!, checks: checks.map((check) => check.name === "authorization_visibility" ? { ...check, passed: false } : check) } },
  { ...prepared, unsignedActions: [{ kind: "evm_transaction", payload: { tx: { to: "0xattacker" } } }] },
  { ...prepared, expiresAt: prepared.expiresAt! + 1000 }
]) assert.throws(() => registry.requireExact(changed, "awaiting_confirmation"), /changed/);

const simulated = attachSimulation(prepared, { success: true, balanceChanges: [], allowanceChanges: [], warnings: [] });
assert.equal(simulated.status, "simulated");
assert.throws(() => registry.advance(prepared, "awaiting_confirmation", { ...simulated, intent: { ...simulated.intent, amount: "2" } }, "simulated"), /amount or authorization changed/);
assert.throws(() => registry.advance(prepared, "awaiting_confirmation", { ...simulated, safetyReport: { passed: true, checks: [], blockingReasons: [] } }, "simulated"), /successful safety checks/);
assert.throws(() => registry.advance(prepared, "awaiting_confirmation", { ...simulated, status: "confirmed", requiresUserConfirmation: false }, "confirmed"), /Invalid plan stage transition/);
registry.advance(prepared, "awaiting_confirmation", simulated, "simulated");
assert.throws(() => registry.requireExact(prepared, "awaiting_confirmation"), /required stage/);
assert.throws(() => registry.requireExact({ ...simulated, simulation: { success: false } }, "simulated"), /changed/);
const confirmed = confirmPlan(simulated);
registry.advance(simulated, "simulated", confirmed, "confirmed");
assert.throws(() => registry.advance(confirmed, "confirmed", simulated, "simulated"), /Invalid plan stage transition/);
assert.throws(() => registry.requireExact(simulated, "simulated"), /required stage/);
registry.reserveBroadcast(confirmed);
assert.throws(() => registry.reserveBroadcast(confirmed), /already attempted/);
assert.throws(() => registry.registerPrepared({ ...prepared, planId: "expired", expiresAt: 1 }), /non-expired/);
const realDateNow = Date.now;
let fakeNow = realDateNow();
Date.now = () => fakeNow;
let expiredAfterRegistrationRejected = false;
try {
  const expiringPlan = { ...prepared, planId: "expires-after-registration", expiresAt: fakeNow + 10 };
  const expiringRegistry = new PlanRegistry();
  expiringRegistry.registerPrepared(expiringPlan);
  fakeNow += 11;
  assert.throws(() => expiringRegistry.requireExact(expiringPlan, "awaiting_confirmation"), /Plan has expired/);
  assert.throws(() => expiringRegistry.requireExact(expiringPlan, "awaiting_confirmation"), /Plan was not created/);
  expiredAfterRegistrationRejected = true;
} finally {
  Date.now = realDateNow;
}
const hookedPlan = structuredClone(prepared);
hookedPlan.planId = "plan-registry-tojson-hook";
let serializationHookCalls = 0;
Object.defineProperty(hookedPlan, "toJSON", { value() { serializationHookCalls += 1; return hookedPlan; }, enumerable: false });
assert.throws(() => registry.registerPrepared(hookedPlan), /serialization hooks/);
assert.equal(serializationHookCalls, 0, "registry snapshots must not execute toJSON hooks");
const proxyPlan = new Proxy({ ...prepared, planId: "proxy-plan" }, {
  getPrototypeOf(target) { serializationHookCalls += 1; return Reflect.getPrototypeOf(target); },
  ownKeys(target) { serializationHookCalls += 1; return Reflect.ownKeys(target); },
  getOwnPropertyDescriptor(target, property) { serializationHookCalls += 1; return Reflect.getOwnPropertyDescriptor(target, property); }
});
assert.throws(() => registry.registerPrepared(proxyPlan), /Proxy objects/i);
assert.equal(serializationHookCalls, 0, "registry must reject a Proxy before executing its traps");
const accessorPlan = { ...prepared, planId: "accessor-plan" };
let accessorCalls = 0;
Object.defineProperty(accessorPlan, "status", { configurable: true, enumerable: true, get() { accessorCalls += 1; return "awaiting_confirmation"; } });
assert.throws(() => registry.registerPrepared(accessorPlan), /accessors/i);
assert.equal(accessorCalls, 0, "registry must reject accessors without evaluating them");

const objectToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
const arrayToJson = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
let inheritedHookCalls = 0;
try {
  Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value() { inheritedHookCalls += 1; return "mutated"; } });
  Object.defineProperty(Array.prototype, "toJSON", { configurable: true, value() { inheritedHookCalls += 1; return ["mutated"]; } });
  assert.equal(jsonDataFingerprint({ values: ["plain"], nested: { ok: true } }), '{"nested":{"ok":true},"values":["plain"]}');
  assert.equal(inheritedHookCalls, 0, "fingerprinting must not execute inherited serialization hooks");
} finally {
  if (objectToJson) Object.defineProperty(Object.prototype, "toJSON", objectToJson);
  else delete (Object.prototype as { toJSON?: unknown }).toJSON;
  if (arrayToJson) Object.defineProperty(Array.prototype, "toJSON", arrayToJson);
  else delete (Array.prototype as { toJSON?: unknown }).toJSON;
}

console.log(JSON.stringify({ registered: true, mutationsRejected: 7, stagedTransitions: true, expiredAfterRegistrationRejected, replayRejected: true, proxiesRejectedBeforeTraps: true, accessorsRejectedBeforeEvaluation: true, inheritedHooksNotInvoked: true, passed: true }, null, 2));
