import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const evidencePath = resolve(root, "records/ariadne-workflow/evidence/founder-funded-bsc-purchase-2026-10-09.json");
const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, any>;

assert.equal(evidence.classification, "owner-authorized founder-funded mainnet pilot evidence");
assert.equal(evidence.scope.network, "BNB Smart Chain mainnet");
assert.equal(evidence.scope.chainId, "56");
assert.equal(evidence.scope.issuer, "bStocks");
assert.equal(evidence.scope.symbol, "NVDAB");
assert.match(evidence.scope.wallet, /^0x[0-9a-fA-F]{40}$/);
assert.match(evidence.mainPurchaseTransaction.hash, /^0x[0-9a-f]{64}$/);
assert.equal(evidence.mainPurchaseTransaction.receiptStatus, "success");
assert.equal(evidence.mainPurchaseTransaction.inputSpentBaseUnits, "7000000000000000000");
assert.equal(evidence.mainPurchaseTransaction.outputReceivedBaseUnits, "29960179248028382");
assert.ok(BigInt(evidence.mainPurchaseTransaction.outputReceivedBaseUnits) >= BigInt(evidence.mainPurchaseTransaction.reviewedMinimumOutputBaseUnits));
assert.notEqual(evidence.mainPurchaseTransaction.hash, evidence.auxiliaryTransaction.hash);
assert.match(evidence.auxiliaryTransaction.classification, /not the stock-purchase transaction/);

for (const media of [evidence.media.metamask, evidence.media.bscscan]) {
  const path = resolve(root, media.path);
  const bytes = readFileSync(path);
  assert.equal(statSync(path).size, media.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), media.sha256);
}

const serialized = JSON.stringify(evidence);
assert.doesNotMatch(serialized, /private.?key|seed phrase|recovery phrase|signedTransaction/i);
assert.ok(evidence.limits.some((item: string) => /does not establish reliability/.test(item)));
assert.ok(evidence.limits.some((item: string) => /Ondo remains/.test(item)));

console.log(JSON.stringify({
  passed: true,
  evidenceId: evidence.evidenceId,
  network: evidence.scope.network,
  mainPurchaseHash: evidence.mainPurchaseTransaction.hash,
  receiptStatus: evidence.mainPurchaseTransaction.receiptStatus,
  inputSpent: evidence.mainPurchaseTransaction.inputSpent,
  outputReceived: evidence.mainPurchaseTransaction.outputReceived,
  mediaIntegrity: "verified",
  sensitiveMaterialPresent: false,
  limitsPreserved: true
}, null, 2));
