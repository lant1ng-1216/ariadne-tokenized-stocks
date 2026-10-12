import type { ActionPlan } from "../domain/types.js";
import { PlanRegistry, type PlanRecord, type PlanStage } from "../mcp/plan-registry.js";
import { RemoteStateStore } from "./state-store.js";

/** Applies the existing PlanRegistry safety contract to owner-scoped, versioned DB records. */
export class DurablePlanRegistry {
  constructor(private readonly store: RemoteStateStore, private readonly ownerId: string) {
    if (!ownerId.trim()) throw new Error("An authenticated owner is required for durable plans");
  }

  async registerPrepared(plan: ActionPlan): Promise<void> {
    const local = new PlanRegistry();
    local.registerPrepared(plan);
    const record = local.exportPersistedRecord(plan.planId)!;
    await this.store.create({ kind: "plan", id: plan.planId, ownerId: this.ownerId, state: record.stage, payload: record, expiresAt: new Date(plan.expiresAt!) });
  }

  private async loaded(planId: string, includeExpired = false) {
    const saved = await this.store.read<PlanRecord>("plan", planId, this.ownerId, { includeExpired });
    if (!saved) throw new Error("Plan is unknown, expired or belongs to another user; prepare a new plan");
    const local = new PlanRegistry();
    local.restorePersistedRecord(planId, saved.payload);
    return { saved, local };
  }

  async requireExact(submitted: ActionPlan, stage: PlanStage): Promise<ActionPlan> {
    const { local } = await this.loaded(submitted.planId);
    return local.requireExact(submitted, stage);
  }

  async requireById(planId: string, stage: PlanStage): Promise<ActionPlan> {
    const { local } = await this.loaded(planId);
    return local.requireById(planId, stage);
  }

  async readStoredPlan(planId: string): Promise<ActionPlan | undefined> {
    const saved = await this.store.read<PlanRecord>("plan", planId, this.ownerId, { includeExpired: true });
    if (!saved) return undefined;
    const local = new PlanRegistry();
    local.restorePersistedRecord(planId, saved.payload);
    return local.readStoredPlan(planId);
  }

  async advance(submitted: ActionPlan, from: PlanStage, next: ActionPlan, to: PlanStage): Promise<void> {
    const { saved, local } = await this.loaded(submitted.planId);
    local.advance(submitted, from, next, to);
    const record = local.exportPersistedRecord(submitted.planId)!;
    const updated = await this.store.transition({ kind: "plan", id: submitted.planId, ownerId: this.ownerId, version: saved.version, from: saved.state, to: record.stage, payload: record });
    if (!updated) throw new Error("Plan was updated concurrently or expired; prepare a fresh review");
  }

  async reserveBroadcast(submitted: ActionPlan): Promise<ActionPlan> {
    const { saved, local } = await this.loaded(submitted.planId);
    const trusted = local.reserveBroadcast(submitted);
    const record = local.exportPersistedRecord(submitted.planId)!;
    const updated = await this.store.transition({ kind: "plan", id: submitted.planId, ownerId: this.ownerId, version: saved.version, from: saved.state, to: record.stage, payload: record });
    if (!updated) throw new Error("A wallet attempt may already be reserved; inspect its status before retrying");
    return trusted;
  }

  async reserveBroadcastById(planId: string): Promise<ActionPlan> {
    const trusted = await this.requireById(planId, "confirmed");
    return this.reserveBroadcast(trusted);
  }

  async requireBroadcasted(planId: string): Promise<ActionPlan> {
    const { local } = await this.loaded(planId, true);
    return local.requireBroadcasted(planId);
  }

  async captureConfirmedContinuation(planId: string): Promise<ActionPlan> {
    const { local } = await this.loaded(planId);
    const captured = local.captureConfirmedContinuation(planId);
    await this.store.create({ kind: "continuation", id: planId, ownerId: this.ownerId, state: "active", payload: captured, expiresAt: new Date(captured.expiresAt!) });
    return captured;
  }

  async registerConfirmedContinuation(parentPlanId: string, submitted: ActionPlan): Promise<ActionPlan> {
    const [parent, child] = await Promise.all([
      this.store.read<ActionPlan>("continuation", parentPlanId, this.ownerId),
      this.loaded(submitted.planId)
    ]);
    if (!parent || parent.state !== "active") throw new Error("The confirmed purchase continuation is unavailable or already consumed");
    child.local.restorePersistedContinuation(parentPlanId, parent.payload);
    const result = child.local.registerConfirmedContinuation(parentPlanId, submitted);
    const consumed = await this.store.transition({ kind: "continuation", id: parentPlanId, ownerId: this.ownerId, version: parent.version, from: "active", to: "consumed", payload: parent.payload });
    if (!consumed) throw new Error("The purchase continuation was already consumed by another request");
    return result;
  }
}
