import type { ConfirmationContinuationStore } from "../mcp/user-confirmation.js";
import { RemoteStateStore } from "./state-store.js";

/** Keeps host approval requestState one-time across separate serverless invocations. */
export class DurableConfirmationContinuationStore implements ConfirmationContinuationStore {
  constructor(private readonly state: RemoteStateStore, private readonly ownerId: string) {
    if (!ownerId.trim()) throw new Error("An authenticated owner is required for confirmation state");
  }

  async create(id: string, planId: string, expiresAt: number): Promise<void> {
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) throw new Error("Confirmation has already expired");
    await this.state.create({ kind: "continuation", id: `confirm:${id}`, ownerId: this.ownerId, state: "active", payload: { planId }, expiresAt: new Date(expiresAt) });
  }

  async consume(id: string, planId: string): Promise<boolean> {
    const key = `confirm:${id}`;
    const stored = await this.state.read<{ planId: string }>("continuation", key, this.ownerId);
    if (!stored || stored.state !== "active" || stored.payload.planId !== planId) return false;
    const updated = await this.state.transition({ kind: "continuation", id: key, ownerId: this.ownerId, version: stored.version, from: "active", to: "consumed", payload: stored.payload });
    return Boolean(updated);
  }
}
