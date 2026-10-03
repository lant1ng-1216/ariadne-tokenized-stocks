import type { ActionPlan, UnsignedAction } from "../domain/types.js";
import { assertExecutable, attachSimulation, confirmPlan } from "../domain/action-plan.js";
import { assertAllowanceCoversPlan, assertInputBalanceCoversPlan } from "../domain/balance-safety.js";
import { assessSignedTransactionFee, assertNativeBalanceCoversFee, requireReviewedGasBudget } from "../domain/gas-safety.js";
import { assertSignedTransactionMatchesPlan } from "../domain/signed-transaction.js";
import { assertSdkPreparedPlan } from "../domain/prepared-plan-provenance.js";
import { PlanRegistry } from "../mcp/plan-registry.js";
import type { TransactionService } from "./transaction.js";

type GuardedTransactionService = Pick<
  TransactionService,
  "simulateEvm" | "nativeBalance" | "erc20Balance" | "erc20Allowance" | "broadcastSigned"
>;

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

/**
 * Ariadne-guarded execution flow for a single standard EVM action.
 * Signing stays with the developer's external wallet; this class validates the
 * returned raw transaction and current balances before calling the transport.
 */
export class GuardedEvmExecutionService {
  private readonly plans = new PlanRegistry();

  constructor(private readonly transactions: GuardedTransactionService) {}

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
    if (updated.status === "simulated") this.plans.advance(trusted, "awaiting_confirmation", updated, "simulated");
    return updated;
  }

  /** Confirm the exact simulated plan; signing remains a separate external action. */
  confirm(plan: ActionPlan): ActionPlan {
    const trusted = this.plans.requireExact(plan, "simulated");
    const confirmed = confirmPlan(trusted);
    this.plans.advance(trusted, "simulated", confirmed, "confirmed");
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
    const fee = assessSignedTransactionFee(trusted, signedTransaction);
    const [nativeBalance, inputBalance, currentAllowance] = await Promise.all([
      this.transactions.nativeBalance(trusted.intent.toAsset.chainId, trusted.intent.walletAddress),
      this.transactions.erc20Balance(trusted.intent.toAsset.chainId, trusted.intent.fromTokenAddress, trusted.intent.walletAddress),
      this.transactions.erc20Allowance(trusted.intent.toAsset.chainId, trusted.authorizationCheck!.tokenAddress, trusted.intent.walletAddress, trusted.authorizationCheck!.spender)
    ]);
    assertNativeBalanceCoversFee(nativeBalance, fee);
    assertInputBalanceCoversPlan(trusted, inputBalance);
    assertAllowanceCoversPlan(trusted, currentAllowance);
    const reserved = this.plans.reserveBroadcast(plan);
    return this.transactions.broadcastSigned(
      reserved.intent.toAsset.chainId,
      signedTransaction,
      reserved.intent.walletAddress
    );
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
