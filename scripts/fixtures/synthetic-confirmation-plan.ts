import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { attachSimulation } from "../../src/domain/action-plan.js";
import type { ActionPlan, SafetyCheck } from "../../src/domain/types.js";
import { PlanRegistry } from "../../src/mcp/plan-registry.js";

const wallet = "0x1111111111111111111111111111111111111111";
const inputToken = "0x2222222222222222222222222222222222222222";
const transactionTarget = "0x3333333333333333333333333333333333333333";
const testAsset = "0x4444444444444444444444444444444444444444";
const spender = "0x5555555555555555555555555555555555555555";

/** A process-local, synthetic-only confirmation plan. It has no API or wallet dependency. */
export function createSyntheticConfirmationPlan(
  planId = `synthetic_confirmation_host_fixture_${randomUUID()}`,
  registry = new PlanRegistry(),
) {
  const checks: SafetyCheck[] = [
    "asset_identity",
    "market_status",
    "quote_available",
    "price_impact",
    "authorization_visibility",
    "input_balance",
  ].map((name) => ({
    name,
    passed: true,
    severity: "blocking",
    message: name === "authorization_visibility"
      ? `ERC-20 allowance is sufficient, spender=${spender}. Synthetic fixture only; no live check was performed.`
      : name === "market_status"
        ? "Synthetic fixture market status: open (test-only; no live market check or action is available)."
        : "Synthetic test fixture only; no live check was performed.",
  }));
  const prepared: ActionPlan = {
    planId,
    status: "awaiting_confirmation",
    intent: {
      type: "buy",
      walletAddress: wallet,
      fromTokenAddress: inputToken,
      amount: "1.25",
      amountDecimals: 6,
      maxSlippageBps: 50,
      maxGasCostBnb: "0.0002",
      toAsset: {
        assetId: `56:${testAsset}`,
        chainId: "56",
        platformId: "synthetic-test-only",
        contractAddress: testAsset,
        tokenSymbol: "TESTB",
        underlyingTicker: "TEST",
        underlyingName: "Synthetic TEST asset — not a real security",
      },
    },
    assetContext: {
      asset: {
        assetId: `56:${testAsset}`,
        chainId: "56",
        platformId: "synthetic-test-only",
        contractAddress: testAsset,
        tokenSymbol: "TESTB",
        underlyingTicker: "TEST",
        underlyingName: "Synthetic TEST asset — not a real security",
      },
      marketStatus: "unknown",
      openState: true,
      dataWarnings: ["Market status category is unknown; provider openState=true is only an independent signal."],
    },
    quoteId: "synthetic-only-no-provider-quote",
    expectedOutput: "1250000",
    minimumOutput: "1243750",
    verifiedTokens: {
      input: { chainId: "56", contractAddress: inputToken, symbol: "USDT", decimals: 6, verifiedAt: 1_800_000_000_000, verificationSource: "bsc-eth-call" },
      output: { chainId: "56", contractAddress: testAsset, symbol: "TESTB", decimals: 6, verifiedAt: 1_800_000_000_000, verificationSource: "bsc-eth-call" },
    },
    estimatedFees: { providerRouteFeeUsd: "0.12", providerGasFeeBaseUnits: "150000", estimatedMaxGasCostBnb: "0.00008", networkGasLimit: "80000", highGasPriceWei: "100000000", nativeGasBudgetBnb: "0.0002" },
    unsignedActions: [{
      kind: "evm_transaction",
      chainId: "56",
      quoteId: "synthetic-only-no-provider-quote",
      payload: { tx: { from: wallet, to: transactionTarget, value: "0", data: "0x1234" } },
    }],
    safetyReport: { passed: true, checks, blockingReasons: [] },
    authorizationCheck: {
      required: true,
      tokenAddress: inputToken,
      spender,
      requiredAmount: "1250000",
      reviewedAllowance: "2000000",
    },
    expiresAt: Date.now() + 10 * 60_000,
    requiresUserConfirmation: true,
  };

  registry.registerPrepared(prepared);
  const simulated = attachSimulation(prepared, {
    success: true,
    balanceChanges: [],
    allowanceChanges: [],
    warnings: ["Synthetic fixture; no blockchain simulation was performed."],
  });
  assert.equal(simulated.status, "simulated");
  registry.advance(prepared, "awaiting_confirmation", simulated, "simulated");
  return { registry, plan: simulated };
}
