import type { VerifiedTokenIdentity } from "../domain/types.js";
import { formatTokenAmount } from "../domain/amount.js";
import type { TransactionService } from "./transaction.js";
import { walletTransactionMismatches, type ExpectedWalletTransaction } from "./eip1193-wallet.js";

export type BalanceSnapshot = {
  chainId: string;
  walletAddress: string;
  inputToken: VerifiedTokenIdentity;
  outputToken: VerifiedTokenIdentity;
  inputBalance: string;
  outputBalance: string;
  capturedAt: number;
};

export type SettlementResult = {
  status: "pending" | "confirmed" | "reverted" | "balance_mismatch";
  success: boolean;
  txHash: string;
  pollAttempts: number;
  receipt?: { blockNumber?: string; status?: string; from?: string; transactionHash?: string };
  before: BalanceSnapshot;
  after?: { inputBalance: string; outputBalance: string; readAt: number };
  changes?: { inputSpent: string; outputReceived: string; inputSpentDisplay: string; outputReceivedDisplay: string };
  mismatches: string[];
};

type SettlementPort = Pick<TransactionService, "erc20Balance" | "transactionReceipt" | "latestFinalizedBlockNumber"> & Partial<Pick<TransactionService, "transactionByHash">>;

function parseBlockNumber(value: unknown): bigint | undefined {
  if (typeof value !== "string") return undefined;
  if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  if (/^\d+$/.test(value)) return BigInt(value);
  return undefined;
}

/** Poll BSC finalized-block inclusion and require matching wallet/token balance deltas before reporting success. */
export class SettlementReconciler {
  constructor(
    private readonly transactions: SettlementPort,
    private readonly delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  ) {}

  async captureBefore(input: {
    chainId: string;
    walletAddress: string;
    inputToken: VerifiedTokenIdentity;
    outputToken: VerifiedTokenIdentity;
  }): Promise<BalanceSnapshot> {
    if (input.chainId !== "56" || input.inputToken.chainId !== input.chainId || input.outputToken.chainId !== input.chainId) {
      throw new Error("Settlement balance snapshots require verified tokens on the same supported BSC chain");
    }
    const [inputBalance, outputBalance] = await Promise.all([
      this.transactions.erc20Balance(input.chainId, input.inputToken.contractAddress, input.walletAddress),
      this.transactions.erc20Balance(input.chainId, input.outputToken.contractAddress, input.walletAddress)
    ]);
    return {
      chainId: input.chainId,
      walletAddress: input.walletAddress,
      inputToken: input.inputToken,
      outputToken: input.outputToken,
      inputBalance: inputBalance.toString(),
      outputBalance: outputBalance.toString(),
      capturedAt: Date.now()
    };
  }

  async reconcile(input: {
    txHash: string;
    before: BalanceSnapshot;
    expectedInputSpent: string;
    minimumOutputReceived: string;
    expectedTransaction?: ExpectedWalletTransaction;
    maxPollAttempts?: number;
    pollIntervalMs?: number;
  }): Promise<SettlementResult> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) throw new Error("Settlement reconciliation requires a valid transaction hash");
    if (!/^\d+$/.test(input.expectedInputSpent) || !/^\d+$/.test(input.minimumOutputReceived) || BigInt(input.expectedInputSpent) <= 0n || BigInt(input.minimumOutputReceived) <= 0n) {
      throw new Error("Settlement reconciliation requires positive raw input and minimum-output amounts");
    }
    const maxPollAttempts = input.maxPollAttempts ?? 30;
    const pollIntervalMs = input.pollIntervalMs ?? 1_000;
    if (!Number.isInteger(maxPollAttempts) || maxPollAttempts < 1 || maxPollAttempts > 120 || !Number.isInteger(pollIntervalMs) || pollIntervalMs < 0 || pollIntervalMs > 10_000) {
      throw new Error("Settlement polling limits are outside supported bounds");
    }
    let receipt: Record<string, unknown> | undefined;
    let pollAttempts = 0;
    let finalityUnavailable: string | undefined;
    if (input.expectedTransaction && typeof this.transactions.transactionByHash !== "function") {
      throw new Error("Wallet-broadcast reconciliation requires read-only transaction lookup to verify the exact reviewed transaction");
    }
    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      pollAttempts = attempt + 1;
      if (input.expectedTransaction) {
        const transaction = await this.transactions.transactionByHash!(input.before.chainId, input.txHash);
        if (!transaction) {
          if (attempt + 1 < maxPollAttempts) await this.delay(pollIntervalMs);
          continue;
        }
        const transactionMismatches = walletTransactionMismatches(input.expectedTransaction, transaction, input.txHash);
        if (transactionMismatches.length) {
          return {
            status: "balance_mismatch", success: false, txHash: input.txHash, pollAttempts,
            before: input.before, mismatches: transactionMismatches
          };
        }
      }
      const value = await this.transactions.transactionReceipt(input.before.chainId, input.txHash);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const candidate = value as Record<string, unknown>;
        const includedBlock = parseBlockNumber(candidate.blockNumber);
        if (includedBlock !== undefined) {
          try {
            const finalizedBlock = await this.transactions.latestFinalizedBlockNumber(input.before.chainId);
            if (includedBlock <= finalizedBlock) {
              receipt = candidate;
              break;
            }
            finalityUnavailable = `Receipt block ${includedBlock} is not finalized yet (latest finalized block ${finalizedBlock})`;
          } catch (error) {
            finalityUnavailable = `Could not verify BSC finality: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          finalityUnavailable = "Receipt block number is invalid; finality cannot be verified";
        }
      }
      if (attempt + 1 < maxPollAttempts) await this.delay(pollIntervalMs);
    }
    if (!receipt) return {
      status: "pending", success: false, txHash: input.txHash, pollAttempts, before: input.before,
      mismatches: [finalityUnavailable ?? (input.expectedTransaction ? "Transaction details or receipt are not available yet" : "Transaction receipt is not available yet")]
    };
    const receiptHash = typeof receipt.transactionHash === "string" ? receipt.transactionHash : undefined;
    const sender = typeof receipt.from === "string" ? receipt.from : undefined;
    const rawStatus = typeof receipt.status === "string" ? receipt.status.toLowerCase() : undefined;
    const blockNumber = typeof receipt.blockNumber === "string" ? receipt.blockNumber : undefined;
    const safeReceipt = { ...(blockNumber ? { blockNumber } : {}), ...(rawStatus ? { status: rawStatus } : {}), ...(sender ? { from: sender } : {}), ...(receiptHash ? { transactionHash: receiptHash } : {}) };
    const commonMismatches = [
      ...(receiptHash?.toLowerCase() !== input.txHash.toLowerCase() ? ["Receipt transaction hash does not match the requested transaction"] : []),
      ...(sender?.toLowerCase() !== input.before.walletAddress.toLowerCase() ? ["Receipt sender does not match the reviewed wallet"] : []),
      ...(!blockNumber ? ["Receipt does not contain a confirmed block number"] : [])
    ];
    if (rawStatus === "0x0" || rawStatus === "0x00") return {
      status: "reverted", success: false, txHash: input.txHash, pollAttempts, receipt: safeReceipt, before: input.before,
      mismatches: [...commonMismatches, "Transaction receipt reports a reverted transaction"]
    };
    if (rawStatus !== "0x1" && rawStatus !== "0x01") return {
      status: "balance_mismatch", success: false, txHash: input.txHash, pollAttempts, receipt: safeReceipt, before: input.before,
      mismatches: [...commonMismatches, "Receipt status is missing or not a recognized successful EVM status"]
    };
    const [inputAfter, outputAfter] = await Promise.all([
      this.transactions.erc20Balance(input.before.chainId, input.before.inputToken.contractAddress, input.before.walletAddress),
      this.transactions.erc20Balance(input.before.chainId, input.before.outputToken.contractAddress, input.before.walletAddress)
    ]);
    const beforeInput = BigInt(input.before.inputBalance);
    const beforeOutput = BigInt(input.before.outputBalance);
    const inputSpent = beforeInput - inputAfter;
    const outputReceived = outputAfter - beforeOutput;
    const mismatches = [
      ...commonMismatches,
      ...(inputSpent < 0n ? ["Input-token balance increased; expected a purchase spend"] : []),
      ...(inputSpent !== BigInt(input.expectedInputSpent) ? [`Input-token spend ${inputSpent} does not equal expected ${input.expectedInputSpent} base units`] : []),
      ...(outputReceived < BigInt(input.minimumOutputReceived) ? [`Output-token receipt ${outputReceived} is below reviewed minimum ${input.minimumOutputReceived} base units`] : [])
    ];
    return {
      status: mismatches.length ? "balance_mismatch" : "confirmed",
      success: mismatches.length === 0,
      txHash: input.txHash,
      pollAttempts,
      receipt: safeReceipt,
      before: input.before,
      after: { inputBalance: inputAfter.toString(), outputBalance: outputAfter.toString(), readAt: Date.now() },
      changes: {
        inputSpent: inputSpent.toString(), outputReceived: outputReceived.toString(),
        inputSpentDisplay: formatTokenAmount(inputSpent < 0n ? "0" : inputSpent.toString(), input.before.inputToken.decimals),
        outputReceivedDisplay: formatTokenAmount(outputReceived < 0n ? "0" : outputReceived.toString(), input.before.outputToken.decimals)
      },
      mismatches
    };
  }
}
