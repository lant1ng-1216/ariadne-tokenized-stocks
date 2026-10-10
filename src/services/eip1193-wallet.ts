import type { ActionPlan } from "../domain/types.js";
import { requireReviewedGasBudget } from "../domain/gas-safety.js";

export type Eip1193Provider = {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>;
};

export type WalletSubmissionRequest = {
  from: string;
  to: string;
  value: string;
  data?: string;
  gas: string;
  gasPrice: string;
};

/** Exact request shape accepted from the Agent-native wallet approval panel. */
export function walletSubmissionRequestsMatch(expected: WalletSubmissionRequest, submitted: unknown): boolean {
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) return false;
  const candidate = submitted as Record<string, unknown>;
  try {
    return typeof candidate.from === "string" && candidate.from.toLowerCase() === expected.from.toLowerCase() &&
      typeof candidate.to === "string" && candidate.to.toLowerCase() === expected.to.toLowerCase() &&
      typeof candidate.value === "string" && quantity(candidate.value, "Wallet value").toString() === quantity(expected.value, "Expected value").toString() &&
      typeof candidate.data === "string" && candidate.data.toLowerCase() === (expected.data ?? "0x").toLowerCase() &&
      typeof candidate.gas === "string" && quantity(candidate.gas, "Wallet gas limit").toString() === quantity(expected.gas, "Expected gas limit").toString() &&
      typeof candidate.gasPrice === "string" && quantity(candidate.gasPrice, "Wallet gas price").toString() === quantity(expected.gasPrice, "Expected gas price").toString();
  } catch {
    return false;
  }
}

export type ExpectedWalletTransaction = {
  from: string;
  to: string;
  value: string;
  data: string;
  maxGasCostWei: string;
};

function quantity(value: string, label: string): bigint {
  if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  if (/^\d+$/.test(value)) return BigInt(value);
  throw new Error(`${label} is not a valid EVM quantity`);
}

function rpcQuantity(value: bigint): string {
  if (value < 0n) throw new Error("EVM transaction quantities cannot be negative");
  return `0x${value.toString(16)}`;
}

/** Build the exact wallet request from an unchanged, confirmed BSC EVM plan. */
export function buildWalletSubmissionRequest(plan: ActionPlan): {
  request: WalletSubmissionRequest;
  expected: ExpectedWalletTransaction;
  gasLimit: bigint;
  gasPriceWei: bigint;
  reviewedGasBudgetWei: bigint;
} {
  if (plan.status !== "confirmed" || plan.intent.toAsset.chainId !== "56" || plan.executionMode !== "SWAP" || plan.unsignedActions?.length !== 1) {
    throw new Error("Wallet submission requires one confirmed standard BSC EVM swap plan");
  }
  const action = plan.unsignedActions[0] as { kind?: unknown; chainId?: unknown; payload?: { tx?: Record<string, unknown> } };
  const tx = action?.payload?.tx;
  if (action?.kind !== "evm_transaction" || action.chainId !== "56" || !tx ||
    typeof tx.from !== "string" || tx.from.toLowerCase() !== plan.intent.walletAddress.toLowerCase() ||
    typeof tx.to !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(tx.to) ||
    typeof tx.value !== "string" || typeof tx.data !== "string" || !/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.data)) {
    throw new Error("Confirmed plan does not contain a valid wallet transaction request");
  }
  const gasLimitText = plan.estimatedFees?.networkGasLimit;
  const gasPriceText = plan.estimatedFees?.highGasPriceWei;
  if (!gasLimitText || !gasPriceText || !/^\d+$/.test(gasLimitText) || !/^\d+$/.test(gasPriceText)) {
    throw new Error("Confirmed plan lacks a reviewed BSC gas limit and high-tier gas price");
  }
  const gasLimit = BigInt(gasLimitText);
  const gasPriceWei = BigInt(gasPriceText);
  const reviewedGasBudgetWei = requireReviewedGasBudget(plan);
  if (gasLimit <= 0n || gasPriceWei <= 0n || gasLimit * gasPriceWei > reviewedGasBudgetWei) {
    throw new Error("Reviewed BSC gas estimate exceeds the confirmed plan's maximum gas budget");
  }
  const value = quantity(tx.value, "Transaction value");
  const normalizedData = tx.data.toLowerCase();
  return {
    request: {
      from: tx.from,
      to: tx.to,
      value: rpcQuantity(value),
      data: normalizedData,
      gas: rpcQuantity(gasLimit),
      gasPrice: rpcQuantity(gasPriceWei)
    },
    expected: {
      from: tx.from,
      to: tx.to,
      value: value.toString(),
      data: normalizedData,
      maxGasCostWei: reviewedGasBudgetWei.toString()
    },
    gasLimit,
    gasPriceWei,
    reviewedGasBudgetWei
  };
}

/** Ask a user's EIP-1193 wallet to connect, then require its active chain/account to match the reviewed plan. */
export async function authorizeEip1193Wallet(provider: Eip1193Provider, plan: ActionPlan): Promise<void> {
  if (!provider || typeof provider.request !== "function") throw new Error("An EIP-1193 wallet provider is required");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !accounts.some((account) => typeof account === "string" && account.toLowerCase() === plan.intent.walletAddress.toLowerCase())) {
    throw new Error("Connected wallet account does not match the wallet address in the confirmed plan");
  }
  const chainId = await provider.request({ method: "eth_chainId" });
  if (typeof chainId !== "string" || !/^0x[0-9a-fA-F]+$/.test(chainId) || BigInt(chainId) !== 56n) {
    throw new Error("Connected wallet is not on BSC chain 56; switch networks and prepare or confirm a fresh plan");
  }
}

function evmQuantity(value: unknown): bigint | undefined {
  if (typeof value !== "string") return undefined;
  if (/^0x[0-9a-fA-F]+$/.test(value) || /^\d+$/.test(value)) return BigInt(value);
  return undefined;
}

/** Check a wallet-broadcast transaction against the exact reviewed plan and fee ceiling. */
export function walletTransactionMismatches(expected: ExpectedWalletTransaction, value: unknown, expectedHash?: string): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Wallet transaction is not available from the configured BSC RPC"];
  const tx = value as Record<string, unknown>;
  const observedHash = typeof tx.hash === "string" ? tx.hash : typeof tx.transactionHash === "string" ? tx.transactionHash : undefined;
  const input = typeof tx.input === "string" ? tx.input : typeof tx.data === "string" ? tx.data : undefined;
  const gas = evmQuantity(tx.gas);
  const fee = evmQuantity(tx.gasPrice) ?? evmQuantity(tx.maxFeePerGas);
  const chainId = evmQuantity(tx.chainId);
  return [
    ...(expectedHash && (typeof observedHash !== "string" || observedHash.toLowerCase() !== expectedHash.toLowerCase()) ? ["BSC RPC transaction hash does not match the wallet-returned hash"] : []),
    ...(typeof tx.from !== "string" || tx.from.toLowerCase() !== expected.from.toLowerCase() ? ["Wallet transaction sender does not match the reviewed wallet"] : []),
    ...(typeof tx.to !== "string" || tx.to.toLowerCase() !== expected.to.toLowerCase() ? ["Wallet transaction target does not match the reviewed plan"] : []),
    ...(evmQuantity(tx.value)?.toString() !== expected.value ? ["Wallet transaction native value does not match the reviewed plan"] : []),
    ...(typeof input !== "string" || input.toLowerCase() !== expected.data ? ["Wallet transaction calldata does not match the reviewed plan"] : []),
    ...(gas === undefined || fee === undefined || gas <= 0n || fee <= 0n || gas * fee > BigInt(expected.maxGasCostWei) ? ["Wallet transaction gas settings exceed or do not prove the reviewed maximum gas budget"] : []),
    ...(chainId !== undefined && chainId !== 56n ? ["Wallet transaction is not on BSC chain 56"] : [])
  ];
}
