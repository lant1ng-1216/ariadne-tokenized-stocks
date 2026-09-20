import { assertExecutable } from "../domain/action-plan.js";
import type { ActionPlan } from "../domain/types.js";

export type SignedAction = { action: unknown; signature: string };
export type ActionSigner = (action: unknown, plan: ActionPlan) => Promise<SignedAction>;
export type ActionBroadcaster = (signed: SignedAction, plan: ActionPlan) => Promise<{ txHash: string }>;

/**
 * Execution is deliberately dependency-injected. Ariadne never owns a private key;
 * callers must provide a signer and an explicit broadcaster, and the plan must be confirmed.
 */
export class ExecutionService {
  constructor(private readonly signer: ActionSigner, private readonly broadcaster?: ActionBroadcaster) {}

  async signConfirmed(plan: ActionPlan): Promise<SignedAction[]> {
    assertExecutable(plan);
    const actions = plan.unsignedActions ?? [];
    if (actions.length === 0) throw new Error("Confirmed plan has no unsigned actions");
    return Promise.all(actions.map((action) => this.signer(action, plan)));
  }

  async broadcastConfirmed(plan: ActionPlan): Promise<{ txHash: string }[]> {
    // Never retry a broadcast automatically: a timeout can occur after the chain accepts it.
    // Callers must query post-transaction status before deciding whether to retry manually.
    if (!this.broadcaster) throw new Error("Broadcasting is disabled: no broadcaster was configured");
    const signed = await this.signConfirmed(plan);
    return this.broadcastSignedActions(signed, plan);
  }

  /**
   * Broadcast previously signed actions exactly once per invocation.
   * If a request times out, callers must query chain/order state before deciding
   * whether to invoke this method again with the same signed payload.
   */
  async broadcastSignedActions(signed: SignedAction[], plan: ActionPlan): Promise<{ txHash: string }[]> {
    assertExecutable(plan);
    if (!this.broadcaster) throw new Error("Broadcasting is disabled: no broadcaster was configured");
    if (signed.length === 0) throw new Error("No signed actions supplied");
    return Promise.all(signed.map((item) => this.broadcaster!(item, plan)));
  }
}
