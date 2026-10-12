import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { RemoteStateStore } from "../src/remote/state-store.js";
import { DurableConfirmationContinuationStore } from "../src/remote/durable-confirmation.js";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL is required for the remote-state check");
const url = new URL(rawUrl);
url.searchParams.set("sslmode", "verify-full");
const planId = `test-${randomUUID()}`;
const handoffId = `test-${randomUUID()}`;
const confirmationId = randomUUID();
const ownerId = `test-owner-${randomUUID()}`;
const otherOwner = `test-owner-${randomUUID()}`;
const first = new RemoteStateStore(rawUrl);
const second = new RemoteStateStore(rawUrl);
const cleanup = new pg.Client({ connectionString: url.toString() });
let created = false;

try {
  await first.migrate();
  const plan = await first.create({ kind: "plan", id: planId, ownerId, state: "awaiting_confirmation", payload: { symbol: "NVDAB", amount: "10" }, expiresAt: new Date(Date.now() + 60_000) });
  created = true;
  assert.equal(plan.version, 1);
  assert.equal((await second.read<{ symbol: string }>("plan", planId, ownerId))?.payload.symbol, "NVDAB", "state must survive a distinct store instance");
  assert.equal(await second.read("plan", planId, otherOwner), null, "another user cannot read a plan");

  const transitions = await Promise.all([
    first.transition({ kind: "plan", id: planId, ownerId, version: 1, from: "awaiting_confirmation", to: "simulated", payload: { symbol: "NVDAB", amount: "10" } }),
    second.transition({ kind: "plan", id: planId, ownerId, version: 1, from: "awaiting_confirmation", to: "simulated", payload: { symbol: "NVDAB", amount: "10" } })
  ]);
  assert.equal(transitions.filter(Boolean).length, 1, "only one concurrent transition may win");
  assert.equal(await second.transition({ kind: "plan", id: planId, ownerId: otherOwner, version: 2, from: "simulated", to: "confirmed", payload: {} }), null);

  await first.create({ kind: "handoff", id: handoffId, ownerId, state: "active", payload: { planId }, expiresAt: new Date(Date.now() + 60_000) });
  const attemptHash = createHash("sha256").update(randomUUID()).digest("hex");
  const attempts = await Promise.all([
    first.claimWalletAttempt(handoffId, ownerId, attemptHash),
    second.claimWalletAttempt(handoffId, ownerId, attemptHash)
  ]);
  assert.equal(attempts.filter(Boolean).length, 1, "one wallet attempt per handoff");
  assert.equal(await second.claimWalletAttempt(handoffId, otherOwner, createHash("sha256").update(randomUUID()).digest("hex")), false);

  const txHash = `0x${"a".repeat(64)}`;
  assert.equal(await first.attachTransactionHash(handoffId, ownerId, txHash), true);
  assert.equal(await second.attachTransactionHash(handoffId, ownerId, `0x${"b".repeat(64)}`), false, "a second hash cannot replace the first");
  assert.equal(await second.attachTransactionHash(handoffId, otherOwner, txHash), false);

  const handoff = await first.read("handoff", handoffId, ownerId);
  assert.ok(handoff);
  assert.ok(await first.transition({ kind: "handoff", id: handoffId, ownerId, version: handoff.version, from: "active", to: "confirmed", payload: handoff.payload }));

  const reports = await Promise.all([
    first.claimReport(handoffId, ownerId, { state: "confirmed" }),
    second.claimReport(handoffId, ownerId, { state: "confirmed" })
  ]);
  assert.equal(reports.filter(Boolean).length, 1, "one terminal report claim");
  assert.equal(await second.claimReport(handoffId, otherOwner, { state: "confirmed" }), false);
  const confirmationA = new DurableConfirmationContinuationStore(first, ownerId);
  const confirmationB = new DurableConfirmationContinuationStore(second, ownerId);
  const confirmationOther = new DurableConfirmationContinuationStore(second, otherOwner);
  await confirmationA.create(confirmationId, planId, Date.now() + 60_000);
  assert.equal(await confirmationOther.consume(confirmationId, planId), false);
  const confirmationClaims = await Promise.all([
    confirmationA.consume(confirmationId, planId),
    confirmationB.consume(confirmationId, planId)
  ]);
  assert.equal(confirmationClaims.filter(Boolean).length, 1, "approval continuation may be consumed once across instances");
  console.log("remote state: distinct instances, owner isolation, concurrent CAS, wallet idempotency and report claim passed");
} finally {
  await Promise.allSettled([first.close(), second.close()]);
  if (created) {
    await cleanup.connect();
    try {
      await cleanup.query("DELETE FROM ariadne_remote_records WHERE id = ANY($1::text[]) AND owner_id=$2", [[planId, handoffId, `confirm:${confirmationId}`], ownerId]);
    } finally {
      await cleanup.end();
    }
  }
}
