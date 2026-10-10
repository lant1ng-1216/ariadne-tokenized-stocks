import assert from "node:assert/strict";
import { createSyntheticConfirmationPlan } from "./fixtures/synthetic-confirmation-plan.js";
import { WalletHandoffRelayClient, WalletHandoffStore, type ExternalWalletHandoffCreate, type ExternalWalletPurchaseIntent } from "../src/services/wallet-handoff-relay.js";
import { createWalletHandoffRelayServer } from "../src/mcp/wallet-handoff-relay-server.js";
import type { ActionPlan } from "../src/domain/types.js";

const wallet = "0x1111111111111111111111111111111111111111";
const { plan: simulated } = createSyntheticConfirmationPlan();
const asset = { ...simulated.intent.toAsset, platformId: "bstock", tokenSymbol: "NVDAB", underlyingTicker: "NVDA", underlyingName: "NVIDIA Corp" };
const intent: ExternalWalletPurchaseIntent = {
  intentId: "intent-fixture-1", language: "en", asset, amount: "7", inputTokenSymbol: "USDT",
  maxSlippageBps: 200, networkFeePolicy: "provider_estimated_max",
  marketBaseline: { tokenPrice: "237.10", referencePrice: "236.90", tokenPriceUpdatedAt: 1_800_000_000_000 }
};
const plan: ActionPlan = {
  ...simulated,
  planId: "wallet-bound-plan-1",
  status: "awaiting_confirmation",
  requiresUserConfirmation: true,
  intent: { ...simulated.intent, walletAddress: wallet, amount: "7", maxSlippageBps: 200, maxGasCostBnb: undefined, toAsset: asset },
  verifiedTokens: { ...simulated.verifiedTokens!, output: { ...simulated.verifiedTokens!.output, symbol: "NVDAB", contractAddress: asset.contractAddress } },
  expectedOutput: "30000000000000000",
  minimumOutput: "29400000000000000",
  expiresAt: Date.now() + 60_000
};
const display: ExternalWalletHandoffCreate["display"] = {
  operation: "purchase", issuer: "bStocks", ticker: "NVDA", underlyingName: "NVIDIA Corp",
  inputAmount: "7", inputSymbol: "USDT", inputContract: plan.verifiedTokens!.input.contractAddress,
  expectedOutput: "0.03", outputSymbol: "NVDAB", outputContract: asset.contractAddress,
  minimumOutput: "0.0294", spender: plan.authorizationCheck!.spender,
  allowanceCurrent: "2", allowanceRequired: "7", allowanceStatus: "insufficient",
  estimatedNetworkFeeBnb: "0.00008", marketStatus: "unknown", slippageBps: 200,
  maxGasCostBnb: "0.00008", marketReference: { chainId: "56", platformId: "bstock", contractAddress: asset.contractAddress },
  purchaseBaseline: { expectedOutput: plan.expectedOutput!, minimumOutput: plan.minimumOutput!, outputDecimals: 18, slippageBps: 200, estimatedNetworkFeeBnb: "0.00008" }
};

const store = new WalletHandoffStore({ portalOrigin: "https://wallet.example.test" });
const created = store.createPurchaseIntent(intent);
assert.match(created.url, /\/approve\?lang=en#[a-f0-9]{32}\./);
const pending = store.readInternal(created.id);
assert.equal(pending.reviewMode, "purchase_intent");
assert.equal(pending.request, undefined);
assert.equal(pending.originalPlan, undefined);
assert.equal(pending.purchaseIntent?.networkFeePolicy, "provider_estimated_max");
assert.equal(pending.account, undefined, "a public purchase-intent snapshot must not expose a placeholder wallet account");

const bound = store.bindPurchaseIntent(created.id, created.capability, plan, display);
assert.equal(bound.reviewMode, "purchase_plan");
assert.equal(bound.account, wallet);
assert.equal(bound.planId, plan.planId);
assert.equal(bound.request, undefined, "binding creates the exact baseline but no wallet request until refresh and allowance checks finish");
assert.equal(store.readInternal(created.id).originalPlan?.intent.walletAddress, wallet);

const other = store.createPurchaseIntent({ ...intent, intentId: "intent-fixture-2" });
assert.throws(() => store.bindPurchaseIntent(other.id, other.capability, {
  ...plan, intent: { ...plan.intent, amount: "8" }
}, { ...display, inputAmount: "8" }), /changed the original purchase intent/i);

const relaySecret = "wallet-resolved-intent-test-secret-32-characters";
const confirmed: ActionPlan = {
  ...plan,
  status: "confirmed",
  requiresUserConfirmation: false,
  authorizationCheck: { ...plan.authorizationCheck!, requiredAmount: "7000000000000000000", reviewedAllowance: "8000000000000000000" },
  expiresAt: Date.now() + 60_000
};
const executableDisplay: ExternalWalletHandoffCreate["display"] = {
  ...display,
  allowanceCurrent: "8",
  allowanceRequired: "7",
  allowanceStatus: "sufficient"
};
const relay = await createWalletHandoffRelayServer({
  host: "127.0.0.1", port: 0, portalOrigin: "http://127.0.0.1:0", serviceSecret: relaySecret,
  preparePurchaseIntent: async (received, account) => {
    assert.equal(received.intentId, intent.intentId);
    assert.equal(account, wallet);
    return { plan, display };
  },
  preparePurchaseRefresh: async () => ({
    plan: confirmed,
    request: { from: wallet, to: "0x3333333333333333333333333333333333333333", value: "0x0", data: "0x1234", gas: "0x186a0", gasPrice: "0x3b9aca00" },
    display: executableDisplay,
    beforeBalances: { inputBalance: "8000000000000000000", outputBalance: "0" }
  })
});
try {
  const relayAddress = relay.server.address();
  assert.ok(relayAddress && typeof relayAddress === "object");
  const origin = `http://127.0.0.1:${relayAddress.port}`;
  const client = new WalletHandoffRelayClient({ baseUrl: origin, secret: relaySecret });
  const session = await client.createPurchaseIntent(intent);
  const bind = await fetch(`${origin}/api/handoffs/${session.id}/bind-wallet`, {
    method: "POST",
    headers: { origin, authorization: `Bearer ${session.capability}`, "content-type": "application/json" },
    body: JSON.stringify({ account: wallet, chainId: "0x38" })
  });
  assert.equal(bind.status, 200);
  const exact = await bind.json() as Record<string, unknown>;
  assert.equal(exact.reviewMode, "purchase_plan");
  assert.equal(exact.account, wallet);
  assert.equal((exact.request as Record<string, unknown>).from, wallet);
  assert.equal((exact.display as Record<string, unknown>).allowanceStatus, "sufficient");
  assert.equal(relay.store.readInternal(session.id).originalPlan?.intent.walletAddress, wallet);
} finally {
  relay.server.close();
}

console.log("Wallet-resolved purchase-intent contract passed: the link starts wallet-free, preserves product defaults, and only becomes an exact plan after binding the browser-selected BSC account.");
