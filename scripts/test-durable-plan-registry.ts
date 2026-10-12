import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type { ActionPlan, SafetyCheck } from "../src/domain/types.js";
import { attachSimulation, confirmPlan } from "../src/domain/action-plan.js";
import { DurablePlanRegistry } from "../src/remote/durable-plan-registry.js";
import { RemoteStateStore } from "../src/remote/state-store.js";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL is required for the durable plan check");
const url = new URL(rawUrl);
url.searchParams.set("sslmode", "verify-full");
const id = `test-${randomUUID()}`;
const owner = `test-owner-${randomUUID()}`;
const other = `test-owner-${randomUUID()}`;
const spender = "0x3333333333333333333333333333333333333333";
const checks: SafetyCheck[] = ["asset_identity", "market_status", "quote_available", "price_impact", "authorization_visibility", "input_balance"].map((name) => ({ name, passed: true, severity: "info", message: "fixture" }));
const prepared: ActionPlan = {
  planId: id, status: "awaiting_confirmation",
  intent: { type: "buy", walletAddress: "0x1111111111111111111111111111111111111111", fromTokenAddress: "0x5555555555555555555555555555555555555555", amount: "1.25", amountDecimals: 6, maxGasCostBnb: "0.0002",
    toAsset: { assetId: "56:0x6666666666666666666666666666666666666666", chainId: "56", platformId: "bstock", contractAddress: "0x6666666666666666666666666666666666666666", tokenSymbol: "TESTB", underlyingTicker: "TEST", underlyingName: "Test" } },
  quoteId: "quote-1", expectedOutput: "100",
  unsignedActions: [{ kind: "evm_transaction", chainId: "56", quoteId: "quote-1", payload: { tx: { from: "0x1111111111111111111111111111111111111111", to: "0x4444444444444444444444444444444444444444", value: "0", data: "0x1234" } } }],
  safetyReport: { passed: true, checks, blockingReasons: [] },
  authorizationCheck: { required: true, tokenAddress: "0x5555555555555555555555555555555555555555", spender, requiredAmount: "1250000", reviewedAllowance: "2000000" },
  expiresAt: Date.now() + 60_000, requiresUserConfirmation: true
};

const storeA = new RemoteStateStore(rawUrl);
const storeB = new RemoteStateStore(rawUrl);
const first = new DurablePlanRegistry(storeA, owner);
const second = new DurablePlanRegistry(storeB, owner);
const stranger = new DurablePlanRegistry(storeB, other);
const cleanup = new pg.Client({ connectionString: url.toString() });
let created = false;
try {
  await storeA.migrate();
  await first.registerPrepared(prepared);
  created = true;
  assert.deepEqual(await second.requireById(id, "awaiting_confirmation"), prepared);
  await assert.rejects(() => stranger.requireById(id, "awaiting_confirmation"), /another user/);
  await assert.rejects(() => second.requireExact({ ...prepared, quoteId: "changed" }, "awaiting_confirmation"), /changed/);

  const simulated = attachSimulation(prepared, { success: true, balanceChanges: [], allowanceChanges: [], warnings: [] });
  const concurrent = await Promise.allSettled([
    first.advance(prepared, "awaiting_confirmation", simulated, "simulated"),
    second.advance(prepared, "awaiting_confirmation", simulated, "simulated")
  ]);
  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1, "only one transition may commit");
  const confirmed = confirmPlan(simulated);
  await second.advance(simulated, "simulated", confirmed, "confirmed");
  const attempts = await Promise.allSettled([first.reserveBroadcast(confirmed), second.reserveBroadcast(confirmed)]);
  assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1, "only one broadcast reservation may commit");
  assert.deepEqual(await second.requireBroadcasted(id), confirmed);
  assert.deepEqual(await first.readStoredPlan(id), confirmed);
  console.log("durable plan: restarted reads, owner isolation, exact quote, concurrent transitions and one broadcast reservation passed");
} finally {
  await Promise.allSettled([storeA.close(), storeB.close()]);
  if (created) {
    await cleanup.connect();
    try { await cleanup.query("DELETE FROM ariadne_remote_records WHERE kind='plan' AND id=$1 AND owner_id=$2", [id, owner]); }
    finally { await cleanup.end(); }
  }
}
