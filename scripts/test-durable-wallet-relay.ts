import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { RemoteStateStore } from "../src/remote/state-store.js";
import { DurableWalletRelay } from "../src/remote/durable-wallet-relay.js";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL is required for durable relay checks");
const url = new URL(rawUrl);
url.searchParams.set("sslmode", "verify-full");
const owner = `test-owner-${randomUUID()}`;
const other = `test-owner-${randomUUID()}`;
const origin = "https://wallet.example.test/";
const account = "0x1111111111111111111111111111111111111111";
const inputContract = "0x5555555555555555555555555555555555555555";
const outputContract = "0x6666666666666666666666666666666666666666";
const spender = "0x3333333333333333333333333333333333333333";
const first = new DurableWalletRelay(rawUrl);
const second = new DurableWalletRelay(rawUrl);
const schema = new RemoteStateStore(rawUrl);
const cleanup = new pg.Client({ connectionString: url.toString() });
let created = false;

try {
  await schema.migrate();
  const handoff = await first.withOwnerStore(owner, origin, (store) => {
    const created = store.create({
      planId: `test-${randomUUID()}`, account, chainId: "0x38", expiresAt: Date.now() + 60_000,
      request: { from: account, to: spender, value: "0x0", data: "0x1234", gas: "0x5208", gasPrice: "0x3b9aca00" },
      display: { operation: "purchase", issuer: "bStocks", ticker: "TEST", inputAmount: "1", inputSymbol: "USDT", inputContract,
        expectedOutput: "1", outputSymbol: "TESTB", outputContract, minimumOutput: "0.9", spender, marketStatus: "open", slippageBps: 200, maxGasCostBnb: "0.01" }
    });
    store.activate(created.id);
    return created;
  });
  created = true;
  assert.equal(await second.findOwner(handoff.id), owner);
  assert.equal(await second.withOwnerStore(owner, origin, (store) => store.readPublic(handoff.id, handoff.capability).state), "active");
  await assert.rejects(() => second.withOwnerStore(other, origin, (store) => store.readPublic(handoff.id, handoff.capability)), /not found/);

  const attempted = await Promise.allSettled([
    first.withOwnerStore(owner, origin, (store) => store.claimWalletAttempt(handoff.id, handoff.capability, randomUUID())),
    second.withOwnerStore(owner, origin, (store) => store.claimWalletAttempt(handoff.id, handoff.capability, randomUUID()))
  ]);
  assert.equal(attempted.filter((value) => value.status === "fulfilled").length, 1, "different concurrent wallet attempts cannot both win");
  const after = await second.withOwnerStore(owner, origin, (store) => store.readInternal(handoff.id));
  assert.ok(after.walletAttemptClaimedAt, "wallet claim survives a fresh instance");

  const txHash = `0x${"a".repeat(64)}`;
  await first.withOwnerStore(owner, origin, (store) => store.submitFromWallet(handoff.id, handoff.capability, { account, chainId: "0x38", txHash }));
  assert.equal((await second.withOwnerStore(owner, origin, (store) => store.readInternal(handoff.id))).txHash, txHash);
  await second.withOwnerStore(owner, origin, (store) => store.setVerification(handoff.id, { state: "confirmed", reconciliation: { fixtureOnly: true }, resultSummary: "fixture" }));
  const claims = await Promise.all([
    first.withOwnerStore(owner, origin, (store) => store.claimAgentReport(handoff.id)),
    second.withOwnerStore(owner, origin, (store) => store.claimAgentReport(handoff.id))
  ]);
  assert.equal(claims.filter((value) => value.claimed).length, 1, "one Agent report claim across instances");
  console.log("durable relay: restart, owner isolation, concurrent wallet claim, hash, verification and one report claim passed");
} finally {
  await Promise.allSettled([first.close(), second.close(), schema.close()]);
  if (created) {
    await cleanup.connect();
    try { await cleanup.query("DELETE FROM ariadne_remote_relay_snapshots WHERE owner_id = ANY($1::text[])", [[owner, other]]); }
    finally { await cleanup.end(); }
  }
}
