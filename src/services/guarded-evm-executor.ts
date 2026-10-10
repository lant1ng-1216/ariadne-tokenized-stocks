import type { ActionPlan, UnsignedAction } from "../domain/types.js";
import { assertExecutable, attachSimulation, confirmPlan } from "../domain/action-plan.js";
import { assertAllowanceCoversPlan } from "../domain/balance-safety.js";
import { assessSignedTransactionFee, requireReviewedGasBudget } from "../domain/gas-safety.js";
import { assertSignedTransactionMatchesPlan } from "../domain/signed-transaction.js";
import { assertSdkPreparedPlan } from "../domain/prepared-plan-provenance.js";
import { PlanRegistry } from "../mcp/plan-registry.js";
import type { TransactionService } from "./transaction.js";
import { SettlementReconciler, type BalanceSnapshot, type SettlementResult } from "./settlement-reconciler.js";
import { bindSettlementTransactionHash } from "./settlement-hash-binding.js";
import { parseTokenAmount } from "../domain/amount.js";
import { authorizeEip1193Wallet, buildWalletSubmissionRequest, type Eip1193Provider, type ExpectedWalletTransaction } from "./eip1193-wallet.js";

type GuardedTransactionService = Pick<
  TransactionService,
  "simulateEvm" | "nativeBalance" | "erc20Balance" | "erc20Allowance" | "broadcastSigned"
> & Partial<Pick<TransactionService, "transactionReceipt" | "transactionByHash" | "latestFinalizedBlockNumber">>;

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

/**
 * Ariadne-guarded execution flow for a single standard EVM action.
 * Signing stays with the developer's external wallet; this class validates the
 * returned transaction, reviewed fee cap and allowance before broadcast.
 */
export class GuardedEvmExecutionService {
  private readonly plans = new PlanRegistry();
  private readonly settlement?: SettlementReconciler;
  private readonly settlementRecords = new Map<string, { before: BalanceSnapshot; txHash?: string; expectedTransaction?: ExpectedWalletTransaction }>();

  constructor(private readonly transactions: GuardedTransactionService) {
    if (typeof transactions.transactionReceipt === "function" && typeof transactions.latestFinalizedBlockNumber === "function") {
      this.settlement = new SettlementReconciler(transactions as GuardedTransactionService & Pick<TransactionService, "transactionReceipt" | "latestFinalizedBlockNumber">);
    }
  }

  /** Register the unchanged, safety-checked plan returned by SDK preparation. */
  registerPrepared(plan: ActionPlan): void {
    assertSdkPreparedPlan(plan);
    this.requireEvmAction(plan);
    requireReviewedGasBudget(plan);
    this.plans.registerPrepared(plan);
  }

  /** Simulate the registered unsigned action without signing or broadcasting. */
  async simulate(plan: ActionPlan): Promise<ActionPlan> {
    const trusted = this.plans.requireExact(plan, "awaiting_confirmation");
    const { tx } = this.requireEvmAction(trusted);
    const simulation = await this.transactions.simulateEvm(trusted.intent.toAsset.chainId, tx);
    const updated = attachSimulation(trusted, simulation);
    if (updated.status === "simulated" || updated.status === "wallet_review") {
      this.plans.advance(trusted, "awaiting_confirmation", updated, updated.status);
    }
    return updated;
  }

  /** Confirm the exact simulated plan; signing remains a separate external action. */
  confirm(plan: ActionPlan): ActionPlan {
    const stage = plan.status === "wallet_review" ? "wallet_review" : "simulated";
    const trusted = this.plans.requireExact(plan, stage);
    const confirmed = confirmPlan(trusted);
    this.plans.advance(trusted, stage, confirmed, "confirmed");
    return confirmed;
  }

  /**
   * Validate the externally signed transaction and latest balances, reserve a
   * one-time broadcast attempt, then send through the supplied transaction service.
   */
  async broadcastSigned(plan: ActionPlan, signedTransaction: string): Promise<unknown> {
    const trusted = this.plans.requireExact(plan, "confirmed");
    assertExecutable(trusted);
    await assertSignedTransactionMatchesPlan(trusted, signedTransaction, trusted.intent.walletAddress);
    assessSignedTransactionFee(trusted, signedTransaction);
    const currentAllowance = await this.transactions.erc20Allowance(
      trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender
    );
    assertAllowanceCoversPlan(trusted, currentAllowance);
    let before: BalanceSnapshot | undefined;
    if (trusted.verifiedTokens && trusted.minimumOutput) {
      if (!this.settlement) throw new Error("Settlement reconciliation is unavailable on this transaction transport");
      before = await this.settlement.captureBefore({
        chainId: trusted.intent.toAsset.chainId,
        walletAddress: trusted.intent.walletAddress,
        inputToken: trusted.verifiedTokens.input,
        outputToken: trusted.verifiedTokens.output
      });
    }
    const reserved = this.plans.reserveBroadcast(plan);
    if (before) this.settlementRecords.set(reserved.planId, { before });
    const result = await this.transactions.broadcastSigned(
      reserved.intent.toAsset.chainId,
      signedTransaction,
      reserved.intent.walletAddress
    );
    const txHash = extractTransactionHash(result);
    if (before) this.settlementRecords.set(reserved.planId, { before, ...(txHash ? { txHash } : {}) });
    return result;
  }

  /**
   * Hand a confirmed plan to a user-controlled EIP-1193 wallet. The wallet
   * prompts, signs and broadcasts; Ariadne validates the active account/chain,
   * captures balances first, binds the returned hash, and never sees a key.
   */
  async sendWithWalletProvider(plan: ActionPlan, provider: Eip1193Provider): Promise<{ txHash: string; status: "awaiting_reconciliation"; walletBroadcast: true }> {
    const trusted = this.plans.requireExact(plan, "confirmed");
    assertExecutable(trusted);
    if (!this.settlement || typeof this.transactions.transactionByHash !== "function" || !trusted.verifiedTokens || !trusted.minimumOutput) {
      throw new Error("A wallet handoff requires verified token identities and an available settlement reconciler");
    }
    const { request, expected } = buildWalletSubmissionRequest(trusted);
    await authorizeEip1193Wallet(provider, trusted);
    const currentAllowance = await this.transactions.erc20Allowance(
      trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender
    );
    assertAllowanceCoversPlan(trusted, currentAllowance);
    const before = await this.settlement.captureBefore({
      chainId: trusted.intent.toAsset.chainId,
      walletAddress: trusted.intent.walletAddress,
      inputToken: trusted.verifiedTokens.input,
      outputToken: trusted.verifiedTokens.output
    });
    const reserved = this.plans.reserveBroadcast(plan);
    this.settlementRecords.set(reserved.planId, { before, expectedTransaction: expected });
    // Reservation happens before invoking the wallet. If the provider times
    // out after the user approves, this plan is consumed; inspect the wallet
    // or chain and never blindly submit it again.
    const returnedHash = await provider.request({ method: "eth_sendTransaction", params: [request] });
    if (typeof returnedHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(returnedHash)) {
      throw new Error("Wallet did not return a valid transaction hash; the plan remains single-attempt and must be checked before any retry");
    }
    const record = this.settlementRecords.get(reserved.planId)!;
    record.txHash = returnedHash;
    return { txHash: returnedHash, status: "awaiting_reconciliation", walletBroadcast: true };
  }

  /** Poll the broadcast receipt and reconcile exact pre/post wallet token balances. */
  async reconcileBroadcast(input: { planId: string; txHash?: string; maxPollAttempts?: number; pollIntervalMs?: number }): Promise<SettlementResult> {
    if (!this.settlement) throw new Error("Settlement reconciliation is unavailable on this transaction transport");
    const plan = this.plans.requireBroadcasted(input.planId);
    const record = this.settlementRecords.get(input.planId);
    if (!record) throw new Error("No verified pre-broadcast balance snapshot is available for this plan");
    const txHash = bindSettlementTransactionHash(record, input.txHash);
    if (!plan.verifiedTokens || !plan.minimumOutput) throw new Error("The confirmed plan lacks verified token precision or a reviewed minimum output");
    return this.settlement.reconcile({
      txHash,
      before: record.before,
      expectedInputSpent: parseTokenAmount(plan.intent.amount, plan.intent.amountDecimals).toString(),
      minimumOutputReceived: plan.minimumOutput,
      ...(record.expectedTransaction ? { expectedTransaction: record.expectedTransaction } : {}),
      maxPollAttempts: input.maxPollAttempts,
      pollIntervalMs: input.pollIntervalMs
    });
  }

  private requireEvmAction(plan: ActionPlan): { action: UnsignedAction; tx: { from: string; to: string; value: string; data?: string } } {
    if (!plan.authorizationCheck?.required) throw new Error("Guarded EVM execution requires a quote-declared, verified ERC-20 spender");
    if (plan.unsignedActions?.length !== 1) throw new Error("Guarded EVM execution requires exactly one planned action");
    const action = plan.unsignedActions[0] as UnsignedAction;
    const tx = (action.payload as { tx?: { from?: unknown; to?: unknown; value?: unknown; data?: unknown } })?.tx;
    if (plan.intent.toAsset.chainId !== "56" || action.kind !== "evm_transaction" || action.chainId !== plan.intent.toAsset.chainId || action.quoteId !== plan.quoteId ||
      !tx || typeof tx.from !== "string" || typeof tx.to !== "string" || typeof tx.value !== "string" ||
      !addressPattern.test(tx.from) || tx.from.toLowerCase() !== plan.intent.walletAddress.toLowerCase() || !addressPattern.test(tx.to) ||
      !/^(?:0x[0-9a-fA-F]+|\d+)$/.test(tx.value) ||
      (tx.data !== undefined && (typeof tx.data !== "string" || !/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.data)))) {
      throw new Error("Plan does not contain a valid, quote-bound EVM transaction");
    }
    return { action, tx: tx as { from: string; to: string; value: string; data?: string } };
  }
}

function extractTransactionHash(value: unknown): string | undefined {
  const queue: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  const seen = new Set<object>();
  while (queue.length) {
    const current = queue.shift()!;
    if (!current.value || typeof current.value !== "object" || Array.isArray(current.value) || current.depth > 3 || seen.has(current.value)) continue;
    seen.add(current.value);
    const record = current.value as Record<string, unknown>;
    for (const key of ["txHash", "transactionHash", "hash"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && /^0x[0-9a-fA-F]{64}$/.test(candidate)) return candidate;
    }
    for (const nested of Object.values(record)) queue.push({ value: nested, depth: current.depth + 1 });
  }
  return undefined;
}
